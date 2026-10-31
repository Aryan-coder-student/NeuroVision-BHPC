from rest_framework import serializers


class SegmentationInferenceSerializer(serializers.Serializer):
    model_id = serializers.CharField(max_length=120)
    study_reference = serializers.CharField(max_length=2048, trim_whitespace=True)

    def validate_study_reference(self, value):
        if "\x00" in value:
            raise serializers.ValidationError("Study reference contains invalid characters.")
        return value
