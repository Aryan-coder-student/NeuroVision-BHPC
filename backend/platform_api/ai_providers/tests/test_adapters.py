from unittest.mock import MagicMock

from django.test import SimpleTestCase

from ai_providers.segmentation.adapters import MonaiSegmentationAdapter
from ai_providers.vqa.adapters import BlipVQAAdapter
from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import ProviderConfiguration
from ai_providers.segmentation.contracts import SegmentationRequest
from ai_providers.vqa.contracts import VQARequest
from ai_providers.exceptions import ProviderProtocolError


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
    provider="blip",
    upstream_model_version="blip_med_v1",
    is_configured=True,
)


class ProviderAdapterTests(SimpleTestCase):
    def test_monai_adapter_preserves_existing_flask_contract(self):
        transport = MagicMock()
        transport.post_json.return_value = {"volume_cm3": 12.3}
        adapter = MonaiSegmentationAdapter(
            ProviderConfiguration(
                base_url="http://segmentation.test/",
                timeout_seconds=17,
                token="token",
            ),
            transport=transport,
        )

        result = adapter.segment(
            SegmentationRequest(study_reference="/studies/patient-a"),
            SEGMENTATION_MODEL,
        )

        self.assertEqual(result, {"volume_cm3": 12.3})
        transport.post_json.assert_called_once_with(
            "http://segmentation.test/predict",
            payload={
                "patient_folder": "/studies/patient-a",
                "model_version": "3d_unet_v2",
            },
            timeout_seconds=17,
            token="token",
        )

    def test_blip_adapter_preserves_existing_fastapi_multipart_contract(self):
        transport = MagicMock()
        transport.post_multipart.return_value = {"response": "A lesion is visible."}
        adapter = BlipVQAAdapter(
            ProviderConfiguration(
                base_url="https://vqa.test",
                timeout_seconds=23,
                token="hf-token",
            ),
            transport=transport,
        )

        result = adapter.answer(
            VQARequest(
                question="What is visible?",
                image_name="demo.jpg",
                image_bytes=b"jpeg-bytes",
                image_content_type="image/jpeg",
            ),
            VQA_MODEL,
        )

        self.assertEqual(result, {"answer": "A lesion is visible."})
        transport.post_multipart.assert_called_once_with(
            "https://vqa.test/predict/",
            fields={
                "question": "What is visible?",
                "model_version": "blip_med_v1",
                "file": ("demo.jpg", b"jpeg-bytes", "image/jpeg"),
            },
            timeout_seconds=23,
            token="hf-token",
        )

    def test_blip_adapter_rejects_responses_without_an_answer(self):
        transport = MagicMock()
        transport.post_multipart.return_value = {"status": "ok"}
        adapter = BlipVQAAdapter(
            ProviderConfiguration(
                base_url="https://vqa.test",
                timeout_seconds=23,
            ),
            transport=transport,
        )

        with self.assertRaises(ProviderProtocolError):
            adapter.answer(VQARequest(question="What is visible?"), VQA_MODEL)
