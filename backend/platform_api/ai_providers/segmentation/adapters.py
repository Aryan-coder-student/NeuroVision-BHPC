from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import ProviderConfiguration
from ai_providers.transport import ProviderHTTPTransport, provider_endpoint

from .contracts import SegmentationProvider, SegmentationRequest
from .serializers import MRI_MODALITIES


class MonaiSegmentationAdapter(SegmentationProvider):
    """File-upload contract for a future MONAI /predict/files endpoint.

    The original standalone Flask /predict accepts only server paths.
    Do not enable this adapter until the upstream service supports multipart.
    """

    def __init__(
        self,
        configuration: ProviderConfiguration,
        *,
        transport: ProviderHTTPTransport | None = None,
    ):
        self._configuration = configuration
        self._transport = transport or ProviderHTTPTransport()

    def segment(self, request: SegmentationRequest, model: ModelDefinition):
        fields: dict[str, object] = {"model_version": model.upstream_model_version}
        for modality in MRI_MODALITIES:
            volume = request.modalities[modality]
            fields[modality] = (
                volume.name,
                volume.data,
                "application/octet-stream",
            )
        return self._transport.post_multipart(
            provider_endpoint(self._configuration.base_url, "/predict/files"),
            fields=fields,
            timeout_seconds=self._configuration.timeout_seconds,
            token=self._configuration.token,
        )
