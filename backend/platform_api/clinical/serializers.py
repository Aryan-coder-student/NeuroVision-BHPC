from calendar import monthrange
from datetime import date

from rest_framework import serializers

from .dates import patient_calendar_date
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
        today = patient_calendar_date()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class PatientWriteSerializer(serializers.ModelSerializer):
    immutable_fields = frozenset({
        "id", "patient_code", "global_identity_id", "email",
        "created_at", "updated_at",
    })

    class Meta:
        model = Patient
        fields = ("display_name", "date_of_birth")

    def validate_date_of_birth(self, value: date | None):
        if value is None:
            raise serializers.ValidationError("Date of birth cannot be null.")
        today = patient_calendar_date()
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
        attempted_fields = self.immutable_fields.intersection(self.initial_data)
        if attempted_fields:
            errors = {
                field: (
                    "Use the identity verification endpoint to change email."
                    if field == "email"
                    else "This patient identity field cannot be changed."
                )
                for field in sorted(attempted_fields)
            }
            raise serializers.ValidationError(errors)
        return attrs


class PatientRegistrationSerializer(PatientWriteSerializer):
    # Email belongs to the encrypted public-schema identity registry, not the tenant record.
    immutable_fields = PatientWriteSerializer.immutable_fields - {"email"}
    email = serializers.EmailField(write_only=True, required=True)

    class Meta(PatientWriteSerializer.Meta):
        fields = (*PatientWriteSerializer.Meta.fields, "email")
        extra_kwargs = {
            "display_name": {"required": True, "allow_blank": False},
            "date_of_birth": {"required": True, "allow_null": False},
        }

class PatientGrantRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PatientGrantVerifySerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    otp = serializers.RegexField(r"^\d{6}$", max_length=6, min_length=6)
