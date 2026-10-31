"""Validated, tenant-scoped model feedback with optional verified report linking."""
from rest_framework import serializers

from ai_providers.registry import get_provider_registry
from .models import ModelFeedbackRecord, SegmentationReport


class ModelFeedbackReadSerializer(serializers.ModelSerializer):
    report_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ModelFeedbackRecord
        fields = (
            "id", "model_id", "model_name", "category", "description",
            "report_id", "status", "reviewer_note", "created_at",
        )
        read_only_fields = fields


class ModelFeedbackWriteSerializer(serializers.ModelSerializer):
    report_id = serializers.UUIDField(required=False, allow_null=True)
    no_phi_attestation = serializers.BooleanField(write_only=True, required=True)

    class Meta:
        model = ModelFeedbackRecord
        fields = (
            "model_id", "category", "description", "report_id", "no_phi_attestation",
        )

    def validate_no_phi_attestation(self, value):
        if not value:
            raise serializers.ValidationError(
                "Feedback must not contain patient identifiers or protected health information."
            )
        return value

    def validate(self, attrs):
        models = {model.id: model for model in get_provider_registry().catalog()}
        model_id = attrs["model_id"]
        category = attrs["category"]
        if model_id == "platform":
            if category not in {ModelFeedbackRecord.Category.FEATURE, ModelFeedbackRecord.Category.UI}:
                raise serializers.ValidationError({
                    "category": "Choose a model for prediction or VQA errors."
                })
            model_name = "NeuroVision Platform"
        elif model_id in models:
            model = models[model_id]
            model_name = model.name
            if category in {
                ModelFeedbackRecord.Category.FALSE_POSITIVE,
                ModelFeedbackRecord.Category.FALSE_NEGATIVE,
            } and model.capability != "segmentation":
                raise serializers.ValidationError({
                    "category": "False-positive/negative feedback requires a segmentation model."
                })
            if category == ModelFeedbackRecord.Category.HALLUCINATION and model.capability != "vqa":
                raise serializers.ValidationError({
                    "category": "VQA answer feedback requires a VQA model."
                })
        else:
            raise serializers.ValidationError({"model_id": "Select a recognized model."})

        report_id = attrs.pop("report_id", None)
        if report_id:
            try:
                report = SegmentationReport.objects.get(pk=report_id)
            except SegmentationReport.DoesNotExist as error:
                raise serializers.ValidationError({
                    "report_id": "Report not found in this workspace."
                }) from error
            if model_id != report.model_id:
                raise serializers.ValidationError({
                    "report_id": "Selected report does not match the model."
                })
            attrs["report"] = report
        attrs["model_name"] = model_name
        return attrs
