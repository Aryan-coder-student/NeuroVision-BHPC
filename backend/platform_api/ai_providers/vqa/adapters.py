from ai_providers.catalog import ModelDefinition
from ai_providers.contracts import ProviderConfiguration
from ai_providers.exceptions import ProviderProtocolError
from ai_providers.transport import ProviderHTTPTransport, provider_endpoint

from .contracts import VQAProvider, VQARequest


class BlipVQAAdapter(VQAProvider):
    """Use the existing FastAPI/Hugging Face BLIP /predict/ API."""

    def __init__(
        self,
        configuration: ProviderConfiguration,
        *,
        transport: ProviderHTTPTransport | None = None,
    ):
        self._configuration = configuration
        self._transport = transport if transport is not None else ProviderHTTPTransport()

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
            provider_endpoint(self._configuration.base_url, "/predict/"),
            fields=fields,
            timeout_seconds=self._configuration.timeout_seconds,
            token=self._configuration.token,
        )
        answer = response.get("answer") or response.get("response") or response.get("result")
        if not isinstance(answer, str) or not answer.strip():
            raise ProviderProtocolError()
        return {"answer": answer}
