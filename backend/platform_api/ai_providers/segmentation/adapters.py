from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import ProviderConfiguration
from ai_providers.transport import ProviderHTTPTransport, provider_endpoint

from .contracts import SegmentationProvider, SegmentationRequest


class MonaiSegmentationAdapter(SegmentationProvider):
    """Use the existing Flask MONAI 3D UNet /predict API."""

    def __init__(
        self,
        configuration: ProviderConfiguration,
        *,
        transport: ProviderHTTPTransport | None = None,
    ):
        self._configuration = configuration
        self._transport = transport or ProviderHTTPTransport()

    def segment(self, request: SegmentationRequest, model: ModelDefinition):
        return self._transport.post_json(
            provider_endpoint(self._configuration.base_url, "/predict"),
            payload={
                "patient_folder": request.study_reference,
                "model_version": model.upstream_model_version,
            },
            timeout_seconds=self._configuration.timeout_seconds,
            token=self._configuration.token,
        )
