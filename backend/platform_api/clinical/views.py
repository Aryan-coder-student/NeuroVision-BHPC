from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import InstitutionMembership

from .models import Patient
from patient_identity.services import (
    IdentityAlreadyLinkedError,
    GrantRateLimitedError,
    get_grant_status,
    start_email_grant,
    verify_email_grant,
)

from .serializers import PatientGrantRequestSerializer, PatientGrantVerifySerializer, PatientSerializer


class VerifiedTenantMembership(permissions.BasePermission):
    """Require membership established by tenant middleware, including for reads."""

    def has_permission(self, request, view):
        membership = getattr(request._request, "tenant_membership", None)
        if membership is None or membership.institution_id != request.tenant.id:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return membership.role == InstitutionMembership.Role.ADMIN


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = (permissions.IsAuthenticated, VerifiedTenantMembership)
    queryset = Patient.objects.all()

    @action(detail=True, methods=("get",), url_path="identity-grant")
    def identity_grant(self, request, pk=None):
        patient = self.get_object()
        return Response(get_grant_status(patient=patient, institution=request.tenant))

    @action(detail=True, methods=("post",), url_path="identity-grant/request")
    def request_identity_grant(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientGrantRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            challenge, masked_email = start_email_grant(
                patient=patient,
                institution=request.tenant,
                requested_by=request.user,
                email=serializer.validated_data["email"],
            )
        except IdentityAlreadyLinkedError:
            return Response(
                {"detail": "This patient already has a verified identity."},
                status=status.HTTP_409_CONFLICT,
            )
        except GrantRateLimitedError:
            return Response(
                {"detail": "A verification code was sent recently. Wait before requesting another."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except RuntimeError:
            return Response(
                {"detail": "Verification code could not be sent. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "challenge_id": challenge.id,
                "masked_email": masked_email,
                "expires_in_seconds": 600,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=("post",), url_path="identity-grant/verify")
    def verify_identity_grant(self, request, pk=None):
        patient = self.get_object()
        serializer = PatientGrantVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grant = verify_email_grant(
            patient=patient,
            institution=request.tenant,
            challenge_id=serializer.validated_data["challenge_id"],
            code=serializer.validated_data["otp"],
        )
        if grant is None:
            return Response(
                {"detail": "The verification code is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"status": grant.status, "verified_at": grant.verified_at})
