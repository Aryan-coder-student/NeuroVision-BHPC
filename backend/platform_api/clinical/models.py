import uuid

from django.db import models


def generate_patient_code():
    """Opaque, non-sequential public identifier. The UUID remains the primary key."""
    return f"NV-{uuid.uuid4().hex[:20].upper()}"


class Patient(models.Model):
    """Patient record stored only in the currently selected tenant schema."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_code = models.CharField(
        max_length=64, unique=True, default=generate_patient_code, editable=False
    )
    display_name = models.CharField(max_length=160)
    # Nullable for existing records; required by the registration API for new records.
    date_of_birth = models.DateField(null=True, blank=True)
    global_identity_id = models.UUIDField(null=True, blank=True, editable=False)
    version = models.PositiveBigIntegerField(default=1, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class AppendOnlyAuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise TypeError("Patient demographic audit records are append-only.")

    def delete(self):
        raise TypeError("Patient demographic audit records are append-only.")


class PatientDemographicChange(models.Model):
    """Tenant-scoped, append-only record of a demographic correction."""

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="demographic_changes",
    )
    actor_user_id = models.UUIDField(editable=False)
    actor_username = models.CharField(max_length=150, editable=False)
    changed_fields = models.JSONField(editable=False)
    from_version = models.PositiveBigIntegerField(editable=False)
    to_version = models.PositiveBigIntegerField(editable=False)
    previous_display_name = models.CharField(max_length=160, editable=False)
    new_display_name = models.CharField(max_length=160, editable=False)
    previous_date_of_birth = models.DateField(null=True, editable=False)
    new_date_of_birth = models.DateField(null=True, editable=False)
    changed_at = models.DateTimeField(auto_now_add=True, editable=False)

    objects = AppendOnlyAuditQuerySet.as_manager()

    class Meta:
        ordering = ["-changed_at"]
        indexes = [models.Index(fields=["patient", "-changed_at"])]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise TypeError("Patient demographic audit records are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise TypeError("Patient demographic audit records are append-only.")


class ImagingStudy(models.Model):
    """Validated MRI upload metadata, never the original scans or segmentation masks."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="imaging_studies"
    )
    created_by_user_id = models.UUIDField(editable=False)
    modality_sizes_bytes = models.JSONField(default=dict, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["patient", "-created_at"])]
