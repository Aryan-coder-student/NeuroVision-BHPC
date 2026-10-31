from dataclasses import dataclass, replace
from typing import Any, Mapping


CAPABILITY_SEGMENTATION = "segmentation"
CAPABILITY_VQA = "vqa"
SUPPORTED_CAPABILITIES = frozenset((CAPABILITY_SEGMENTATION, CAPABILITY_VQA))


@dataclass(frozen=True)
class ModelDefinition:
    id: str
    name: str
    capability: str
    version: str
    provider: str
    upstream_model_version: str
    is_configured: bool = False
    availability: str = "not_checked"

    def with_configuration(self, is_configured: bool) -> "ModelDefinition":
        return replace(self, is_configured=is_configured)

    def as_public_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "capability": self.capability,
            "version": self.version,
            "provider": self.provider,
            "is_configured": self.is_configured,
            "availability": self.availability,
        }

    @classmethod
    def from_settings(cls, entry: Mapping[str, Any]) -> "ModelDefinition":
        capability = str(entry["CAPABILITY"]).lower()
        if capability not in SUPPORTED_CAPABILITIES:
            raise ValueError(f"Unsupported model capability: {capability}")
        return cls(
            id=str(entry["ID"]),
            name=str(entry["NAME"]),
            capability=capability,
            version=str(entry["VERSION"]),
            provider=str(entry["PROVIDER"]),
            upstream_model_version=str(entry["UPSTREAM_MODEL_VERSION"]),
        )
