import re

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
        study_prefix = None
        for modality in MRI_MODALITIES:
            image = attrs[modality]
            if not re.search(r"(?:^|[_-])" + modality + r"\.nii(?:\.gz)?$", image.name, flags=re.IGNORECASE):
                raise serializers.ValidationError({
                    modality: f"Expected a filename ending in _{modality}.nii or _{modality}.nii.gz."
                })
            prefix = re.sub(r"[_-]" + modality + r"\.nii(?:\.gz)?$", "", image.name, flags=re.IGNORECASE).lower()
            if study_prefix is not None and prefix != study_prefix:
                raise serializers.ValidationError({modality: "All four volumes must belong to the same BraTS study."})
            study_prefix = prefix
            if not 0 < image.size <= settings.AI_INFERENCE_MAX_MRI_FILE_BYTES:
                raise serializers.ValidationError({
                    modality: "MRI file is empty or exceeds the upload limit."
                })
        return attrs
