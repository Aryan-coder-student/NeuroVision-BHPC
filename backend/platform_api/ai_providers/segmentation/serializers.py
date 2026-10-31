"""Inference requires the same validated four NIfTI uploads plus a model ID."""
from rest_framework import serializers

from clinical.mri import MRI_MODALITIES, MRIUploadSerializer


class SegmentationInferenceSerializer(MRIUploadSerializer):
    model_id = serializers.CharField(max_length=120)
