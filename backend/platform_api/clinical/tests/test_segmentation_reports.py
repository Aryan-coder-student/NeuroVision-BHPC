"""Reports are persisted only with signed evidence of successful segmentation."""
import struct
import zlib
from uuid import uuid4

from django.core import signing
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import ImagingStudy, Patient, SegmentationReport
from clinical.reports import create_inference_report_token
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


def png_snapshot():
    def chunk(kind, payload):
        return (struct.pack(">I", len(payload)) + kind + payload +
                struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff))
    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) +
            chunk(b"IDAT", zlib.compress(b"\0\xFF\0\0")) +
            chunk(b"IEND", b""))


@override_settings(ALLOWED_HOSTS=["testserver"], ENCRYPTION_KEY=TEST_FERNET_KEY)
class SegmentationReportAPITests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.owner, _ = create_user(username="report_owner", email="report-owner@example.com", is_otp_verified=True)
        self.outsider, _ = create_user(username="report_outsider", email="report-outsider@example.com", is_otp_verified=True)
        self.workspace = Institution.objects.create(
            name="Report Workspace", slug="report-workspace",
            schema_name="report_workspace", owner=self.owner,
        )
        self.other_workspace = Institution.objects.create(
            name="Other Report Workspace", slug="other-report",
            schema_name="other_report", owner=self.outsider,
        )
        InstitutionMembership.objects.create(user=self.owner, institution=self.workspace, is_active=True)
        with schema_context(self.workspace.schema_name):
            self.patient = Patient.objects.create(display_name="Report Patient")
            self.other_patient = Patient.objects.create(display_name="Different Patient")
            self.study = ImagingStudy.objects.create(
                patient=self.patient,
                created_by_user_id=self.owner.id,
                modality_sizes_bytes={"t1": 100, "t1ce": 100, "t2": 100, "flair": 100},
            )
        with schema_context(self.other_workspace.schema_name):
            self.external_patient = Patient.objects.create(display_name="External Patient")
        self.client.cookies["access_token"] = str(RefreshToken.for_user(self.owner).access_token)
        self.base = f"/api/v1/tenant/patients/{self.patient.id}/segmentation-reports/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def request(self, method, path=None, data=None, fmt="json", workspace=None):
        return getattr(self.client, method)(
            path or self.base, data=data, format=fmt,
            HTTP_X_WORKSPACE_ID=str(workspace or self.workspace.id),
        )

    def proof(self, patient=None, workspace=None, actor=None):
        return create_inference_report_token(
            patient_id=(patient or self.patient).id,
            workspace_id=(workspace or self.workspace).id,
            actor_id=(actor or self.owner).id,
            model={"id": "3d_unet_v2", "name": "MONAI 3D UNet", "version": "2.1"},
            measurements={"edema": 12.25},
        )

    def upload(self, token=None, **fields):
        return {
            "report_token": token or self.proof(),
            "snapshot": SimpleUploadedFile("viewer.png", png_snapshot(), content_type="image/png"),
            **fields,
        }

    def test_valid_inference_proof_persists_real_report_and_png(self):
        result = self.request("post", data=self.upload(imaging_study_id=str(self.study.id)), fmt="multipart")
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["model_version"], "2.1")
        self.assertEqual(result.data["measurements_cm3"], {"edema": 12.25})
        self.assertEqual(result.data["source"], "ai_inference")
        self.assertEqual(result.data["imaging_study_id"], str(self.study.id))
        self.assertNotIn("snapshot", result.data)
        with schema_context(self.workspace.schema_name):
            saved = SegmentationReport.objects.get(pk=result.data["id"])
            self.assertEqual(bytes(saved.snapshot_png), png_snapshot())
            self.assertEqual(saved.patient_id, self.patient.id)
            self.assertEqual(saved.created_by_user_id, self.owner.id)

        detail = self.request("get", path=self.base + result.data["id"] + "/")
        self.assertEqual(detail.status_code, 200, detail.data)
        image = self.request("get", path=self.base + result.data["id"] + "/snapshot/")
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image["Content-Type"], "image/png")
        self.assertEqual(image.content, png_snapshot())
        self.assertEqual(image["Cache-Control"], "private, no-store")

    def test_listing_is_patient_scoped_without_embedded_png(self):
        created = self.request("post", data=self.upload(), fmt="multipart")
        self.assertEqual(created.status_code, 201, created.data)
        results = self.request("get")
        self.assertEqual(results.status_code, 200, results.data)
        self.assertEqual([record["id"] for record in results.data["results"]], [created.data["id"]])
        self.assertNotIn("snapshot_png", str(results.data))
        another_path = f"/api/v1/tenant/patients/{self.other_patient.id}/segmentation-reports/"
        self.assertEqual(self.request("get", path=another_path).data["results"], [])
        self.assertEqual(self.request("get", path=another_path + created.data["id"] + "/").status_code, 404)
        external = f"/api/v1/tenant/patients/{self.external_patient.id}/segmentation-reports/"
        self.assertEqual(self.request("get", path=external).status_code, 404)

    def test_unsigned_or_forged_report_rejected(self):
        fake = self.upload(token="not-a-valid-inference-token")
        fake["model_version"] = "forged"
        fake["measurements_cm3"] = '{"edema":9000}'
        self.assertEqual(self.request("post", data=fake, fmt="multipart").status_code, 400)
        self.assertEqual(self.request("post", data=self.upload(token=signing.dumps({"source": "sample"})), fmt="multipart").status_code, 400)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(SegmentationReport.objects.exists())

    def test_report_proof_cannot_be_replayed(self):
        token = self.proof()
        first = self.request("post", data=self.upload(token=token), fmt="multipart")
        self.assertEqual(first.status_code, 201, first.data)
        second = self.request("post", data=self.upload(token=token), fmt="multipart")
        self.assertEqual(second.status_code, 409, second.data)

    def test_proof_bound_to_owner_tenant_and_patient(self):
        wrong_patient = self.proof(patient=self.other_patient)
        self.assertEqual(self.request("post", data=self.upload(token=wrong_patient), fmt="multipart").status_code, 400)
        wrong_workspace = self.proof(workspace=self.other_workspace)
        self.assertEqual(self.request("post", data=self.upload(token=wrong_workspace), fmt="multipart").status_code, 400)
        wrong_actor = self.proof(actor=self.outsider)
        self.assertEqual(self.request("post", data=self.upload(token=wrong_actor), fmt="multipart").status_code, 400)
        self.assertEqual(self.request("post", data=self.upload(imaging_study_id=str(uuid4())), fmt="multipart").status_code, 404)

    def test_invalid_and_oversized_snapshots_rejected(self):
        missing = self.upload()
        missing.pop("snapshot")
        self.assertEqual(self.request("post", data=missing, fmt="multipart").status_code, 400)
        fake = self.upload()
        fake["snapshot"] = SimpleUploadedFile("fake.png", b"not-png", content_type="image/png")
        self.assertEqual(self.request("post", data=fake, fmt="multipart").status_code, 400)
        with override_settings(REPORT_SNAPSHOT_MAX_BYTES=32):
            self.assertEqual(self.request("post", data=self.upload(), fmt="multipart").status_code, 400)
        with schema_context(self.workspace.schema_name):
            self.assertFalse(SegmentationReport.objects.exists())

    def test_expired_or_wrongly_salted_token_rejected(self):
        expired = signing.dumps(
            {"kind": "real_segmentation_inference"},
            salt="another-application",
        )
        self.assertEqual(self.request("post", data=self.upload(token=expired), fmt="multipart").status_code, 400)

    def test_no_saved_reports_seeded_from_demo_or_study(self):
        self.assertEqual(self.request("get").data["results"], [])
        with schema_context(self.workspace.schema_name):
            self.assertFalse(SegmentationReport.objects.exists())

    def test_nonowner_cannot_access_saved_report(self):
        created = self.request("post", data=self.upload(), fmt="multipart")
        self.client.cookies["access_token"] = str(RefreshToken.for_user(self.outsider).access_token)
        self.assertEqual(self.request("get").status_code, 404)
        self.assertEqual(self.request("get", path=self.base + created.data["id"] + "/snapshot/").status_code, 404)
        self.assertEqual(self.request("post", data=self.upload(), fmt="multipart").status_code, 404)
