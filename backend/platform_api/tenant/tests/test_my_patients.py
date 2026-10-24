from clinical.models import Patient
from django.db import connection
from django.test import override_settings
from django_tenants.utils import tenant_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from users.auth.tests.common import TenantTestCase, create_user
from users.models import InstitutionMembership

from tenant.models import Institution


@override_settings(ALLOWED_HOSTS=["testserver"])
class MyPatientsTests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.user, _ = create_user(
            username="crossworkspace",
            email="crossworkspace@example.com",
            is_otp_verified=True,
        )
        self.first_workspace = self.create_workspace("North Clinic", "north_clinic")
        self.second_workspace = self.create_workspace("South Research", "south_research")
        self.hidden_workspace = self.create_workspace("Hidden Clinic", "hidden_clinic")
        InstitutionMembership.objects.create(
            user=self.user,
            institution=self.first_workspace,
            is_active=True,
        )
        InstitutionMembership.objects.create(
            user=self.user,
            institution=self.second_workspace,
            is_active=True,
        )
        self.first_patient = self.create_patient(
            self.first_workspace, "NORTH-001", "Aarav North"
        )
        self.second_patient = self.create_patient(
            self.second_workspace, "SOUTH-002", "Meera South"
        )
        self.create_patient(self.hidden_workspace, "HIDDEN-003", "Hidden Patient")
        self.authenticate()

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    @staticmethod
    def create_workspace(name, schema_name):
        return Institution.objects.create(
            name=name,
            slug=schema_name.replace("_", "-"),
            schema_name=schema_name,
        )

    @staticmethod
    def create_patient(workspace, patient_code, display_name):
        with tenant_context(workspace):
            return Patient.objects.create(
                patient_code=patient_code,
                display_name=display_name,
            )

    def authenticate(self):
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(self.user).access_token
        )

    def test_lists_patients_from_all_active_member_workspaces_only(self):
        response = self.client.get("/api/v1/my-patients/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        returned_codes = {row["patient_code"] for row in response.data["results"]}
        self.assertEqual(returned_codes, {"NORTH-001", "SOUTH-002"})
        returned_workspaces = {
            row["workspace"]["name"] for row in response.data["results"]
        }
        self.assertEqual(returned_workspaces, {"North Clinic", "South Research"})

    def test_filters_by_authorized_workspace(self):
        response = self.client.get(
            "/api/v1/my-patients/",
            {"workspace_id": str(self.second_workspace.id)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["patient_code"], "SOUTH-002")

    def test_rejects_workspace_filter_without_membership(self):
        response = self.client.get(
            "/api/v1/my-patients/",
            {"workspace_id": str(self.hidden_workspace.id)},
        )

        self.assertEqual(response.status_code, 404)

    def test_searches_across_patient_code_and_display_name(self):
        by_code = self.client.get("/api/v1/my-patients/", {"search": "south-002"})
        by_name = self.client.get("/api/v1/my-patients/", {"search": "aarav"})

        self.assertEqual(by_code.data["count"], 1)
        self.assertEqual(by_code.data["results"][0]["display_name"], "Meera South")
        self.assertEqual(by_name.data["count"], 1)
        self.assertEqual(by_name.data["results"][0]["patient_code"], "NORTH-001")

    def test_requires_authentication(self):
        self.client.cookies.clear()

        response = self.client.get("/api/v1/my-patients/")

        self.assertEqual(response.status_code, 401)

    def test_paginates_without_returning_every_patient(self):
        for index in range(30):
            self.create_patient(
                self.first_workspace,
                f"NORTH-{index + 10:03d}",
                f"North Patient {index + 10}",
            )

        first_page = self.client.get("/api/v1/my-patients/", {"page_size": 10})
        second_page = self.client.get(
            "/api/v1/my-patients/",
            {"page": 2, "page_size": 10},
        )

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(first_page.data["count"], 32)
        self.assertEqual(len(first_page.data["results"]), 10)
        self.assertEqual(len(second_page.data["results"]), 10)
        self.assertTrue(
            {row["id"] for row in first_page.data["results"]}.isdisjoint(
                row["id"] for row in second_page.data["results"]
            )
        )
