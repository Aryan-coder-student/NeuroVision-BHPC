from rest_framework import serializers

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ("id", "patient_code", "display_name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
