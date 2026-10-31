from collections.abc import Iterable
from typing import Any, Mapping

from django.conf import settings
from django.utils.module_loading import import_string

from .catalog import CAPABILITY_SEGMENTATION, CAPABILITY_VQA, ModelDefinition
from .contracts import InferenceResult, ProviderConfiguration
from .segmentation.contracts import SegmentationProvider, SegmentationRequest
from .vqa.contracts import VQAProvider, VQARequest
from .exceptions import ModelNotFound, ProviderNotConfigured


class ProviderRegistry:
    """Resolve catalog models to configured provider adapters."""

    def __init__(
        self,
        provider_settings: Mapping[str, Mapping[str, Any]] | None = None,
        model_settings: Iterable[Mapping[str, Any]] | None = None,
    ):
        self._provider_settings = dict(
            provider_settings
            if provider_settings is not None
            else settings.AI_PROVIDER_REGISTRY
        )
        raw_models = model_settings if model_settings is not None else settings.AI_MODEL_CATALOG
        self._models = tuple(ModelDefinition.from_settings(entry) for entry in raw_models)

    def catalog(self, capability: str | None = None) -> list[ModelDefinition]:
        normalized_capability = capability.lower() if capability else None
        return [
            model.with_configuration(self._provider_is_configured(model.provider))
            for model in self._models
            if normalized_capability is None or model.capability == normalized_capability
        ]

    def run_segmentation(
        self,
        model_id: str,
        request: SegmentationRequest,
    ) -> InferenceResult:
        model = self._get_model(model_id, CAPABILITY_SEGMENTATION)
        provider = self._build_provider(model)
        if not isinstance(provider, SegmentationProvider):
            raise ProviderNotConfigured()
        return InferenceResult(model=model, payload=provider.segment(request, model))

    def run_vqa(self, model_id: str, request: VQARequest) -> InferenceResult:
        model = self._get_model(model_id, CAPABILITY_VQA)
        provider = self._build_provider(model)
        if not isinstance(provider, VQAProvider):
            raise ProviderNotConfigured()
        return InferenceResult(model=model, payload=provider.answer(request, model))

    def _get_model(self, model_id: str, capability: str) -> ModelDefinition:
        model = next(
            (
                candidate
                for candidate in self.catalog(capability)
                if candidate.id == model_id
            ),
            None,
        )
        if model is None:
            raise ModelNotFound()
        if not model.is_configured:
            raise ProviderNotConfigured()
        return model

    def _provider_is_configured(self, provider_name: str) -> bool:
        configuration = self._provider_settings.get(provider_name, {})
        if not configuration.get("ENABLED", False) or not configuration.get("ADAPTER"):
            return False
        try:
            self._configuration_for(configuration)
        except (KeyError, TypeError, ValueError):
            return False
        return True

    def _build_provider(self, model: ModelDefinition):
        configuration = self._provider_settings.get(model.provider)
        if not configuration or not self._provider_is_configured(model.provider):
            raise ProviderNotConfigured()
        try:
            adapter_class = import_string(configuration["ADAPTER"])
            provider_configuration = self._configuration_for(configuration)
        except (ImportError, KeyError, TypeError, ValueError) as error:
            raise ProviderNotConfigured() from error
        return adapter_class(provider_configuration)

    @staticmethod
    def _configuration_for(configuration: Mapping[str, Any]) -> ProviderConfiguration:
        return ProviderConfiguration(
            base_url=str(configuration["BASE_URL"]).strip(),
            timeout_seconds=float(configuration["TIMEOUT_SECONDS"]),
            token=str(configuration.get("TOKEN", "")),
        )


def get_provider_registry() -> ProviderRegistry:
    return ProviderRegistry()
