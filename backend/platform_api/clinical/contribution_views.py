"""Authenticated uploads into private Hugging Face S3 storage; no public file URLs."""
import logging

from django.conf import settings
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError, APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from tenant.permissions import HasVerifiedTenantMembership
from .models import DatasetContribution, DatasetContributionFile
from .contribution_upload import validate_contribution_files
from .contribution_serializers import (
    DatasetContributionReadSerializer, DatasetContributionWriteSerializer,
)

logger = logging.getLogger(__name__)


class StorageUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Private research upload storage is not configured or unavailable."


class ContributionPagination(PageNumberPagination):
    page_size = 25
    max_page_size = 100
    page_size_query_param = "page_size"


class DatasetContributionListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
    serializer_class = DatasetContributionReadSerializer
    pagination_class = ContributionPagination
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return DatasetContribution.objects.filter(
            submitted_by_user_id=self.request.user.pk
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if settings.NEUROVISION_REPORT_STORAGE != "huggingface":
            raise StorageUnavailable(
                "MRI contributions require the private Hugging Face bucket. "
                "Set NEUROVISION_REPORT_STORAGE=huggingface on the backend."
            )
        write = DatasetContributionWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        kind, checked = validate_contribution_files(request.FILES)
        data = write.validated_data.copy()
        # Unknown uploaded fields are rejected in validate_contribution_files.
        uploaded_names = []
        try:
            with transaction.atomic():
                contribution = DatasetContribution.objects.create(
                    **data,
                    submitted_by_user_id=request.user.pk,
                    format=kind,
                    file_count=len(checked),
                    total_bytes=sum(file.size for _, file in checked),
                )
                for modality, uploaded in checked:
                    record = DatasetContributionFile(
                        contribution=contribution,
                        modality=modality,
                        byte_size=uploaded.size,
                    )
                    # Store the original suffix for the key; never store original filename.
                    ext = ".zip" if kind == "dicom_zip" else (
                        ".nii.gz" if uploaded.name.lower().endswith(".nii.gz") else ".nii"
                    )
                    safe_name = f"{modality}{ext}"
                    record.object_file.save(safe_name, uploaded, save=False)
                    uploaded_names.append((record.object_file.storage, record.object_file.name))
                    record.save()
        except (OSError, ValueError, RuntimeError, Exception) as error:
            # Roll back any already-uploaded objects if another upload or DB write fails.
            for storage, key in uploaded_names:
                try:
                    storage.delete(key)
                except Exception:
                    logger.exception("Could not remove a partial private contribution upload")
            logger.exception("Research contribution upload failed")
            raise StorageUnavailable() from error
        return Response(
            DatasetContributionReadSerializer(contribution).data,
            status=status.HTTP_201_CREATED,
        )


class DatasetContributionDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
    serializer_class = DatasetContributionReadSerializer

    def get_queryset(self):
        return DatasetContribution.objects.filter(
            submitted_by_user_id=self.request.user.pk
        )
