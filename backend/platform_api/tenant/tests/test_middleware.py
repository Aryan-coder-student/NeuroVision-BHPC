"""Security regression tests for shared-host tenant selection."""
from unittest.mock import patch, MagicMock
from uuid import uuid4

from django.test import RequestFactory, SimpleTestCase
from rest_framework_simplejwt.exceptions import InvalidToken

from tenant.middleware import WorkspaceTenantMiddleware


class WorkspaceTenantMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = WorkspaceTenantMiddleware(lambda request: None)
        self.workspace_id = uuid4()

    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_unscoped_route_never_selects_tenant(self, parent):
        request = self.factory.get(
            "/api/v1/auth/profile/", HTTP_X_WORKSPACE_ID=str(self.workspace_id)
        )
        self.assertIsNone(self.middleware.process_request(request))
        parent.assert_called_once()

    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_invalid_workspace_id_returns_400(self, parent):
        request = self.factory.get(
            "/api/v1/workspaces/current/", HTTP_X_WORKSPACE_ID="not-a-uuid"
        )
        response = self.middleware.process_request(request)
        self.assertEqual(response.status_code, 400)

    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_missing_authentication_returns_401(self, parent):
        request = self.factory.get(
            "/api/v1/workspaces/current/", HTTP_X_WORKSPACE_ID=str(self.workspace_id)
        )
        response = self.middleware.process_request(request)
        self.assertEqual(response.status_code, 401)

    @patch("tenant.middleware.JWTAuthentication")
    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_expired_authentication_returns_401(self, parent, jwt_class):
        jwt_class.return_value.get_validated_token.side_effect = InvalidToken()
        request = self.factory.get(
            "/api/v1/workspaces/current/",
            HTTP_X_WORKSPACE_ID=str(self.workspace_id),
            HTTP_AUTHORIZATION="Bearer expired",
        )
        response = self.middleware.process_request(request)
        self.assertEqual(response.status_code, 401)

    @patch("tenant.middleware.InstitutionMembership.objects")
    @patch("tenant.middleware.JWTAuthentication")
    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_nonmember_cannot_select_tenant(self, parent, jwt_class, memberships):
        jwt_class.return_value.get_user.return_value = MagicMock()
        jwt_class.return_value.get_validated_token.return_value = "token"
        jwt_class.return_value.get_raw_token.return_value = "token"
        memberships.filter.return_value.select_related.return_value.first.return_value = None
        request = self.factory.get(
            "/api/v1/workspaces/current/",
            HTTP_X_WORKSPACE_ID=str(self.workspace_id),
            HTTP_AUTHORIZATION="Bearer token",
        )
        response = self.middleware.process_request(request)
        self.assertEqual(response.status_code, 404)
        memberships.filter.assert_called_once()

    @patch("tenant.middleware.connection")
    @patch("tenant.middleware.InstitutionMembership.objects")
    @patch("tenant.middleware.JWTAuthentication")
    @patch("tenant.middleware.TenantMainMiddleware.process_request")
    def test_active_member_switches_to_verified_schema(
        self, parent, jwt_class, memberships, connection
    ):
        user = MagicMock()
        tenant = MagicMock()
        jwt_class.return_value.get_user.return_value = user
        jwt_class.return_value.get_validated_token.return_value = "token"
        jwt_class.return_value.get_raw_token.return_value = "token"
        memberships.filter.return_value.select_related.return_value.first.return_value.institution = tenant
        request = self.factory.get(
            "/api/v1/workspaces/current/",
            HTTP_X_WORKSPACE_ID=str(self.workspace_id),
            HTTP_AUTHORIZATION="Bearer token",
        )
        request.tenant = MagicMock(schema_name="public")
        self.assertIsNone(self.middleware.process_request(request))
        memberships.filter.assert_called_once_with(
            user=user, institution_id=self.workspace_id, is_active=True
        )
        connection.set_tenant.assert_called_once_with(tenant)
        self.assertIs(request.tenant, tenant)
