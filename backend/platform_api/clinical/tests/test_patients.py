"""Actual API + PostgreSQL-schema isolation tests using the project tenant middleware."""
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
            name="Apollo Test", slug="apollo-test", schema_name="apollo_test"
        )
        self.aiims = Institution.objects.create(
            name="AIIMS Test", slug="aiims-test", schema_name="aiims_test"
        )
        for institution in (self.apollo, self.aiims):
            InstitutionMembership.objects.create(
                user=self.admin, institution=institution,
                role=InstitutionMembership.Role.ADMIN, is_active=True,
            )
        InstitutionMembership.objects.create(
            user=self.member, institution=self.apollo,
            role=InstitutionMembership.Role.MEMBER, is_active=True,
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
        return getattr(self.client, method)(
            path or self.url,
            data=data,
            format="json",
            HTTP_X_WORKSPACE_ID=str(institution.id),
        )

    def test_same_patient_code_isolated_between_schemas(self):
        self.authenticate(self.admin)
        left = self.request("post", self.apollo, data={
            "patient_code": "P-001", "display_name": "Apollo Patient",
        })
        right = self.request("post", self.aiims, data={
            "patient_code": "P-001", "display_name": "AIIMS Patient",
        })
        self.assertEqual(left.status_code, 201, left.data)
        self.assertEqual(right.status_code, 201, right.data)

        apollo = self.request("get", self.apollo)
        aiims = self.request("get", self.aiims)
        self.assertEqual([p["display_name"] for p in apollo.data], ["Apollo Patient"])
        self.assertEqual([p["display_name"] for p in aiims.data], ["AIIMS Patient"])

        self.assertEqual(
            self.request("get", self.aiims, path=f"{self.url}{left.data['id']}/").status_code,
            404,
        )
        with schema_context(self.apollo.schema_name):
            self.assertEqual(Patient.objects.count(), 1)
        with schema_context(self.aiims.schema_name):
            self.assertEqual(Patient.objects.count(), 1)

    def test_member_can_read_but_cannot_write(self):
        self.authenticate(self.admin)
        response = self.request("post", self.apollo, data={
            "patient_code": "P-002", "display_name": "Readable Patient",
        })
        self.assertEqual(response.status_code, 201)

        self.authenticate(self.member)
        self.assertEqual(self.request("get", self.apollo).status_code, 200)
        self.assertEqual(self.request("post", self.apollo, data={
            "patient_code": "P-003", "display_name": "Denied",
        }).status_code, 403)
        self.assertEqual(
            self.request("delete", self.apollo, path=f"{self.url}{response.data['id']}/").status_code,
            403,
        )

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
        apollo_patient = self.request("post", self.apollo, data={
            "patient_code": "P-GRANT", "display_name": "Apollo Record",
        }).data
        aiims_patient = self.request("post", self.aiims, data={
            "patient_code": "P-GRANT", "display_name": "AIIMS Record",
        }).data

        with self.settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            first = self.request(
                "post", self.apollo,
                path=f"{self.url}{apollo_patient['id']}/identity-grant/request/",
                data={"email": "Patient.Person@Example.com"},
            )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertNotIn("Patient.Person", str(first.data))
        self.assertEqual(first.data["masked_email"], "pa************@example.com")
        code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]

        wrong = self.request(
            "post", self.apollo,
            path=f"{self.url}{apollo_patient['id']}/identity-grant/verify/",
            data={"challenge_id": first.data["challenge_id"], "otp": "000000" if code != "000000" else "999999"},
        )
        self.assertEqual(wrong.status_code, 400)
        verified = self.request(
            "post", self.apollo,
            path=f"{self.url}{apollo_patient['id']}/identity-grant/verify/",
            data={"challenge_id": first.data["challenge_id"], "otp": code},
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["status"], PatientAccessGrant.Status.ACTIVE)

        second = self.request(
            "post", self.aiims,
            path=f"{self.url}{aiims_patient['id']}/identity-grant/request/",
            data={"email": "patient.person@example.com"},
        )
        second_code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        self.assertEqual(second.status_code, 201, second.data)
        self.assertEqual(self.request(
            "post", self.aiims,
            path=f"{self.url}{aiims_patient['id']}/identity-grant/verify/",
            data={"challenge_id": second.data["challenge_id"], "otp": second_code},
        ).status_code, 200)

        self.assertEqual(PatientIdentity.objects.count(), 1)
        self.assertEqual(PatientAccessGrant.objects.filter(status="ACTIVE").count(), 2)
        self.assertEqual(
            [p["display_name"] for p in self.request("get", self.apollo).data],
            ["Apollo Record"],
        )
        self.assertEqual(
            [p["display_name"] for p in self.request("get", self.aiims).data],
            ["AIIMS Record"],
        )

    def test_member_can_read_grant_status_but_cannot_start_grant(self):
        self.authenticate(self.admin)
        patient = self.request("post", self.apollo, data={
            "patient_code": "P-READ", "display_name": "Status Patient",
        }).data
        self.authenticate(self.member)
        path = f"{self.url}{patient['id']}/identity-grant/"
        status_response = self.request("get", self.apollo, path=path)
        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data, {"status": "UNLINKED", "verified_at": None})
        self.assertEqual(self.request(
            "post", self.apollo,
            path=f"{self.url}{patient['id']}/identity-grant/request/",
            data={"email": "patient@example.com"},
        ).status_code, 403)

    def test_active_identity_cannot_be_replaced_by_another_email(self):
        self.authenticate(self.admin)
        patient = self.request("post", self.apollo, data={
            "patient_code": "P-LOCK", "display_name": "Locked Patient",
        }).data
        request_path = f"{self.url}{patient['id']}/identity-grant/request/"
        verify_path = f"{self.url}{patient['id']}/identity-grant/verify/"
        first = self.request("post", self.apollo, path=request_path, data={"email": "first@example.com"})
        code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        self.assertEqual(self.request("post", self.apollo, path=verify_path, data={
            "challenge_id": first.data["challenge_id"], "otp": code,
        }).status_code, 200)
        replacement = self.request("post", self.apollo, path=request_path, data={"email": "other@example.com"})
        self.assertEqual(replacement.status_code, 409)
