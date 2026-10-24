import uuid

from django.db import models


class Patient(models.Model):
    """Patient record stored only in the currently selected tenant schema."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_code = models.CharField(max_length=64, unique=True)
    display_name = models.CharField(max_length=160)
    global_identity_id = models.UUIDField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
