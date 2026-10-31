"""Shared four-modality upload validation for imaging intake and AI inference."""
import re

from django.conf import settings
from rest_framework import serializers

MRI_MODALITIES = ("t1", "t1ce", "t2", "flair")


class MRIUploadSerializer(serializers.Serializer):
    t1 = serializers.FileField()
    t1ce = serializers.FileField()
    t2 = serializers.FileField()
    flair = serializers.FileField()

    def validate(self, attrs):
        for modality in MRI_MODALITIES:
            image = attrs[modality]
            if not re.search(
                r"(?:^|[_-])" + modality + r"\.nii(?:\.gz)?$",
                image.name,
                flags=re.IGNORECASE,
            ):
                raise serializers.ValidationError({
                    modality: f"Expected a filename ending in _{modality}.nii or _{modality}.nii.gz."
                })
            if not 0 < image.size <= settings.AI_INFERENCE_MAX_MRI_FILE_BYTES:
                raise serializers.ValidationError({
                    modality: "MRI file is empty or exceeds the upload limit."
                })
        return attrs
