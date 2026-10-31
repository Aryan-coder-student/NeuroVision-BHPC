from rest_framework import permissions


def verified_tenant_membership(request):
    membership = getattr(request._request, "tenant_membership", None)
    if membership is None or membership.institution_id != request.tenant.id:
        return None
    return membership if membership.is_active else None


class HasVerifiedTenantMembership(permissions.BasePermission):
    """Require the active membership established by workspace middleware."""

    def has_permission(self, request, view):
        return verified_tenant_membership(request) is not None
