import uuid

from django.db import models

from .storage import PrivateReportStorage, report_snapshot_upload_to


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
        indexes = [models.Index(fields=["patient", "-created_at"], name="clinical_im_patient_732189_idx")]


class SegmentationReport(models.Model):
    """Tenant-local summary of real model inference, with a static PNG only.

    The original MRI and interactive NIfTI mask are deliberately not retained.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="segmentation_reports",
    )
    imaging_study = models.ForeignKey(
        ImagingStudy, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="segmentation_reports",
    )
    proof_nonce = models.UUIDField(unique=True, editable=False)
    created_by_user_id = models.UUIDField(editable=False)
    model_id = models.CharField(max_length=120)
    model_name = models.CharField(max_length=160)
    model_version = models.CharField(max_length=80)
    measurements_cm3 = models.JSONField(default=dict)
    snapshot_image = models.FileField(
        upload_to=report_snapshot_upload_to,
        storage=PrivateReportStorage(),
        max_length=512,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "-created_at"], name="clinical_re_patient_6394aa_idx"),
        ]


class DatasetContribution(models.Model):
    """Tenant-local review request only. No scan bytes, files or PHI are accepted."""

    class Origin(models.TextChoices):
        PUBLIC = "public", "Public dataset"
        SYNTHETIC = "synthetic", "Synthetic research data"
        DEIDENTIFIED = "deidentified", "De-identified research data"

    class Status(models.TextChoices):
        PENDING = "pending_review", "Pending review"
        APPROVED = "metadata_approved", "Metadata reviewed"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submitted_by_user_id = models.UUIDField(editable=False)
    title = models.CharField(max_length=160)
    modality = models.CharField(max_length=32, choices=[
        ("mri_t1", "MRI T1"), ("mri_t1ce", "MRI T1CE"),
        ("mri_t2", "MRI T2"), ("mri_flair", "MRI FLAIR"),
        ("multi_modal", "Multiple MRI modalities"), ("other", "Other"),
    ])
    origin = models.CharField(max_length=20, choices=Origin.choices)
    description = models.TextField(max_length=1000)
    license_info = models.CharField(max_length=160)
    source_url = models.URLField(max_length=500, blank=True)
    sample_count = models.PositiveIntegerField(default=1)
    no_phi_attestation = models.BooleanField(default=False, editable=False)
    status = models.CharField(
        max_length=24, choices=Status.choices, default=Status.PENDING
    )
    review_note = models.TextField(blank=True, max_length=1000)
    reviewed_by_user_id = models.UUIDField(null=True, blank=True, editable=False)
    reviewed_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
