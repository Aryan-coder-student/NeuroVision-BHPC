from uuid import UUID

from django.db import IntegrityError, transaction
from django.http import FileResponse, Http404

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from tenant.permissions import HasVerifiedTenantMembership

from .models import ImagingStudy, Patient, SegmentationReport
from .report_serializers import SegmentationReportReadSerializer, SegmentationReportSaveSerializer
from .reports import verify_inference_report_token
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


class PatientViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
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
        """Validate four uploads and retain metadata only for the workspace owner."""
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

    @action(detail=True, methods=("get", "post"), url_path="segmentation-reports")
    def segmentation_reports(self, request, pk=None):
        """Saved reports contain verified AI metadata and a static PNG, not scans."""
        patient = self.get_object()
        if request.method == "GET":
            items = patient.segmentation_reports.all()
            page = self.paginate_queryset(items)
            if page is not None:
                return self.get_paginated_response(
                    SegmentationReportReadSerializer(page, many=True).data
                )
            return Response(SegmentationReportReadSerializer(items, many=True).data)

        serializer = SegmentationReportSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        input_data = serializer.validated_data
        proof = verify_inference_report_token(
            input_data["report_token"],
            patient_id=patient.id, workspace_id=request.tenant.id,
            actor_id=request.user.id,
        )
        study = None
        if input_data.get("imaging_study_id"):
            study = get_object_or_404(
                patient.imaging_studies, id=input_data["imaging_study_id"],
            )
        try:
            with transaction.atomic():
                report = SegmentationReport.objects.create(
                    patient=patient,
                    imaging_study=study,
                    proof_nonce=proof["nonce"],
                    created_by_user_id=request.user.id,
                    model_id=proof["model_id"][:120],
                    model_name=proof["model_name"][:160],
                    model_version=proof["model_version"][:80],
                    measurements_cm3=proof["measurements_cm3"],
                    snapshot_image="",
                )
                # Reserve the unique inference nonce in PostgreSQL BEFORE
                # writing a file, so replay requests cannot create new files.
                try:
                    report.snapshot_image.save(
                        "3d-segmentation.png", input_data["snapshot"], save=True,
                    )
                except Exception:
                    # File storage is not transactional. Remove an orphan on
                    # failed write/update, even when the DB transaction rolls back.
                    if report.snapshot_image.name:
                        report.snapshot_image.delete(save=False)
                    raise
        except IntegrityError:
            return Response(
                {"detail": "This inference result has already been saved."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            SegmentationReportReadSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_segmentation_report(self, patient, report_id):
        try:
            report_uuid = UUID(report_id)
        except (TypeError, ValueError) as error:
            raise NotFound("Report not found.") from error
        return get_object_or_404(
            patient.segmentation_reports, id=report_uuid,
        )

    @action(
        detail=True, methods=("get",),
        url_path=r"segmentation-reports/(?P<report_id>[0-9a-f-]{36})",
    )
    def segmentation_report_detail(self, request, pk=None, report_id=None):
        patient = self.get_object()
        report = self._get_segmentation_report(patient, report_id)
        return Response(SegmentationReportReadSerializer(report).data)

    @action(
        detail=True, methods=("get",),
        url_path=r"segmentation-reports/(?P<report_id>[0-9a-f-]{36})/snapshot",
    )
    def segmentation_report_snapshot(self, request, pk=None, report_id=None):
        patient = self.get_object()
        report = self._get_segmentation_report(patient, report_id)
        try:
            if not report.snapshot_image:
                raise Http404("Report image is unavailable.")
            response = FileResponse(
                report.snapshot_image.open("rb"),
                content_type="image/png",
                as_attachment=False,
            )
        except (FileNotFoundError, OSError, ValueError) as error:
            raise Http404("Report image is unavailable.") from error
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response

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
