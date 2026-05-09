from django.contrib import admin
from django.urls import path, include
from .views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("platform_api.v1_urls")),
    path("health/", health_check),
]
