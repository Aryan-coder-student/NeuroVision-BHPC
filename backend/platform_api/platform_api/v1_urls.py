from django.urls import path, include

urlpatterns = [
    path('auth/', include('users.auth.urls')),
    path('workspaces/', include('tenant.urls')),
]
