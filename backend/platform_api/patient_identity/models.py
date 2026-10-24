import uuid

from django.conf import settings
from django.db import models


class PatientIdentity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_ciphertext = models.TextField()
    email_fingerprint = models.CharField(max_length=64, unique=True, db_index=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PatientAccessGrant(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending verification"
        ACTIVE = "ACTIVE", "Active"
        REVOKED = "REVOKED", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    identity = models.ForeignKey(PatientIdentity, on_delete=models.CASCADE, related_name="grants")
    institution = models.ForeignKey("tenant.Institution", on_delete=models.CASCADE, related_name="patient_grants")
    tenant_patient_id = models.UUIDField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_patient_grants")
    requested_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("institution", "tenant_patient_id"), name="unique_tenant_patient_grant")
        ]


class PatientGrantChallenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grant = models.ForeignKey(PatientAccessGrant, on_delete=models.CASCADE, related_name="challenges")
    identity = models.ForeignKey(
        PatientIdentity,
        on_delete=models.CASCADE,
        related_name="grant_challenges",
    )
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
