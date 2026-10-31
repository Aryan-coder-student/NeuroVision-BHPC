"""Research contribution metadata with mandatory de-identification attestation."""
from rest_framework import serializers
from .models import DatasetContribution


class DatasetContributionReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetContribution
        fields = (
            "id", "title", "modality", "origin", "description", "license_info",
            "source_url", "sample_count", "format", "file_count", "total_bytes",
            "status", "review_note", "created_at",
        )
        read_only_fields = fields


class DatasetContributionWriteSerializer(serializers.ModelSerializer):
    no_phi_attestation = serializers.BooleanField(write_only=True, required=True)

    class Meta:
        model = DatasetContribution
        fields = (
            "title", "modality", "origin", "description", "license_info",
            "source_url", "sample_count", "no_phi_attestation",
        )

    def validate_no_phi_attestation(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Confirm that all uploaded scans and metadata are de-identified, with no PHI."
            )
        return value

    def validate_sample_count(self, value):
        if not 1 <= value <= 10000000:
            raise serializers.ValidationError("Enter a sample count between 1 and 10,000,000.")
        return value
