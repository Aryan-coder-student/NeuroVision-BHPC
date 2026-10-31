from ai_providers.views import PatientInferenceView

from .contracts import SegmentationRequest
from .serializers import SegmentationInferenceSerializer


class SegmentationInferenceView(PatientInferenceView):
    """Patient-scoped 3D MRI segmentation endpoint."""

    serializer_class = SegmentationInferenceSerializer
    registry_method = "run_segmentation"

    def build_request(self, validated_data):
        return SegmentationRequest(study_reference=validated_data["study_reference"])
