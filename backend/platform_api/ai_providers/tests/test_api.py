from unittest.mock import patch

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import InferenceResult
from ai_providers.exceptions import ProviderTimeout
from clinical.models import Patient
from tenant.models import Institution
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user
from users.models import InstitutionMembership


SEGMENTATION_MODEL = ModelDefinition(
    id="3d_unet_v2",
    name="MONAI 3D UNet",
    capability="segmentation",
    version="2.1",
    provider="monai",
    upstream_model_version="3d_unet_v2",
    is_configured=True,
)

VQA_MODEL = ModelDefinition(
    id="blip_med_v1",
    name="Fine-tuned BLIP VQA",
    capability="vqa",
    version="1.0",
    provider="blip_vqa",
    upstream_model_version="blip_med_v1",
    is_configured=True,
)


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    ENCRYPTION_KEY=TEST_FERNET_KEY,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class InferenceAPITests(TenantTestCase):
    def setUp(self):
        connection.set_schema_to_public()
        self.client = APIClient()
        self.member, _ = create_user(
            username="inference_member",
            email="inference-member@example.com",
            is_otp_verified=True,
        )
        self.outsider, _ = create_user(
            username="inference_outsider",
            email="inference-outsider@example.com",
            is_otp_verified=True,
        )
        self.workspace = Institution.objects.create(
            name="Inference Workspace",
            slug="inference-workspace",
            schema_name="inference_workspace",
        )
        self.other_workspace = Institution.objects.create(
            name="Other Workspace",
            slug="other-workspace",
            schema_name="other_workspace",
        )
        InstitutionMembership.objects.create(
            user=self.member,
            institution=self.workspace,
            role=InstitutionMembership.Role.MEMBER,
            is_active=True,
        )
        with schema_context(self.workspace.schema_name):
            self.patient = Patient.objects.create(display_name="Inference Patient")
        with schema_context(self.other_workspace.schema_name):
            self.other_patient = Patient.objects.create(display_name="Other Patient")
        self.authenticate(self.member)

    def tearDown(self):
        connection.set_schema_to_public()
        mail.outbox.clear()
        super().tearDown()

    def authenticate(self, user):
        self.client.cookies["access_token"] = str(RefreshToken.for_user(user).access_token)

    def request(self, method, path, data=None, format="json"):
        return getattr(self.client, method)(
            path,
            data=data,
            format=format,
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )

    def test_catalog_requires_active_workspace_membership(self):
        self.authenticate(self.outsider)

        response = self.request("get", "/api/v1/tenant/models/")

        self.assertEqual(response.status_code, 404)

    def test_catalog_reports_configuration_without_claiming_live_availability(self):
        response = self.request("get", "/api/v1/tenant/models/?capability=segmentation")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([item["id"] for item in response.data["results"]], ["3d_unet_v2"])
        self.assertEqual(response.data["results"][0]["availability"], "not_checked")
        self.assertNotIn("metric", response.data["results"][0])
        self.assertNotIn("base_url", response.data["results"][0])
        self.assertNotIn("token", response.data["results"][0])

    @patch("ai_providers.views.get_provider_registry")
    def test_member_can_route_segmentation_for_patient_in_selected_tenant(self, get_registry):
        registry = get_registry.return_value
        registry.run_segmentation.return_value = InferenceResult(
            model=SEGMENTATION_MODEL,
            payload={"volume_cm3": 12.3},
        )

        response = self.request(
            "post",
            f"/api/v1/tenant/patients/{self.patient.id}/inference/segmentation/",
            data={"model_id": "3d_unet_v2", "study_reference": "/studies/patient-a"},
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["patient_id"], str(self.patient.id))
        self.assertEqual(response.data["model"]["version"], "2.1")
        self.assertEqual(response.data["result"], {"volume_cm3": 12.3})
        registry.run_segmentation.assert_called_once()

    @patch("ai_providers.views.get_provider_registry")
    def test_member_can_route_vqa_without_persisting_the_image(self, get_registry):
        registry = get_registry.return_value
        registry.run_vqa.return_value = InferenceResult(
            model=VQA_MODEL,
            payload={"answer": "A lesion is visible."},
        )
        image = SimpleUploadedFile(
            "sample.jpg",
            b"jpeg-bytes",
            content_type="image/jpeg",
        )

        response = self.request(
            "post",
            f"/api/v1/tenant/patients/{self.patient.id}/inference/vqa/",
            data={
                "model_id": "blip_med_v1",
                "question": "What is visible?",
                "image": image,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["model"]["id"], "blip_med_v1")
        self.assertEqual(response.data["result"]["answer"], "A lesion is visible.")
        inference_request = registry.run_vqa.call_args.args[1]
        self.assertEqual(inference_request.image_bytes, b"jpeg-bytes")
        self.assertEqual(inference_request.image_content_type, "image/jpeg")

    @patch("ai_providers.views.get_provider_registry")
    def test_patient_from_another_tenant_is_rejected_before_provider_call(self, get_registry):
        response = self.request(
            "post",
            f"/api/v1/tenant/patients/{self.other_patient.id}/inference/segmentation/",
            data={"model_id": "3d_unet_v2", "study_reference": "/studies/other"},
        )

        self.assertEqual(response.status_code, 404)
        get_registry.return_value.run_segmentation.assert_not_called()

    @patch("ai_providers.views.get_provider_registry")
    def test_provider_timeout_returns_gateway_timeout_without_fake_result(self, get_registry):
        get_registry.return_value.run_segmentation.side_effect = ProviderTimeout()

        response = self.request(
            "post",
            f"/api/v1/tenant/patients/{self.patient.id}/inference/segmentation/",
            data={"model_id": "3d_unet_v2", "study_reference": "/studies/patient-a"},
        )

        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.data["code"], "provider_timeout")
        self.assertNotIn("result", response.data)

    @patch("ai_providers.views.get_provider_registry")
    def test_vqa_rejects_oversized_images_before_provider_call(self, get_registry):
        oversized = SimpleUploadedFile(
            "sample.jpg",
            b"x" * 33,
            content_type="image/jpeg",
        )

        with override_settings(AI_INFERENCE_MAX_IMAGE_BYTES=32):
            response = self.request(
                "post",
                f"/api/v1/tenant/patients/{self.patient.id}/inference/vqa/",
                data={
                    "model_id": "blip_med_v1",
                    "question": "What is visible?",
                    "image": oversized,
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 400)
        get_registry.return_value.run_vqa.assert_not_called()
