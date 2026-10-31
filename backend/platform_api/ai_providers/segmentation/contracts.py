"""Typed, file-based segmentation input; never accept user filesystem paths."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Mapping

if TYPE_CHECKING:
    from ai_providers.catalog import ModelDefinition


@dataclass(frozen=True)
class NiftiVolume:
    name: str
    data: bytes


@dataclass(frozen=True)
class SegmentationRequest:
    modalities: Mapping[str, NiftiVolume]


class SegmentationProvider(ABC):
    @abstractmethod
    def segment(
        self, request: SegmentationRequest, model: "ModelDefinition"
    ) -> Mapping[str, Any]:
        """Run segmentation using MRI input files; never service paths."""
