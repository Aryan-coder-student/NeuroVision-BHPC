from ai_providers.views import PatientInferenceView

from .contracts import VQARequest
from .serializers import VQAInferenceSerializer


class VQAInferenceView(PatientInferenceView):
    """Patient-scoped visual question answering endpoint."""

    serializer_class = VQAInferenceSerializer
    registry_method = "run_vqa"

    def build_request(self, validated_data):
        image = validated_data.get("image")
        return VQARequest(
            question=validated_data["question"],
            image_name=image.name if image else None,
            image_bytes=image.read() if image else None,
            image_content_type=image.content_type if image else None,
        )
