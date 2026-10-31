from rest_framework import generics, permissions, status
from rest_framework.response import Response

from tenant.permissions import HasVerifiedTenantMembership
from .contribution_views import ContributionPagination
from .models import ModelFeedbackRecord
from .feedback_serializers import (
    ModelFeedbackReadSerializer, ModelFeedbackWriteSerializer,
)


class ModelFeedbackListCreateView(generics.ListCreateAPIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
    serializer_class = ModelFeedbackReadSerializer
    pagination_class = ContributionPagination

    def get_queryset(self):
        return ModelFeedbackRecord.objects.filter(
            submitted_by_user_id=self.request.user.pk
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        write = ModelFeedbackWriteSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        item = write.save(submitted_by_user_id=request.user.pk)
        return Response(
            ModelFeedbackReadSerializer(item).data, status=status.HTTP_201_CREATED,
        )


class ModelFeedbackDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated, HasVerifiedTenantMembership)
    serializer_class = ModelFeedbackReadSerializer

    def get_queryset(self):
        return ModelFeedbackRecord.objects.filter(
            submitted_by_user_id=self.request.user.pk
        )
