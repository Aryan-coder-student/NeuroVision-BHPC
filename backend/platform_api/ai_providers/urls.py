from django.urls import path

from .views import ModelCatalogView
from .segmentation.views import SegmentationInferenceView
from .vqa.views import VQAInferenceView


urlpatterns = [
    path("models/", ModelCatalogView.as_view(), name="tenant-model-catalog"),
    path(
        "patients/<uuid:patient_id>/inference/segmentation/",
        SegmentationInferenceView.as_view(),
        name="tenant-patient-segmentation",
    ),
    path(
        "patients/<uuid:patient_id>/inference/vqa/",
        VQAInferenceView.as_view(),
        name="tenant-patient-vqa",
    ),
]
