"""Read-only report summaries and snapshot submission validation."""
from rest_framework import serializers

from .models import SegmentationReport
from .reports import validate_snapshot_png


class SegmentationReportReadSerializer(serializers.ModelSerializer):
    patient_id = serializers.UUIDField(read_only=True)
    imaging_study_id = serializers.UUIDField(read_only=True, allow_null=True)
    source = serializers.SerializerMethodField()

    class Meta:
        model = SegmentationReport
        fields = (
            "id", "patient_id", "imaging_study_id", "source",
            "model_id", "model_name", "model_version",
            "measurements_cm3", "created_at",
        )
        read_only_fields = fields

    def get_source(self, obj):
        return "ai_inference"


class SegmentationReportSaveSerializer(serializers.Serializer):
    report_token = serializers.CharField()
    snapshot = serializers.FileField()
    imaging_study_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_snapshot(self, image):
        if image.size > 3 * 1024 * 1024:
            raise serializers.ValidationError("Snapshot exceeds the 3 MB limit.")
        if image.content_type != "image/png":
            raise serializers.ValidationError("Only PNG snapshots are supported.")
        validate_snapshot_png(image.read())
        image.seek(0)
        return image
