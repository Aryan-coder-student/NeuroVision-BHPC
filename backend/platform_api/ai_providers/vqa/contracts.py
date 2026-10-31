"""Input and inference interface owned exclusively by VQA."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Mapping

if TYPE_CHECKING:
    from ai_providers.catalog import ModelDefinition


@dataclass(frozen=True)
class VQARequest:
    question: str
    image_name: str | None = None
    image_bytes: bytes | None = None
    image_content_type: str | None = None


class VQAProvider(ABC):
    @abstractmethod
    def answer(self, request: VQARequest, model: "ModelDefinition") -> Mapping[str, Any]:
        """Answer a question about an image."""
