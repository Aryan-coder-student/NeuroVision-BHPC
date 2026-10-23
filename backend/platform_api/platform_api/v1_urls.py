from django.urls import path, include
from tenant.context_views import TenantContextView

urlpatterns = [
    path("auth/", include("users.auth.urls")),
    path("workspaces/", include("tenant.urls")),
    path("tenant/context/", TenantContextView.as_view(), name="tenant-context"),
]
