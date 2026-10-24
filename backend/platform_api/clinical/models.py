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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
