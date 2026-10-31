"""Transport-neutral contracts shared by both inference capabilities."""
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Mapping
from urllib.parse import urlparse

if TYPE_CHECKING:
    from .catalog import ModelDefinition


@dataclass(frozen=True)
class ProviderConfiguration:
    base_url: str
    timeout_seconds: float
    token: str = ""

    def __post_init__(self):
        parsed_url = urlparse(self.base_url)
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
            raise ValueError("Provider base URL must be an absolute HTTP(S) URL.")
        if self.timeout_seconds <= 0:
            raise ValueError("Provider timeout must be positive.")


@dataclass(frozen=True)
class InferenceResult:
    model: "ModelDefinition"
    payload: Mapping[str, Any]
