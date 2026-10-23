"""Minimal tenant-scoped API used to verify routing and membership end to end."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class TenantContextView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = getattr(request._request, "tenant_membership", None)
        if membership is None:
            # Tenant-scoped endpoints must never expose data without the
            # membership check performed by WorkspaceTenantMiddleware.
            return Response({"detail": "Workspace membership required."}, status=403)
        tenant = request.tenant
        return Response({
            "id": str(tenant.id),
            "name": tenant.name,
            "schema_name": tenant.schema_name,
            "role": membership.role,
        })
