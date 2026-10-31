from django.urls import path
from .contribution_views import DatasetContributionDetailView, DatasetContributionListCreateView

urlpatterns = [
    path("contributions/", DatasetContributionListCreateView.as_view(), name="tenant-contribution-list"),
    path("contributions/<uuid:pk>/", DatasetContributionDetailView.as_view(), name="tenant-contribution-detail"),
]
