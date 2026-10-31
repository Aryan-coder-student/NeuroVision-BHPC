"""Actual API + PostgreSQL-schema isolation tests using the project tenant middleware."""
from uuid import uuid4

from django.db import connection
from django.test import override_settings
from django.core import mail
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import Patient
from tenant.models import Institution
from users.models import InstitutionMembership
from users.auth.tests.common import TenantTestCase, create_user
from users.auth.tests.common import TEST_FERNET_KEY
from patient_identity.models import PatientAccessGrant, PatientIdentity


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    ENCRYPTION_KEY=TEST_FERNET_KEY,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class PatientTenantIsolationTests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.admin, _ = create_user(
            username="patient_admin", email="patientadmin@example.com",
            is_otp_verified=True,
        )
        self.member, _ = create_user(
            username="patient_member", email="patientmember@example.com",
            is_otp_verified=True,
        )
        self.outsider, _ = create_user(
            username="patient_outsider", email="patientoutsider@example.com",
            is_otp_verified=True,
        )
        self.apollo = Institution.objects.create(
            name="Apollo Test", slug="apollo-test", schema_name="apollo_test", owner=self.admin
        )
        self.aiims = Institution.objects.create(
            name="AIIMS Test", slug="aiims-test", schema_name="aiims_test", owner=self.admin
        )
        for institution in (self.apollo, self.aiims):
            InstitutionMembership.objects.create(
                user=self.admin, institution=institution,
                is_active=True,
            )
        InstitutionMembership.objects.create(
            user=self.member, institution=self.apollo,
            is_active=True,
        )
        self.url = "/api/v1/tenant/patients/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def authenticate(self, user):
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(user).access_token
        )

    def request(self, method, institution, path=None, data=None):
        if method == "post" and (path is None or path == self.url):
            data = dict(data or {})
            data.pop("patient_code", None)
            data.setdefault("date_of_birth", "1995-07-12")
            data.setdefault("email", f"test-{uuid4().hex}@example.com")
        return getattr(self.client, method)(
            path or self.url,
            data=data,
            format="json",
            HTTP_X_WORKSPACE_ID=str(institution.id),
        )

    def test_generated_codes_and_records_isolated_between_schemas(self):
        self.authenticate(self.admin)
        left = self.request("post", self.apollo, data={
            "patient_code": "P-001", "display_name": "Apollo Patient",
        })
        right = self.request("post", self.aiims, data={
            "patient_code": "P-001", "display_name": "AIIMS Patient",
        })
        self.assertEqual(left.status_code, 201, left.data)
        self.assertEqual(right.status_code, 201, right.data)
        self.assertNotEqual(left.data["patient_code"], right.data["patient_code"])
        self.assertTrue(left.data["patient_code"].startswith("NV-"))

        apollo = self.request("get", self.apollo)
        aiims = self.request("get", self.aiims)
        self.assertEqual([p["display_name"] for p in apollo.data["results"]], ["Apollo Patient"])
        self.assertEqual([p["display_name"] for p in aiims.data["results"]], ["AIIMS Patient"])

        self.assertEqual(
            self.request("get", self.aiims, path=f"{self.url}{left.data['id']}/").status_code,
            404,
        )
        with schema_context(self.apollo.schema_name):
            self.assertEqual(Patient.objects.count(), 1)
        with schema_context(self.aiims.schema_name):
            self.assertEqual(Patient.objects.count(), 1)

    def test_workspace_owner_can_create_edit_and_delete(self):
        self.authenticate(self.admin)
        created = self.request("post", self.apollo, data={
            "display_name": "Editable Patient",
        })
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(self.request("get", self.apollo).status_code, 200)

        updated = self.request(
            "patch", self.apollo,
            path=f"{self.url}{created.data['id']}/",
            data={"display_name": "Updated Patient", "version": created.data["version"]},
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["display_name"], "Updated Patient")
        self.assertEqual(
            self.request("delete", self.apollo, path=f"{self.url}{created.data['id']}/").status_code,
            204,
        )
        self.assertEqual(self.request("get", self.apollo).data["results"], [])

    def test_active_nonowner_member_cannot_access_patient_records(self):
        self.authenticate(self.member)
        self.assertEqual(self.request("get", self.apollo).status_code, 404)
        self.assertEqual(self.request("post", self.apollo, data={
            "display_name": "Denied",
        }).status_code, 404)

    def test_nonmember_cannot_read_or_create(self):
        self.authenticate(self.outsider)
        self.assertEqual(self.request("get", self.apollo).status_code, 404)
        self.assertEqual(self.request("post", self.apollo, data={
            "patient_code": "P-004", "display_name": "Denied",
        }).status_code, 404)

    def test_missing_workspace_header_rejected(self):
        self.authenticate(self.admin)
        self.assertEqual(self.client.get(self.url).status_code, 400)

    def test_public_schema_has_no_patient_table(self):
        from django.db import connection as db
        db.set_schema_to_public()
        self.assertNotIn("clinical_patient", db.introspection.table_names())

    def test_email_grant_verifies_global_identity_without_sharing_patient_records(self):
        self.authenticate(self.admin)
        email = "patient.person@example.com"
        apollo_patient = self.request("post", self.apollo, data={
            "display_name": "Apollo Record", "email": email,
        }).data
        first_code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        aiims_patient = self.request("post", self.aiims, data={
            "display_name": "AIIMS Record", "email": email,
        }).data
        second_code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]

        first = apollo_patient["identity_verification"]
        wrong = self.request(
            "post", self.apollo,
            path=f"{self.url}{apollo_patient['id']}/identity-grant/verify/",
            data={"challenge_id": first["challenge_id"], "otp": "000000" if first_code != "000000" else "999999"},
        )
        self.assertEqual(wrong.status_code, 400)
        verified = self.request(
            "post", self.apollo,
            path=f"{self.url}{apollo_patient['id']}/identity-grant/verify/",
            data={"challenge_id": first["challenge_id"], "otp": first_code},
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["status"], PatientAccessGrant.Status.ACTIVE)

        second = aiims_patient["identity_verification"]
        verified_second = self.request(
            "post", self.aiims,
            path=f"{self.url}{aiims_patient['id']}/identity-grant/verify/",
            data={"challenge_id": second["challenge_id"], "otp": second_code},
        )
        self.assertEqual(verified_second.status_code, 200, verified_second.data)
        self.assertEqual(PatientIdentity.objects.count(), 1)
        self.assertEqual(PatientAccessGrant.objects.filter(status="ACTIVE").count(), 2)
        self.assertEqual(
            [p["display_name"] for p in self.request("get", self.apollo).data["results"]],
            ["Apollo Record"],
        )
        self.assertEqual(
            [p["display_name"] for p in self.request("get", self.aiims).data["results"]],
            ["AIIMS Record"],
        )

    def test_workspace_owner_can_verify_patient_email(self):
        self.authenticate(self.admin)
        patient = self.request("post", self.apollo, data={
            "display_name": "Status Patient",
        }).data
        code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        self.authenticate(self.admin)
        path = f"{self.url}{patient['id']}/identity-grant/"
        status_response = self.request("get", self.apollo, path=path)
        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data["status"], "PENDING")
        verified = self.request(
            "post", self.apollo, path=f"{path}verify/",
            data={"challenge_id": patient["identity_verification"]["challenge_id"], "otp": code},
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["status"], PatientAccessGrant.Status.ACTIVE)

    def test_active_identity_cannot_be_replaced_by_another_email(self):
        self.authenticate(self.admin)
        patient = self.request("post", self.apollo, data={
            "display_name": "Locked Patient", "email": "first@example.com",
        }).data
        verify_path = f"{self.url}{patient['id']}/identity-grant/verify/"
        code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        self.assertEqual(self.request("post", self.apollo, path=verify_path, data={
            "challenge_id": patient["identity_verification"]["challenge_id"],
            "otp": code,
        }).status_code, 200)
        replacement = self.request(
            "post", self.apollo,
            path=f"{self.url}{patient['id']}/identity-grant/request/",
            data={"email": "other@example.com"},
        )
        self.assertEqual(replacement.status_code, 409)
