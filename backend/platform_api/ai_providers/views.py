import logging

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from clinical.models import Patient
from clinical.reports import create_inference_report_token
from tenant.permissions import HasVerifiedTenantMembership

from .catalog import SUPPORTED_CAPABILITIES
from .exceptions import (
    ModelNotFound,
    ProviderNotConfigured,
    ProviderProtocolError,
    ProviderRejectedRequest,
    ProviderTimeout,
    ProviderUnavailable,
)
from .registry import get_provider_registry


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


class PatientInferenceView(TenantInferenceView):
    """One authenticated HTTP lifecycle for task-specific capability views."""

    serializer_class = None
    registry_method = None

    def build_request(self, validated_data):
        raise NotImplementedError

    def post(self, request, patient_id):
        patient = self.get_patient(patient_id)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        model_id = serializer.validated_data["model_id"]
        try:
            runner = getattr(get_provider_registry(), self.registry_method)
            result = runner(model_id, self.build_request(serializer.validated_data))
        except tuple(PROVIDER_ERROR_STATUSES) as error:
            return _provider_error_response(
                error, patient_id=patient.id, model_id=model_id
            )
        response = _inference_response(patient, result)
        # Only successful real segmentation masks receive a signed, short-lived
        # report proof. A demo, VQA response or provider failure gets none.
        if (
            self.registry_method == "run_segmentation"
            and isinstance(result.payload, dict)
            and result.payload.get("mask_nifti_base64")
        ):
            response.data["report_token"] = create_inference_report_token(
                patient_id=patient.id, workspace_id=request.tenant.id,
                actor_id=request.user.id,
                model=result.model.as_public_dict(),
                measurements=result.payload.get("region_volumes_cm3"),
            )
        return response
