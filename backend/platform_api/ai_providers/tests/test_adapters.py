import base64
from unittest.mock import MagicMock

from django.test import SimpleTestCase

from ai_providers.segmentation.adapters import MonaiSegmentationAdapter
from ai_providers.vqa.adapters import BlipVQAAdapter
from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import ProviderConfiguration
from ai_providers.segmentation.contracts import NiftiVolume, SegmentationRequest
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
    def test_monai_adapter_sends_all_modalities_and_receives_actual_mask(self):
        transport = MagicMock()
        transport.post_multipart.return_value = {
            "mask_nifti_base64": base64.b64encode(b"nifti-mask").decode("ascii"),
            "region_volumes_cm3": {"whole_tumor": 12.3},
        }
        adapter = MonaiSegmentationAdapter(
            ProviderConfiguration(
                base_url="http://segmentation.test/",
                timeout_seconds=17,
                token="token",
            ),
            transport=transport,
        )

        result = adapter.segment(
            SegmentationRequest(modalities={
                key: NiftiVolume(name=f"scan_{key}.nii.gz", data=b"nifti-bytes")
                for key in ("t1", "t1ce", "t2", "flair")
            }),
            SEGMENTATION_MODEL,
        )

        self.assertEqual(result["region_volumes_cm3"], {"whole_tumor": 12.3})
        transport.post_multipart.assert_called_once_with(
            "http://segmentation.test/predict/files",
            fields={
                "model_version": "3d_unet_v2",
                **{
                    key: (f"scan_{key}.nii.gz", b"nifti-bytes", "application/octet-stream")
                    for key in ("t1", "t1ce", "t2", "flair")
                },
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

    def test_monai_adapter_rejects_path_only_result_without_mask(self):
        transport = MagicMock()
        transport.post_multipart.return_value = {"output_path": "/tmp/seg.nii.gz"}
        adapter = MonaiSegmentationAdapter(
            ProviderConfiguration(base_url="http://segmentation.test", timeout_seconds=20),
            transport=transport,
        )
        request = SegmentationRequest(modalities={
            key: NiftiVolume(name=f"scan_{key}.nii.gz", data=b"data")
            for key in ("t1", "t1ce", "t2", "flair")
        })
        with self.assertRaises(ProviderProtocolError):
            adapter.segment(request, SEGMENTATION_MODEL)
