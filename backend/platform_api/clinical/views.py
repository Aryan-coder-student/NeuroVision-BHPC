from uuid import UUID

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from users.models import InstitutionMembership
from tenant.permissions import HasVerifiedTenantMembership, verified_tenant_membership

from .models import ImagingStudy, Patient
from .services import (
    PatientVersionConflict,
    correct_patient_demographics,
    delete_patient,
    register_patient,
)
from patient_identity.services import (
    CHALLENGE_TTL,
    IdentityAlreadyLinkedError,
    GrantRateLimitedError,
    get_grant_status,
    start_email_grant,
    verify_email_grant,
)

from .mri import MRI_MODALITIES, MRIUploadSerializer
from .serializers import (
    ImagingStudyReadSerializer,
    PatientGrantRequestSerializer,
    PatientGrantVerifySerializer,
    PatientReadSerializer,
    PatientRegistrationSerializer,
    PatientWriteSerializer,
)


class PatientPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class VerifiedTenantMembership(HasVerifiedTenantMembership):
    """Require membership established by tenant middleware, including for reads."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        membership = verified_tenant_membership(request)
        return membership.role == InstitutionMembership.Role.ADMIN


class PatientViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated, VerifiedTenantMembership)
    queryset = Patient.objects.all()
    pagination_class = PatientPagination

    def get_serializer_class(self):
        if self.action == "create":
            return PatientRegistrationSerializer
        if self.action in ("update", "partial_update"):
            return PatientWriteSerializer
        return PatientReadSerializer

    def create(self, request, *args, **kwargs):
        """Register a patient and send OTP before returning its generated ID."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            patient, challenge, masked_email = register_patient(
                institution=request.tenant,
                requested_by=request.user,
                **serializer.validated_data,
            )
        except RuntimeError:
            return Response(
                {"detail": "Verification email could not be sent. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        data = PatientReadSerializer(patient, context=self.get_serializer_context()).data
        data["identity_verification"] = {
            "status": "PENDING",
            "challenge_id": str(challenge.id),
            "masked_email": masked_email,
            "expires_in_seconds": int(CHALLENGE_TTL.total_seconds()),
        }
        return Response(data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Atomically correct demographics unless the submitted version is stale."""
        partial = kwargs.pop("partial", False)
        patient = self.get_object()
        serializer = self.get_serializer(patient, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        changes = dict(serializer.validated_data)
        expected_version = changes.pop("version")
        try:
            patient = correct_patient_demographics(
                patient=patient,
                expected_version=expected_version,
                actor=request.user,
                changes=changes,
            )
        except PatientVersionConflict as conflict:
            current = PatientReadSerializer(
                conflict.current_patient,
                context=self.get_serializer_context(),
            ).data
            return Response(
                {
                    "code": "patient_version_conflict",
                    "detail": "This patient was updated by another administrator.",
                    "current": current,
                },
                status=status.HTTP_409_CONFLICT,
            )
        data = PatientReadSerializer(
            patient,
            context=self.get_serializer_context(),
        ).data
        return Response(data)

    @action(detail=True, methods=("get", "post"), url_path="imaging-studies")
    def imaging_studies(self, request, pk=None):
        """Validate four uploads and retain metadata only; admins write, members read."""
        patient = self.get_object()
        if request.method == "GET":
            page = self.paginate_queryset(patient.imaging_studies.all())
            if page is not None:
                data = ImagingStudyReadSerializer(page, many=True).data
                return self.get_paginated_response(data)
            return Response(ImagingStudyReadSerializer(
                patient.imaging_studies.all(), many=True
            ).data)

        serializer = MRIUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        study = ImagingStudy.objects.create(
            patient=patient,
            created_by_user_id=request.user.id,
            modality_sizes_bytes={
                modality: serializer.validated_data[modality].size
                for modality in MRI_MODALITIES
            },
        )
        return Response(
            ImagingStudyReadSerializer(study).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=("get",),
        url_path=r"imaging-studies/(?P<study_id>[0-9a-f-]{36})",
    )
    def imaging_study_detail(self, request, pk=None, study_id=None):
        patient = self.get_object()
        try:
            normalized_study_id = UUID(study_id)
        except (AttributeError, TypeError, ValueError) as error:
            raise NotFound("Imaging study not found.") from error
        study = get_object_or_404(patient.imaging_studies, pk=normalized_study_id)
        return Response(ImagingStudyReadSerializer(study).data)

    def perform_destroy(self, instance):
        delete_patient(patient=instance, institution=self.request.tenant)

    @action(detail=True, methods=("get",), url_path="identity-grant")
    def identity_grant(self, request, pk=None):
        patient = self.get_object()
        return Response(get_grant_status(patient=patient, institution=request.tenant))

    @action(detail=True, methods=("post",), url_path="identity-grant/request")
    def request_identity_grant(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientGrantRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            challenge, masked_email = start_email_grant(
                patient=patient,
                institution=request.tenant,
                requested_by=request.user,
                email=serializer.validated_data["email"],
            )
        except IdentityAlreadyLinkedError:
            return Response(
                {"detail": "This patient already has a verified identity."},
                status=status.HTTP_409_CONFLICT,
            )
        except GrantRateLimitedError:
            return Response(
                {"detail": "A verification code was sent recently. Wait before requesting another."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except RuntimeError:
            return Response(
                {"detail": "Verification code could not be sent. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "challenge_id": challenge.id,
                "masked_email": masked_email,
                "expires_in_seconds": 600,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=("post",), url_path="identity-grant/verify")
    def verify_identity_grant(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientGrantVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grant = verify_email_grant(
            patient=patient,
            institution=request.tenant,
            challenge_id=serializer.validated_data["challenge_id"],
            code=serializer.validated_data["otp"],
        )
        if grant is None:
            return Response(
                {"detail": "The verification code is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"status": grant.status, "verified_at": grant.verified_at})
