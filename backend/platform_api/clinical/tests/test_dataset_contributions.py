"""Contribution requests save tenant-local metadata; raw MRI bytes are never accepted."""
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import DatasetContribution
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


@override_settings(ALLOWED_HOSTS=["testserver"], ENCRYPTION_KEY=TEST_FERNET_KEY)
class DatasetContributionAPITests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.owner, _ = create_user(
            username="contrib_owner", email="contrib-owner@example.com", is_otp_verified=True,
        )
        self.outsider, _ = create_user(
            username="contrib_outsider", email="contrib-outsider@example.com", is_otp_verified=True,
        )
        self.workspace = Institution.objects.create(
            name="Contrib Workspace", slug="contrib-workspace", schema_name="contrib_workspace",
            owner=self.owner,
        )
        self.other = Institution.objects.create(
            name="Other Contrib", slug="other-contrib", schema_name="other_contrib",
            owner=self.outsider,
        )
        InstitutionMembership.objects.create(
            user=self.owner, institution=self.workspace, is_active=True,
        )
        InstitutionMembership.objects.create(
            user=self.outsider, institution=self.other, is_active=True,
        )
        self.auth(self.owner)
        self.base = "/api/v1/tenant/contributions/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def auth(self, user):
        self.client.cookies["access_token"] = str(RefreshToken.for_user(user).access_token)

    def request(self, method="get", data=None, path=None, workspace=None, fmt="json"):
        return getattr(self.client, method)(
            path or self.base, data=data, format=fmt,
            HTTP_X_WORKSPACE_ID=str((workspace or self.workspace).id),
        )

    @staticmethod
    def proposal(**extra):
        return {
            "title": "Public reference cohort",
            "modality": "multi_modal",
            "origin": "public",
            "description": "Research data with a public redistribution license.",
            "license_info": "CC BY 4.0",
            "sample_count": 22,
            "no_phi_attestation": True,
            **extra,
        }

    def test_submission_persists_metadata_and_returns_pending_status(self):
        response = self.request("post", data=self.proposal())
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "pending_review")
        self.assertNotIn("no_phi_attestation", response.data)
        with schema_context(self.workspace.schema_name):
            saved = DatasetContribution.objects.get(pk=response.data["id"])
            self.assertEqual(saved.submitted_by_user_id, self.owner.id)
            self.assertEqual(saved.sample_count, 22)
            self.assertTrue(saved.no_phi_attestation)
        listing = self.request()
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(listing.data["results"][0]["id"], response.data["id"])
        detail = self.request(path=f"{self.base}{response.data['id']}/")
        self.assertEqual(detail.status_code, 200)

    def test_attestation_is_mandatory_and_not_automated_anonymization(self):
        for data in (self.proposal(no_phi_attestation=False),
                     {k: v for k, v in self.proposal().items() if k != "no_phi_attestation"}):
            response = self.request("post", data=data)
            self.assertEqual(response.status_code, 400, response.data)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(DatasetContribution.objects.exists())

    def test_rejects_file_payload_including_unrecognized_field_names(self):
        data = self.proposal(scan=SimpleUploadedFile("patient.nii.gz", b"PHI"))
        response = self.request("post", data=data, fmt="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("file", response.data)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(DatasetContribution.objects.exists())

    def test_cannot_set_status_or_reviewer_via_post(self):
        response = self.request("post", data=self.proposal(
            status="metadata_approved", review_note="approve", reviewed_by_user_id=str(uuid4()),
        ))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "pending_review")
        self.assertEqual(response.data["review_note"], "")

    def test_other_workspace_or_owner_cannot_read_submissions(self):
        created = self.request("post", data=self.proposal())
        self.assertEqual(created.status_code, 201, created.data)
        self.auth(self.outsider)
        self.assertEqual(self.request(workspace=self.workspace).status_code, 404)
        other_list = self.request(workspace=self.other)
        self.assertEqual(other_list.status_code, 200)
        self.assertEqual(other_list.data["results"], [])
        other_detail = self.request(
            workspace=self.other, path=f"{self.base}{created.data['id']}/",
        )
        self.assertEqual(other_detail.status_code, 404)
        other_post = self.request(
            "post", data=self.proposal(title="Other cohort"), workspace=self.other,
        )
        self.assertEqual(other_post.status_code, 201)
        with schema_context(self.workspace.schema_name):
            self.assertEqual(DatasetContribution.objects.count(), 1)
        with schema_context(self.other.schema_name):
            self.assertEqual(DatasetContribution.objects.count(), 1)

    def test_invalid_modality_origin_and_sample_count_rejected(self):
        for invalid in (
            {"origin": "private_patient_data"},
            {"modality": "dicom_protected"},
            {"sample_count": 0},
            {"sample_count": 10000001},
        ):
            response = self.request("post", data=self.proposal(**invalid))
            self.assertEqual(response.status_code, 400, response.data)
        with schema_context(self.workspace.schema_name):
            self.assertEqual(DatasetContribution.objects.count(), 0)
