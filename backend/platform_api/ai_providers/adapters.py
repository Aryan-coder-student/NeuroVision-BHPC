from .catalog import ModelDefinition
from .contracts import (
    ProviderConfiguration,
    SegmentationProvider,
    SegmentationRequest,
    VQAProvider,
    VQARequest,
)
from .exceptions import ProviderProtocolError
from .transport import ProviderHTTPTransport


def _provider_endpoint(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


class MonaiSegmentationAdapter(SegmentationProvider):
    """Adapter for the existing Flask MONAI 3D UNet `/predict` API."""

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
            _provider_endpoint(self._configuration.base_url, "/predict"),
            payload={
                "patient_folder": request.study_reference,
                "model_version": model.upstream_model_version,
            },
            timeout_seconds=self._configuration.timeout_seconds,
            token=self._configuration.token,
        )


class BlipVQAAdapter(VQAProvider):
    """Adapter for the existing FastAPI/Hugging Face BLIP `/predict/` API."""

    def __init__(
        self,
        configuration: ProviderConfiguration,
        *,
        transport: ProviderHTTPTransport | None = None,
    ):
        self._configuration = configuration
        self._transport = transport or ProviderHTTPTransport()

    def answer(self, request: VQARequest, model: ModelDefinition):
        fields: dict[str, object] = {
            "question": request.question,
            "model_version": model.upstream_model_version,
        }
        if request.image_bytes is not None:
            fields["file"] = (
                request.image_name or "vqa-image",
                request.image_bytes,
                request.image_content_type or "application/octet-stream",
            )
        response = self._transport.post_multipart(
            _provider_endpoint(self._configuration.base_url, "/predict/"),
            fields=fields,
            timeout_seconds=self._configuration.timeout_seconds,
            token=self._configuration.token,
        )
        answer = response.get("answer") or response.get("response") or response.get("result")
        if not isinstance(answer, str) or not answer.strip():
            raise ProviderProtocolError()
        return {"answer": answer}
