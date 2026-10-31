"""Input and inference interface owned exclusively by segmentation."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Mapping

if TYPE_CHECKING:
    from ai_providers.catalog import ModelDefinition


@dataclass(frozen=True)
class SegmentationRequest:
    study_reference: str


class SegmentationProvider(ABC):
    @abstractmethod
    def segment(
        self, request: SegmentationRequest, model: "ModelDefinition"
    ) -> Mapping[str, Any]:
        """Run 3D MRI segmentation."""
