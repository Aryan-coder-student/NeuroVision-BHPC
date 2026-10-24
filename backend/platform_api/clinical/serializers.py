from rest_framework import serializers

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ("id", "patient_code", "display_name", "global_identity_id", "created_at", "updated_at")
        read_only_fields = ("id", "global_identity_id", "created_at", "updated_at")


class PatientGrantRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PatientGrantVerifySerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    otp = serializers.RegexField(r"^\d{6}$", max_length=6, min_length=6)
