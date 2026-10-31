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
            owner=self.user,
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

    def test_tenant_context_returns_verified_schema_without_roles(self):
        self.authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["schema_name"], self.institution.schema_name)
        self.assertEqual(response.data["id"], str(self.institution.id))
        self.assertNotIn("role", response.data)

    def test_membership_model_no_longer_has_admin_member_role(self):
        from django.core.exceptions import FieldDoesNotExist

        with self.assertRaises(FieldDoesNotExist):
            InstitutionMembership._meta.get_field("role")

    def test_nonmember_cannot_read_tenant_context(self):
        self.authenticate(self.other_user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 404)

    def test_active_nonowner_membership_is_denied(self):
        InstitutionMembership.objects.create(
            user=self.other_user, institution=self.institution, is_active=True,
        )
        self.authenticate(self.other_user)
        denied = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(denied.status_code, 404)
        self.assertEqual(self.client.get("/api/v1/workspaces/").data, [])

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

    def test_inactive_member_cannot_read_tenant_context(self):
        InstitutionMembership.objects.filter(
            user=self.user, institution=self.institution
        ).update(is_active=False)
        self.authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_tenant_context_returns_401(self):
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 401)

    def test_untrusted_workspace_header_cannot_change_public_list_scope(self):
        self.authenticate(self.other_user)
        response = self.client.get(
            "/api/v1/workspaces/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_switching_between_two_authorized_tenants_uses_correct_schema(self):
        second = Institution.objects.create(
            name="Second Hospital",
            slug="second-hospital",
            schema_name="second_hospital",
            owner=self.user,
        )
        InstitutionMembership.objects.create(
            user=self.user, institution=second, is_active=True,
        )
        self.authenticate(self.user)
        for institution in (self.institution, second, self.institution):
            response = self.client.get(
                "/api/v1/tenant/context/",
                HTTP_X_WORKSPACE_ID=str(institution.id),
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["id"], str(institution.id))
            self.assertEqual(response.data["schema_name"], institution.schema_name)

    def test_member_of_first_tenant_cannot_switch_to_second_without_membership(self):
        second = Institution.objects.create(
            name="Second Hospital",
            slug="second-hospital",
            schema_name="second_hospital",
        )
        self.authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(second.id),
        )
        self.assertEqual(response.status_code, 404)
        authorized = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(authorized.status_code, 200)
        self.assertEqual(authorized.data["schema_name"], self.institution.schema_name)

    def test_unauthorized_tenant_request_does_not_change_subsequent_public_api(self):
        self.authenticate(self.other_user)
        response = self.client.get(
            "/api/v1/tenant/context/",
            HTTP_X_WORKSPACE_ID=str(self.institution.id),
        )
        self.assertEqual(response.status_code, 404)
        listing = self.client.get("/api/v1/workspaces/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.data), 0)
