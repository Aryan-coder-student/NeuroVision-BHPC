"""Resolve shared-domain tenant API requests after authenticating membership.

The public schema remains the entry point for authentication and workspace listings.
Only tenant-scoped paths may carry X-Workspace-ID.
"""
from uuid import UUID

from django.db import connection
from django.http import JsonResponse
from django_tenants.middleware.main import TenantMainMiddleware
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from users.models import InstitutionMembership


class WorkspaceTenantMiddleware(TenantMainMiddleware):
    TENANT_PATHS = ("/api/v1/workspaces/current/",)

    def process_request(self, request):
        # Resolve hostname normally first (including existing custom tenant domains).
        super().process_request(request)

        if request.path not in self.TENANT_PATHS:
            return None

        workspace_id = request.headers.get("X-Workspace-ID")
        if not workspace_id:
            return None  # Legacy domain-scoped tenant routing.

        try:
            workspace_id = UUID(workspace_id)
        except (ValueError, AttributeError):
            return JsonResponse({"detail": "Invalid workspace ID."}, status=400)

        jwt = JWTAuthentication()
        authorization = jwt.get_header(request)
        raw_token = jwt.get_raw_token(authorization) if authorization else request.COOKIES.get("access_token")
        if not raw_token:
            return JsonResponse({"detail": "Authentication required."}, status=401)

        try:
            user = jwt.get_user(jwt.get_validated_token(raw_token))
        except (InvalidToken, TokenError):
            return JsonResponse({"detail": "Invalid or expired session."}, status=401)

        # Membership is checked in the public schema before switching search_path.
        membership = InstitutionMembership.objects.filter(
            user=user, institution_id=workspace_id, is_active=True
        ).select_related("institution").first()
        if membership is None:
            return JsonResponse({"detail": "Workspace not found."}, status=404)

        tenant = membership.institution
        connection.set_tenant(tenant)
        request.tenant = tenant
        return None
