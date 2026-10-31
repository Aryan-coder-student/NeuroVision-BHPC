import logging

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from clinical.models import Patient
from tenant.permissions import HasVerifiedTenantMembership

from .catalog import SUPPORTED_CAPABILITIES
from .contracts import SegmentationRequest, VQARequest
from .exceptions import (
    ModelNotFound,
    ProviderNotConfigured,
    ProviderProtocolError,
    ProviderRejectedRequest,
    ProviderTimeout,
    ProviderUnavailable,
)
from .registry import get_provider_registry
from .serializers import SegmentationInferenceSerializer, VQAInferenceSerializer


PROVIDER_ERROR_STATUSES = {
    ModelNotFound: status.HTTP_400_BAD_REQUEST,
    ProviderNotConfigured: status.HTTP_503_SERVICE_UNAVAILABLE,
    ProviderRejectedRequest: status.HTTP_422_UNPROCESSABLE_ENTITY,
    ProviderTimeout: status.HTTP_504_GATEWAY_TIMEOUT,
    ProviderUnavailable: status.HTTP_503_SERVICE_UNAVAILABLE,
    ProviderProtocolError: status.HTTP_502_BAD_GATEWAY,
}
logger = logging.getLogger(__name__)


def _provider_error_response(error, *, patient_id, model_id):
    logger.warning(
        "AI provider request failed: %s",
        error.code,
        extra={"patient_id": str(patient_id), "model_id": model_id},
        exc_info=error.__cause__ is not None,
    )
    return Response(
        {"code": error.code, "detail": error.public_message},
        status=PROVIDER_ERROR_STATUSES[type(error)],
    )


def _inference_response(patient, inference_result):
    return Response(
        {
            "patient_id": str(patient.id),
            "model": inference_result.model.as_public_dict(),
            "result": inference_result.payload,
        }
    )


class TenantInferenceView(APIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)

    @staticmethod
    def get_patient(patient_id):
        return get_object_or_404(Patient, id=patient_id)


class ModelCatalogView(TenantInferenceView):
    def get(self, request):
        capability = request.query_params.get("capability")
        capability = capability.lower() if capability else None
        if capability and capability not in SUPPORTED_CAPABILITIES:
            return Response(
                {"capability": ["Unsupported model capability."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        models = get_provider_registry().catalog(capability=capability)
        return Response({"results": [model.as_public_dict() for model in models]})


class SegmentationInferenceView(TenantInferenceView):
    def post(self, request, patient_id):
        patient = self.get_patient(patient_id)
        serializer = SegmentationInferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = get_provider_registry().run_segmentation(
                serializer.validated_data["model_id"],
                SegmentationRequest(
                    study_reference=serializer.validated_data["study_reference"]
                ),
            )
        except tuple(PROVIDER_ERROR_STATUSES) as error:
            return _provider_error_response(
                error,
                patient_id=patient.id,
                model_id=serializer.validated_data["model_id"],
            )
        return _inference_response(patient, result)


class VQAInferenceView(TenantInferenceView):
    def post(self, request, patient_id):
        patient = self.get_patient(patient_id)
        serializer = VQAInferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = serializer.validated_data.get("image")
        try:
            result = get_provider_registry().run_vqa(
                serializer.validated_data["model_id"],
                VQARequest(
                    question=serializer.validated_data["question"],
                    image_name=image.name if image else None,
                    image_bytes=image.read() if image else None,
                    image_content_type=image.content_type if image else None,
                ),
            )
        except tuple(PROVIDER_ERROR_STATUSES) as error:
            return _provider_error_response(
                error,
                patient_id=patient.id,
                model_id=serializer.validated_data["model_id"],
            )
        return _inference_response(patient, result)
