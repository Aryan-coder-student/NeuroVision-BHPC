"""Full private MRI contribution uploads, no public URLs and strict tenant isolation."""
import gzip
import io
import tempfile
import zipfile
from unittest.mock import patch

from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import DatasetContribution, DatasetContributionFile
from clinical.storage import PrivateReportStorage
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


def nifti(name, *, gzip_compressed=True):
    raw = (348).to_bytes(4, "little") + bytes(344)
    data = gzip.compress(raw) if gzip_compressed else raw
    ext = ".nii.gz" if gzip_compressed else ".nii"
    return SimpleUploadedFile(name + ext, data, content_type="application/octet-stream")


def dicom_archive(path="synthetic/volume1.dcm"):
    data = b"\x00" * 128 + b"DICM" + b"research pixels"
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(path, data)
    return SimpleUploadedFile("research-dicom.zip", output.getvalue(), content_type="application/zip")


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    ENCRYPTION_KEY=TEST_FERNET_KEY,
    NEUROVISION_REPORT_STORAGE="huggingface",
)
class DatasetContributionAPITests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.disk = tempfile.TemporaryDirectory()
        self.backend_patch = patch.object(
            PrivateReportStorage, "_backend",
            return_value=FileSystemStorage(location=self.disk.name),
        )
        self.backend_patch.start()
        self.addCleanup(self.backend_patch.stop)
        self.addCleanup(self.disk.cleanup)

        self.client = APIClient()
        self.owner, _ = create_user(
            username="contrib_owner", email="contrib-owner@example.com",
            is_otp_verified=True,
        )
        self.outsider, _ = create_user(
            username="contrib_outsider", email="contrib-outsider@example.com",
            is_otp_verified=True,
        )
        self.workspace = Institution.objects.create(
            name="Contrib Workspace", slug="contrib-workspace",
            schema_name="contrib_workspace", owner=self.owner,
        )
        self.other = Institution.objects.create(
            name="Other Contrib", slug="other-contrib",
            schema_name="other_contrib", owner=self.outsider,
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
    def payload(**fields):
        return {
            "title": "Public reference MRI cohort",
            "modality": "multi_modal",
            "origin": "public",
            "description": "Research only, no patient data.",
            "license_info": "Academic research license",
            "sample_count": 1,
            "no_phi_attestation": "true",
            **fields,
        }

    @staticmethod
    def four_volumes():
        return {key: nifti(f"brats_{key}") for key in ("t1", "t1ce", "t2", "flair")}

    def test_four_niftis_are_saved_in_private_workspace_prefix(self):
        response = self.request("post", data={
            **self.payload(), **self.four_volumes(),
        }, fmt="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["format"], "nifti")
        self.assertEqual(response.data["file_count"], 4)
        self.assertEqual(response.data["status"], "uploaded")
        self.assertNotIn("object_file", response.data)
        with schema_context(self.workspace.schema_name):
            record = DatasetContribution.objects.get(pk=response.data["id"])
            self.assertEqual(record.submitted_by_user_id, self.owner.id)
            self.assertEqual(record.uploads.count(), 4)
            for file in record.uploads.all():
                key = file.object_file.name
                self.assertTrue(key.startswith(f"contributions/{self.workspace.id}/{record.id}/"), key)
                self.assertNotIn("brats_", key)
                self.assertGreater(file.byte_size, 0)
                self.assertTrue(file.object_file.storage.exists(key))
                with self.assertRaises(ValueError):
                    file.object_file.storage.url(key)
        self.assertEqual(self.request().data["count"], 1)
        self.assertEqual(self.request(path=f"{self.base}{record.id}/").status_code, 200)

    def test_dicom_zip_upload_is_validated_and_saved(self):
        response = self.request("post", data={
            **self.payload(modality="other"), "dicom_archive": dicom_archive(),
        }, fmt="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["file_count"], 1)
        self.assertEqual(response.data["format"], "dicom_zip")
        with schema_context(self.workspace.schema_name):
            obj = DatasetContributionFile.objects.get(contribution_id=response.data["id"])
            self.assertTrue(obj.object_file.name.endswith("/dicom_archive.zip"))

    def test_rejects_invalid_uploads_without_database_writes(self):
        cases = [
            self.payload(),  # no scans
            {**self.payload(), **{key: v for key, v in self.four_volumes().items() if key != "t2"}},
            {**self.payload(), **self.four_volumes(), "evil": nifti("evil")},
            {**self.payload(), "dicom_archive": dicom_archive("../patient.dcm")},
            {**self.payload(), "dicom_archive": SimpleUploadedFile("f.zip", b"bad")},
            {**self.payload(no_phi_attestation="false"), **self.four_volumes()},
            {**self.payload(), **self.four_volumes(), "file": SimpleUploadedFile("phi.nii", b"PHI")},
        ]
        for data in cases:
            response = self.request("post", data=data, fmt="multipart")
            self.assertEqual(response.status_code, 400, response.data)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(DatasetContribution.objects.exists())

    def test_status_cannot_be_forged_and_nonmember_has_no_access(self):
        response = self.request("post", data={
            **self.payload(status="approved", review_note="approved"),
            "dicom_archive": dicom_archive(),
        }, fmt="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "uploaded")
        self.assertEqual(response.data["review_note"], "")
        self.auth(self.outsider)
        self.assertEqual(self.request(workspace=self.workspace).status_code, 404)
        self.assertEqual(self.request(workspace=self.other).data["results"], [])
        self.assertEqual(self.request(
            path=f"{self.base}{response.data['id']}/", workspace=self.other,
        ).status_code, 404)

    def test_fail_closed_without_hf_configuration(self):
        with override_settings(NEUROVISION_REPORT_STORAGE="filesystem"):
            response = self.request("post", data={
                **self.payload(), "dicom_archive": dicom_archive(),
            }, fmt="multipart")
        self.assertEqual(response.status_code, 503)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(DatasetContribution.objects.exists())

    def test_failed_object_save_rolls_back_contribution(self):
        with patch.object(PrivateReportStorage, "_save", side_effect=OSError("object unavailable")):
            response = self.request("post", data={
                **self.payload(), "dicom_archive": dicom_archive(),
            }, fmt="multipart")
        self.assertEqual(response.status_code, 503)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(DatasetContribution.objects.exists())
