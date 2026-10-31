"""Tenant-only model feedback, validated model IDs and verified report references."""
from uuid import uuid4

from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from clinical.models import ModelFeedbackRecord, Patient, SegmentationReport
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


@override_settings(ALLOWED_HOSTS=["testserver"], ENCRYPTION_KEY=TEST_FERNET_KEY)
class ModelFeedbackTests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.owner, _ = create_user(
            username="feedback_owner", email="feedback-owner@example.com", is_otp_verified=True,
        )
        self.outsider, _ = create_user(
            username="feedback_outsider", email="feedback-outsider@example.com", is_otp_verified=True,
        )
        self.workspace = Institution.objects.create(
            name="Feedback Workspace", slug="feedback-workspace",
            schema_name="feedback_workspace", owner=self.owner,
        )
        self.other = Institution.objects.create(
            name="Feedback Other", slug="feedback-other",
            schema_name="feedback_other", owner=self.outsider,
        )
        InstitutionMembership.objects.create(user=self.owner, institution=self.workspace, is_active=True)
        InstitutionMembership.objects.create(user=self.outsider, institution=self.other, is_active=True)
        with schema_context(self.workspace.schema_name):
            self.patient = Patient.objects.create(display_name="Sample Research Patient")
            self.report = SegmentationReport.objects.create(
                patient=self.patient,
                proof_nonce=uuid4(),
                created_by_user_id=self.owner.id,
                model_id="3d_unet_v2",
                model_name="MONAI 3D UNet",
                model_version="2.1",
                snapshot_image="reports/demo.png",
            )
        self.authenticate(self.owner)
        self.url = "/api/v1/tenant/model-feedback/"

    def tearDown(self):
        connection.set_schema_to_public()
        super().tearDown()

    def authenticate(self, user):
        self.client.cookies["access_token"] = str(RefreshToken.for_user(user).access_token)

    @staticmethod
    def feedback(**fields):
        return {
            "model_id": "platform", "category": "feature_request",
            "description": "Improve reference MRI overlay controls.",
            "no_phi_attestation": True,
            **fields,
        }

    def request(self, method="get", data=None, path=None, workspace=None):
        return getattr(self.client, method)(
            path or self.url, data=data, format="json",
            HTTP_X_WORKSPACE_ID=str((workspace or self.workspace).id),
        )

    def test_create_and_read_real_feedback(self):
        result = self.request("post", data=self.feedback())
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["model_name"], "NeuroVision Platform")
        self.assertEqual(result.data["status"], "new")
        self.assertNotIn("no_phi_attestation", result.data)
        listing = self.request()
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["results"][0]["id"], result.data["id"])
        with schema_context(self.workspace.schema_name):
            saved = ModelFeedbackRecord.objects.get(pk=result.data["id"])
            self.assertEqual(saved.submitted_by_user_id, self.owner.id)
            self.assertTrue(saved.no_phi_attestation)

    def test_feedback_can_link_verified_segmentation_report(self):
        result = self.request("post", data=self.feedback(
            model_id="3d_unet_v2", category="false_negative",
            report_id=str(self.report.id),
        ))
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["report_id"], str(self.report.id))

    def test_reject_unknown_and_incompatible_model_feedback(self):
        for item in (
            self.feedback(model_id="unrecognized"),
            self.feedback(model_id="platform", category="false_positive"),
            self.feedback(model_id="3d_unet_v2", category="hallucination"),
            self.feedback(model_id="platform", no_phi_attestation=False),
        ):
            response = self.request("post", data=item)
            self.assertEqual(response.status_code, 400, response.data)
        with schema_context(self.workspace.schema_name):
            self.assertEqual(ModelFeedbackRecord.objects.count(), 0)

    def test_rejects_wrong_model_or_cross_tenant_report_id(self):
        mismatch = self.request("post", data=self.feedback(
            model_id="platform", category="feature_request", report_id=str(self.report.id),
        ))
        self.assertEqual(mismatch.status_code, 400)
        missing = self.request("post", data=self.feedback(
            model_id="3d_unet_v2", category="false_positive", report_id=str(uuid4()),
        ))
        self.assertEqual(missing.status_code, 400)
        with schema_context(self.other.schema_name):
            self.assertFalse(ModelFeedbackRecord.objects.exists())

    def test_other_tenant_cannot_read_or_modify_feedback(self):
        saved = self.request("post", data=self.feedback())
        self.assertEqual(saved.status_code, 201)
        self.authenticate(self.outsider)
        self.assertEqual(self.request(workspace=self.workspace).status_code, 404)
        self.assertEqual(self.request(workspace=self.other).data["results"], [])
        self.assertEqual(self.request(
            workspace=self.other, path=f"{self.url}{saved.data['id']}/",
        ).status_code, 404)
        new = self.request("post", data=self.feedback(), workspace=self.other)
        self.assertEqual(new.status_code, 201)
        with schema_context(self.workspace.schema_name):
            self.assertEqual(ModelFeedbackRecord.objects.count(), 1)
        with schema_context(self.other.schema_name):
            self.assertEqual(ModelFeedbackRecord.objects.count(), 1)

    def test_review_status_cannot_be_forged(self):
        response = self.request("post", data=self.feedback(
            status="resolved", reviewer_note="fake acceptance",
        ))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "new")
        self.assertEqual(response.data["reviewer_note"], "")
