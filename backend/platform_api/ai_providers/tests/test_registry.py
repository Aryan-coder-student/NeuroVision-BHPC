from django.test import SimpleTestCase, override_settings

from ai_providers.segmentation.contracts import SegmentationProvider, SegmentationRequest
from ai_providers.vqa.contracts import VQAProvider, VQARequest
from ai_providers.exceptions import ModelNotFound, ProviderNotConfigured
from ai_providers.registry import ProviderRegistry


PROVIDERS = {
    "monai": {
        "ADAPTER": "ai_providers.tests.test_registry.FakeSegmentationProvider",
        "BASE_URL": "http://segmentation.test",
        "TIMEOUT_SECONDS": 12,
        "TOKEN": "",
        "ENABLED": True,
    },
    "blip": {
        "ADAPTER": "ai_providers.tests.test_registry.FakeVQAProvider",
        "BASE_URL": "http://vqa.test",
        "TIMEOUT_SECONDS": 8,
        "TOKEN": "secret",
        "ENABLED": True,
    },
}

MODELS = (
    {
        "ID": "3d_unet_v2",
        "NAME": "MONAI 3D UNet",
        "CAPABILITY": "segmentation",
        "VERSION": "2.1",
        "PROVIDER": "monai",
        "UPSTREAM_MODEL_VERSION": "3d_unet_v2",
    },
    {
        "ID": "blip_med_v1",
        "NAME": "Fine-tuned BLIP VQA",
        "CAPABILITY": "vqa",
        "VERSION": "1.0",
        "PROVIDER": "blip",
        "UPSTREAM_MODEL_VERSION": "blip_med_v1",
    },
)


class FakeSegmentationProvider(SegmentationProvider):
    def __init__(self, configuration):
        self.configuration = configuration

    def segment(self, request, model):
        return {"study_reference": request.study_reference, "version": model.version}


class FakeVQAProvider(VQAProvider):
    def __init__(self, configuration):
        self.configuration = configuration

    def answer(self, request, model):
        return {"answer": request.question, "version": model.version}


@override_settings(AI_PROVIDER_REGISTRY=PROVIDERS, AI_MODEL_CATALOG=MODELS)
class ProviderRegistryTests(SimpleTestCase):
    def setUp(self):
        self.registry = ProviderRegistry()

    def test_catalog_contains_only_real_configured_models_and_tracks_versions(self):
        catalog = self.registry.catalog()

        self.assertEqual([model.id for model in catalog], ["3d_unet_v2", "blip_med_v1"])
        self.assertEqual([model.version for model in catalog], ["2.1", "1.0"])
        self.assertTrue(all(model.is_configured for model in catalog))
        self.assertTrue(all(model.availability == "not_checked" for model in catalog))

    def test_catalog_filters_by_capability(self):
        models = self.registry.catalog(capability="vqa")

        self.assertEqual([model.id for model in models], ["blip_med_v1"])

    def test_segmentation_routes_through_configured_adapter(self):
        result = self.registry.run_segmentation(
            "3d_unet_v2", SegmentationRequest(study_reference="study/demo")
        )

        self.assertEqual(result.payload, {"study_reference": "study/demo", "version": "2.1"})
        self.assertEqual(result.model.id, "3d_unet_v2")

    def test_vqa_routes_through_configured_adapter(self):
        result = self.registry.run_vqa(
            "blip_med_v1",
            VQARequest(
                question="What is visible?",
                image_name="sample.jpg",
                image_bytes=b"image",
                image_content_type="image/jpeg",
            ),
        )

        self.assertEqual(result.payload["answer"], "What is visible?")
        self.assertEqual(result.model.version, "1.0")

    def test_unknown_model_is_rejected(self):
        with self.assertRaises(ModelNotFound):
            self.registry.run_segmentation(
                "unknown", SegmentationRequest(study_reference="study/demo")
            )

    @override_settings(
        AI_PROVIDER_REGISTRY={**PROVIDERS, "monai": {**PROVIDERS["monai"], "ENABLED": False}}
    )
    def test_disabled_provider_is_reported_without_fake_availability(self):
        registry = ProviderRegistry()

        model = registry.catalog(capability="segmentation")[0]
        self.assertFalse(model.is_configured)
        with self.assertRaises(ProviderNotConfigured):
            registry.run_segmentation(
                "3d_unet_v2", SegmentationRequest(study_reference="study/demo")
            )

    @override_settings(
        AI_PROVIDER_REGISTRY={
            **PROVIDERS,
            "monai": {**PROVIDERS["monai"], "TIMEOUT_SECONDS": 0},
        }
    )
    def test_invalid_provider_configuration_is_not_advertised_as_configured(self):
        model = ProviderRegistry().catalog(capability="segmentation")[0]

        self.assertFalse(model.is_configured)
