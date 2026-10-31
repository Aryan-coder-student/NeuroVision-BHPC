from django.conf import settings
from rest_framework import serializers


class VQAInferenceSerializer(serializers.Serializer):
    model_id = serializers.CharField(max_length=120)
    question = serializers.CharField(max_length=2000, trim_whitespace=True)
    image = serializers.FileField(required=False, allow_null=True)

    def validate_image(self, image):
        if image is None:
            return image
        if image.size > settings.AI_INFERENCE_MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Image exceeds the configured size limit.")
        if image.content_type not in {"image/jpeg", "image/png"}:
            raise serializers.ValidationError("Only JPEG and PNG images are supported.")
        return image
