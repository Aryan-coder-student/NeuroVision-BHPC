from django.urls import path
from .feedback_views import ModelFeedbackDetailView, ModelFeedbackListCreateView

urlpatterns = [
    path("model-feedback/", ModelFeedbackListCreateView.as_view(), name="tenant-model-feedback-list"),
    path("model-feedback/<uuid:pk>/", ModelFeedbackDetailView.as_view(), name="tenant-model-feedback-detail"),
]
