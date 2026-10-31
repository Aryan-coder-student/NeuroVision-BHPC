from django.conf import settings
from rest_framework import serializers

MRI_MODALITIES = ("t1", "t1ce", "t2", "flair")


class SegmentationInferenceSerializer(serializers.Serializer):
    model_id = serializers.CharField(max_length=120)
    t1 = serializers.FileField()
    t1ce = serializers.FileField()
    t2 = serializers.FileField()
    flair = serializers.FileField()

    def validate(self, attrs):
        if "study_reference" in self.initial_data or "patient_folder" in self.initial_data:
            raise serializers.ValidationError(
                "Filesystem paths are not accepted. Upload the four MRI modalities."
            )
        for modality in MRI_MODALITIES:
            image = attrs[modality]
            if not image.name.lower().endswith((".nii", ".nii.gz")):
                raise serializers.ValidationError({
                    modality: "Use a .nii or .nii.gz NIfTI volume."
                })
            if not 0 < image.size <= settings.AI_INFERENCE_MAX_MRI_FILE_BYTES:
                raise serializers.ValidationError({
                    modality: "MRI file is empty or exceeds the upload limit."
                })
        return attrs
