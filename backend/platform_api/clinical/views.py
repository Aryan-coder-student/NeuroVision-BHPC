from rest_framework import permissions, viewsets

from users.models import InstitutionMembership

from .models import Patient
from .serializers import PatientSerializer


class VerifiedTenantMembership(permissions.BasePermission):
    """Require membership established by tenant middleware, including for reads."""

    def has_permission(self, request, view):
        membership = getattr(request._request, "tenant_membership", None)
        if membership is None or membership.institution_id != request.tenant.id:
            return False
        if view.action in ("list", "retrieve"):
            return True
        return membership.role == InstitutionMembership.Role.ADMIN


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = (permissions.IsAuthenticated, VerifiedTenantMembership)
    queryset = Patient.objects.all()
