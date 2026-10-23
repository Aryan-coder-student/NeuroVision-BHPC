"""Exercise the actual Django request path, not only a mocked middleware."""
from django.db import connection
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from tenant.models import Institution
from users.models import InstitutionMembership
from users.auth.tests.common import TenantTestCase, create_user


@override_settings(ALLOWED_HOSTS=["testserver"])
class SharedWorkspaceIntegrationTests(TenantTestCase):
    def setUp(self):
        # Django TestCase reuses the connection; undo prior test's schema switch.
        connection.set_schema_to_public()
        self.client = APIClient()
        self.user, _ = create_user(
            username="workspaceuser", email="workspaceuser@example.com",
            is_otp_verified=True,
        )
        self.other_user, _ = create_user(
            username="nonmember", email="nonmember@example.com",
            is_otp_verified=True,
        )
        self.institution = Institution.objects.create(
            name="Integration Hospital",
            slug="integration-hospital",
            schema_name="integration_hospital",
        )
        InstitutionMembership.objects.create(
            user=self.user, institution=self.institution, is_active=True,
        )
        self.url = "/api/v1/workspaces/current/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def authenticate(self, user):
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(user).access_token
        )

    def test_member_can_resolve_existing_tenant(self):
        self.authenticate(self.user)
        response = self.client.get(
            self.url, HTTP_X_WORKSPACE_ID=str(self.institution.id)
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(self.institution.id))
        self.assertEqual(response.data["schema_name"], "integration_hospital")

    def test_nonmember_cannot_resolve_tenant(self):
        self.authenticate(self.other_user)
        response = self.client.get(
            self.url, HTTP_X_WORKSPACE_ID=str(self.institution.id)
        )
        self.assertEqual(response.status_code, 404)

    def test_public_domain_requires_workspace_selection(self):
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 400)

    def test_tenant_context_returns_verified_schema_and_role(self):
        self.authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["schema_name"], self.institution.schema_name)
        self.assertEqual(response.data["id"], str(self.institution.id))
        self.assertEqual(response.data["role"], InstitutionMembership.Role.MEMBER)

    def test_nonmember_cannot_read_tenant_context(self):
        self.authenticate(self.other_user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 404)

    def test_tenant_context_needs_workspace_id(self):
        self.authenticate(self.user)
        response = self.client.get("/api/v1/tenant/context/")
        self.assertEqual(response.status_code, 400)

    def test_public_workspaces_listing_ignores_tenant_header(self):
        self.authenticate(self.user)
        response = self.client.get(
            "/api/v1/workspaces/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 200)
