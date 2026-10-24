from calendar import monthrange
from datetime import date

from django.utils import timezone
from rest_framework import serializers

from .models import Patient


class PatientReadSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id", "patient_code", "display_name", "date_of_birth", "age",
            "global_identity_id", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "patient_code", "age", "global_identity_id",
            "created_at", "updated_at",
        )

    def get_age(self, obj):
        dob = obj.date_of_birth
        if dob is None:
            return None
        today = timezone.localdate()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class PatientWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ("display_name", "date_of_birth")

    def validate_date_of_birth(self, value: date | None):
        if value is None:
            raise serializers.ValidationError("Date of birth cannot be null.")
        today = timezone.localdate()
        if value > today:
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        oldest_allowed = date(
            today.year - 130,
            today.month,
            min(today.day, monthrange(today.year - 130, today.month)[1]),
        )
        if value < oldest_allowed:
            raise serializers.ValidationError("Enter a valid date of birth.")
        return value

    def validate(self, attrs):
        if "patient_code" in self.initial_data:
            raise serializers.ValidationError(
                {"patient_code": "Patient IDs are generated automatically."}
            )

        if "email" in self.initial_data:
            raise serializers.ValidationError(
                {"email": "Use the identity verification endpoint to change email."}
            )
        return attrs


class PatientRegistrationSerializer(PatientWriteSerializer):
    # Email belongs to the encrypted public-schema identity registry, not the tenant record.
    email = serializers.EmailField(write_only=True, required=True)

    class Meta(PatientWriteSerializer.Meta):
        fields = (*PatientWriteSerializer.Meta.fields, "email")
        extra_kwargs = {
            "display_name": {"required": True, "allow_blank": False},
            "date_of_birth": {"required": True, "allow_null": False},
        }

    def validate(self, attrs):
        if "patient_code" in self.initial_data:
            raise serializers.ValidationError(
                {"patient_code": "Patient IDs are generated automatically."}
            )
        return attrs


class PatientGrantRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PatientGrantVerifySerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    otp = serializers.RegexField(r"^\d{6}$", max_length=6, min_length=6)
