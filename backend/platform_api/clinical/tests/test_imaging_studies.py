"""Imaging metadata is patient-scoped; uploaded MRI bytes are never retained."""
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import ImagingStudy, Patient
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


@override_settings(ALLOWED_HOSTS=["testserver"], ENCRYPTION_KEY=TEST_FERNET_KEY)
class ImagingStudyAPITests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.admin, _ = create_user(username="imaging_admin", email="imaging-admin@example.com", is_otp_verified=True)
        self.member, _ = create_user(username="imaging_member", email="imaging-member@example.com", is_otp_verified=True)
        self.outsider, _ = create_user(username="imaging_outsider", email="imaging-outsider@example.com", is_otp_verified=True)
        self.workspace = Institution.objects.create(
            name="Imaging Workspace", slug="imaging-workspace", schema_name="imaging_workspace"
        )
        self.other_workspace = Institution.objects.create(
            name="Other Imaging Workspace", slug="other-imaging", schema_name="other_imaging"
        )
        InstitutionMembership.objects.create(user=self.admin, institution=self.workspace, role=InstitutionMembership.Role.ADMIN, is_active=True)
        InstitutionMembership.objects.create(user=self.member, institution=self.workspace, role=InstitutionMembership.Role.MEMBER, is_active=True)
        with schema_context(self.workspace.schema_name):
            self.patient = Patient.objects.create(display_name="Imaging Patient")
            self.second_patient = Patient.objects.create(display_name="Second Patient")
        with schema_context(self.other_workspace.schema_name):
            self.other_patient = Patient.objects.create(display_name="Other Institution Patient")
        self.authenticate(self.admin)
        self.url = f"/api/v1/tenant/patients/{self.patient.id}/imaging-studies/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def authenticate(self, user):
        self.client.cookies["access_token"] = str(RefreshToken.for_user(user).access_token)

    @staticmethod
    def uploads(names=None):
        names = names or {key: f"scan_{key}.nii.gz" for key in ("t1", "t1ce", "t2", "flair")}
        return {
            key: SimpleUploadedFile(name, b"research-nifti-bytes", content_type="application/octet-stream")
            for key, name in names.items()
        }

    def request(self, method, path=None, data=None, fmt="json", workspace=None):
        return getattr(self.client, method)(
            path or self.url,
            data=data,
            format=fmt,
            HTTP_X_WORKSPACE_ID=str((workspace or self.workspace).id),
        )

    def test_admin_uploads_four_files_but_stores_only_metadata(self):
        response = self.request("post", data=self.uploads(), fmt="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["patient_id"], str(self.patient.id))
        self.assertEqual(response.data["storage_status"], "not_retained")
        self.assertEqual(set(response.data["modality_sizes_bytes"]), {"t1", "t1ce", "t2", "flair"})
        self.assertNotIn("files", response.data)
        with schema_context(self.workspace.schema_name):
            study = ImagingStudy.objects.get(pk=response.data["id"])
            self.assertEqual(study.created_by_user_id, self.admin.id)
            self.assertEqual(study.patient_id, self.patient.id)
            self.assertEqual(set(study.modality_sizes_bytes.values()), {len(b"research-nifti-bytes")})
            self.assertNotIn("scan_t1", str(study.__dict__))
            self.assertNotIn("research-nifti-bytes", str(study.__dict__))

    def test_patient_scoped_list_and_detail_and_empty_patient(self):
        first = self.request("post", data=self.uploads(), fmt="multipart")
        self.assertEqual(first.status_code, 201, first.data)
        listing = self.request("get")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([row["id"] for row in listing.data["results"]], [first.data["id"]])
        detail = self.request("get", path=f"{self.url}{first.data['id']}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["id"], first.data["id"])
        other = f"/api/v1/tenant/patients/{self.second_patient.id}/imaging-studies/"
        self.assertEqual(self.request("get", path=other).data["results"], [])
        self.assertEqual(self.request("get", path=f"{other}{first.data['id']}/").status_code, 404)
        self.assertEqual(self.request("get", path=f"{self.url}{uuid4()}/").status_code, 404)

    def test_members_can_read_but_only_admin_can_record_studies(self):
        self.authenticate(self.member)
        self.assertEqual(self.request("get").status_code, 200)
        self.assertEqual(self.request("post", data=self.uploads(), fmt="multipart").status_code, 403)
        with schema_context(self.workspace.schema_name):
            self.assertEqual(ImagingStudy.objects.count(), 0)

    def test_nonmember_cannot_read_or_record(self):
        self.authenticate(self.outsider)
        self.assertEqual(self.request("get").status_code, 404)
        self.assertEqual(self.request("post", data=self.uploads(), fmt="multipart").status_code, 404)

    def test_patient_from_another_tenant_cannot_be_referenced(self):
        path = f"/api/v1/tenant/patients/{self.other_patient.id}/imaging-studies/"
        self.assertEqual(self.request("get", path=path).status_code, 404)
        self.assertEqual(self.request("post", path=path, data=self.uploads(), fmt="multipart").status_code, 404)

    def test_rejects_missing_or_mislabeled_mri_without_creating_study(self):
        missing = self.uploads()
        missing.pop("t2")
        response = self.request("post", data=missing, fmt="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("t2", response.data)
        mislabeled = self.uploads()
        mislabeled["flair"] = SimpleUploadedFile("scan_t2.nii.gz", b"wrong")
        response = self.request("post", data=mislabeled, fmt="multipart")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("flair", response.data)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(ImagingStudy.objects.exists())

    @override_settings(AI_INFERENCE_MAX_MRI_FILE_BYTES=10)
    def test_rejects_oversized_files_using_existing_upload_limit(self):
        self.assertEqual(self.request("post", data=self.uploads(), fmt="multipart").status_code, 400)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(ImagingStudy.objects.exists())

    def test_filename_prefixes_do_not_have_to_match_and_client_cannot_forge_metadata(self):
        names = {
            "t1": "first_t1.nii.gz", "t1ce": "second_t1ce.nii.gz",
            "t2": "third_t2.nii.gz", "flair": "fourth_flair.nii.gz",
        }
        response = self.request("post", data={
            **self.uploads(names),
            "storage_status": "retained",
            "modality_sizes_bytes": '{"t1": 999999}',
            "patient_id": str(self.second_patient.id),
        }, fmt="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["storage_status"], "not_retained")
        self.assertEqual(response.data["patient_id"], str(self.patient.id))
        self.assertEqual(response.data["modality_sizes_bytes"]["t1"], len(b"research-nifti-bytes"))

    def test_no_studies_are_seeded_from_bundled_demo(self):
        self.assertEqual(self.request("get").data["results"], [])
