from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from tenant.permissions import HasVerifiedTenantMembership
from .models import DatasetContribution
from .contribution_serializers import (
    DatasetContributionReadSerializer, DatasetContributionWriteSerializer,
)


class ContributionPagination(PageNumberPagination):
    page_size = 25
    max_page_size = 100
    page_size_query_param = "page_size"


class DatasetContributionListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
    serializer_class = DatasetContributionReadSerializer
    pagination_class = ContributionPagination

    def get_queryset(self):
        return DatasetContribution.objects.filter(
            submitted_by_user_id=self.request.user.pk
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if request.FILES:
            raise ValidationError({"file": "File ingestion is disabled. Submit dataset metadata only."})
        write = DatasetContributionWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        contribution = write.save(submitted_by_user_id=request.user.pk)
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
