from django.urls import include, path
from tenant.context_views import TenantContextView
from tenant.patient_views import MyPatientsView

urlpatterns = [
    path("auth/", include("users.auth.urls")),
    path("workspaces/", include("tenant.urls")),
    path("my-patients/", MyPatientsView.as_view(), name="my-patients"),
    path("tenant/context/", TenantContextView.as_view(), name="tenant-context"),
    path("tenant/", include("clinical.urls")),
]
