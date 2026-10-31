from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PatientViewSet

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="tenant-patients")
urlpatterns = [
    path("", include("clinical.contribution_urls")),
    path("", include("clinical.feedback_urls")),
    *router.urls,
]
