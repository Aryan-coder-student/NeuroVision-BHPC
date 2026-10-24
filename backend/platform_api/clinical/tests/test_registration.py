"""Patient registration contract: tenant-scoped records and existing public OTP grants."""
from datetime import date, timedelta
from unittest.mock import patch

from django.core import mail
from django.db import connection
from django.test import override_settings
from django.utils import timezone
from django_tenants.utils import tenant_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.dates import patient_calendar_date
from clinical.models import Patient
from patient_identity.models import PatientAccessGrant, PatientGrantChallenge, PatientIdentity
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    ENCRYPTION_KEY=TEST_FERNET_KEY,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class PatientRegistrationTests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.admin, _ = create_user(
            username="regadmin", email="regadmin@example.com", is_otp_verified=True
        )
        self.workspace = Institution.objects.create(
            name="Patient Registration Hospital",
            slug="patient-reg-hospital",
            schema_name="patient_reg_hospital",
        )
        InstitutionMembership.objects.create(
            user=self.admin,
            institution=self.workspace,
            role=InstitutionMembership.Role.ADMIN,
            is_active=True,
        )
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(self.admin).access_token
        )
        self.url = "/api/v1/tenant/patients/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def register(self, **overrides):
        data = {
            "display_name": "Case Example",
            "date_of_birth": "2000-02-29",
            "email": "person@example.com",
        }
        data.update(overrides)
        return self.client.post(
            self.url,
            data,
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )

    def test_generates_server_patient_code_and_derived_age(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertRegex(response.data["patient_code"], r"^NV-[A-F0-9]{20}$")
        self.assertIsNotNone(response.data["id"])
        self.assertEqual(response.data["date_of_birth"], "2000-02-29")
        self.assertTrue(response.data["created_at"].endswith("Z"))
        dob = date(2000, 2, 29)
        today = patient_calendar_date()
        expected_age = today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )
        self.assertEqual(response.data["age"], expected_age)
        self.assertNotIn("email", response.data)
        self.assertEqual(response.data["identity_verification"]["status"], "PENDING")
        self.assertEqual(response.data["identity_verification"]["masked_email"], "pe****@example.com")
        self.assertEqual(response.data["identity_verification"]["expires_in_seconds"], 600)
        self.assertEqual(len(mail.outbox), 1)

        with tenant_context(self.workspace):
            saved = Patient.objects.get(pk=response.data["id"])
            self.assertEqual(saved.patient_code, response.data["patient_code"])
            self.assertIsNone(saved.global_identity_id)
            self.assertEqual(saved.date_of_birth, dob)
            self.assertEqual(saved.created_at.utcoffset(), timedelta(0))

    def test_rejects_client_supplied_patient_code(self):
        response = self.register(patient_code="P-MANUAL")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("patient_code", response.data)
        with tenant_context(self.workspace):
            self.assertEqual(Patient.objects.count(), 0)

    def test_requires_email_and_date_of_birth(self):
        for field in ("email", "date_of_birth"):
            payload = {
                "display_name": "Example", "email": "person@example.com",
                "date_of_birth": "2002-01-01",
            }
            payload.pop(field)
            response = self.client.post(
                self.url, payload, format="json",
                HTTP_X_WORKSPACE_ID=str(self.workspace.id),
            )
            self.assertEqual(response.status_code, 400, response.data)
            self.assertIn(field, response.data)
        with tenant_context(self.workspace):
            self.assertEqual(Patient.objects.count(), 0)

    def test_rejects_future_birth_date(self):
        response = self.register(date_of_birth="2999-01-01")
        self.assertEqual(response.status_code, 400)
        self.assertIn("date_of_birth", response.data)

    def test_rejects_null_birth_date_without_server_error(self):
        response = self.register(date_of_birth=None)
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("date_of_birth", response.data)

    def test_does_not_save_patient_if_otp_delivery_fails(self):
        with patch("patient_identity.services.email_service.send", return_value=False):
            response = self.register()
        self.assertEqual(response.status_code, 503, response.data)
        with tenant_context(self.workspace):
            self.assertEqual(Patient.objects.count(), 0)
        self.assertEqual(PatientAccessGrant.objects.count(), 0)
        self.assertEqual(PatientGrantChallenge.objects.count(), 0)
        self.assertEqual(PatientIdentity.objects.count(), 0)

    def test_verification_links_only_after_correct_otp(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        verification = response.data["identity_verification"]
        url = f"{self.url}{response.data['id']}/identity-grant/verify/"
        wrong = "000000" if code != "000000" else "999999"
        failure = self.client.post(
            url,
            {"challenge_id": verification["challenge_id"], "otp": wrong},
            format="json", HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(failure.status_code, 400)
        with tenant_context(self.workspace):
            self.assertIsNone(Patient.objects.get(pk=response.data["id"]).global_identity_id)

        success = self.client.post(
            url,
            {"challenge_id": verification["challenge_id"], "otp": code},
            format="json", HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(success.status_code, 200, success.data)
        self.assertEqual(success.data["status"], PatientAccessGrant.Status.ACTIVE)
        with tenant_context(self.workspace):
            self.assertIsNotNone(Patient.objects.get(pk=response.data["id"]).global_identity_id)
        replay = self.client.post(
            url,
            {"challenge_id": verification["challenge_id"], "otp": code},
            format="json", HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(replay.status_code, 400)

    def test_cannot_patch_server_managed_fields(self):
        response = self.register()
        detail = f"{self.url}{response.data['id']}/"
        immutable_values = {
            "id": "11111111-1111-1111-1111-111111111111",
            "patient_code": "FORGED-CODE",
            "global_identity_id": "22222222-2222-2222-2222-222222222222",
            "email": "replacement@example.com",
            "created_at": "2020-01-01T00:00:00Z",
            "updated_at": "2020-01-01T00:00:00Z",
        }
        for field, value in immutable_values.items():
            result = self.client.patch(
                detail, {field: value}, format="json",
                HTTP_X_WORKSPACE_ID=str(self.workspace.id),
            )
            self.assertEqual(result.status_code, 400, result.data)
            self.assertIn(field, result.data)

    def test_old_code_cannot_verify_a_replaced_pending_email(self):
        response = self.register(email="first@example.com")
        patient_id = response.data["id"]
        old_challenge_id = response.data["identity_verification"]["challenge_id"]
        old_code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        PatientGrantChallenge.objects.filter(id=old_challenge_id).update(
            created_at=timezone.now() - timedelta(minutes=2)
        )

        request_url = f"{self.url}{patient_id}/identity-grant/request/"
        replacement = self.client.post(
            request_url,
            {"email": "second@example.com"},
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(replacement.status_code, 201, replacement.data)
        new_code = mail.outbox[-1].body.split("code is ", 1)[1].split(".", 1)[0]
        verify_url = f"{self.url}{patient_id}/identity-grant/verify/"

        old_result = self.client.post(
            verify_url,
            {"challenge_id": old_challenge_id, "otp": old_code},
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(old_result.status_code, 400)
        new_result = self.client.post(
            verify_url,
            {"challenge_id": replacement.data["challenge_id"], "otp": new_code},
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(new_result.status_code, 200, new_result.data)

    def test_deleting_patient_removes_public_identity_grant(self):
        response = self.register()
        patient_id = response.data["id"]
        detail_url = f"{self.url}{patient_id}/"

        deleted = self.client.delete(
            detail_url,
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )

        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(
            PatientAccessGrant.objects.filter(
                institution=self.workspace,
                tenant_patient_id=patient_id,
            ).exists()
        )
        self.assertEqual(PatientIdentity.objects.count(), 0)

    def test_admin_can_correct_name_and_dob_without_changing_identity(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        patient_id = response.data["id"]
        initial_code = response.data["patient_code"]
        initial_challenge = response.data["identity_verification"]["challenge_id"]

        updated = self.client.patch(
            f"{self.url}{patient_id}/",
            {"display_name": "Corrected Patient", "date_of_birth": "1990-12-05"},
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["display_name"], "Corrected Patient")
        self.assertEqual(updated.data["date_of_birth"], "1990-12-05")
        self.assertEqual(updated.data["patient_code"], initial_code)
        self.assertEqual(str(updated.data["id"]), str(patient_id))
        self.assertIn("age", updated.data)
        detail = self.client.get(
            f"{self.url}{patient_id}/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["patient_code"], initial_code)
        self.assertEqual(str(detail.data["id"]), str(patient_id))
        self.assertEqual(detail.data["display_name"], "Corrected Patient")
        self.assertNotIn("email", detail.data)
        self.assertEqual(
            str(PatientGrantChallenge.objects.get(id=initial_challenge).grant.tenant_patient_id),
            str(patient_id),
        )
        self.assertEqual(PatientAccessGrant.objects.count(), 1)

    def test_patient_edit_rejects_invalid_demographics(self):
        patient = self.register().data
        url = f"{self.url}{patient['id']}/"
        for payload in (
            {"display_name": ""},
            {"date_of_birth": "2999-01-01"},
            {"date_of_birth": None},
        ):
            updated = self.client.patch(
                url, payload, format="json",
                HTTP_X_WORKSPACE_ID=str(self.workspace.id),
            )
            self.assertEqual(updated.status_code, 400, updated.data)
        detail = self.client.get(
            url, HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(detail.data["display_name"], "Case Example")
        self.assertEqual(detail.data["date_of_birth"], "2000-02-29")
