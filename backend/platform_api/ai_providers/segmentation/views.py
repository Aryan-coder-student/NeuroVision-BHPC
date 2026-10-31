from ai_providers.views import PatientInferenceView

from .contracts import NiftiVolume, SegmentationRequest
from .serializers import MRI_MODALITIES, SegmentationInferenceSerializer


class SegmentationInferenceView(PatientInferenceView):
    """Tenant-authorized multipart MRI inference; no caller-supplied paths."""

    serializer_class = SegmentationInferenceSerializer
    registry_method = "run_segmentation"

    def build_request(self, validated_data):
        return SegmentationRequest(
            modalities={
                key: NiftiVolume(
                    name=validated_data[key].name,
                    data=validated_data[key].read(),
                )
                for key in MRI_MODALITIES
            }
        )
