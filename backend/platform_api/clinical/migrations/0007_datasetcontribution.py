import uuid
from django.db import migrations, models
import django.db.models.deletion
from clinical.contribution_storage import contribution_upload_to
from clinical.storage import PrivateReportStorage


class Migration(migrations.Migration):
    dependencies = [("clinical", "0006_segmentationreport")]

    operations = [
        migrations.CreateModel(
            name="DatasetContribution",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, default=uuid.uuid4, editable=False)),
                ("submitted_by_user_id", models.UUIDField(editable=False)),
                ("title", models.CharField(max_length=160)),
                ("modality", models.CharField(max_length=32, choices=[
                    ("mri_t1", "MRI T1"), ("mri_t1ce", "MRI T1CE"),
                    ("mri_t2", "MRI T2"), ("mri_flair", "MRI FLAIR"),
                    ("multi_modal", "Multiple MRI modalities"), ("other", "Other"),
                ])),
                ("origin", models.CharField(max_length=20, choices=[
                    ("public", "Public dataset"), ("synthetic", "Synthetic research data"),
                    ("deidentified", "De-identified research data"),
                ])),
                ("description", models.TextField(max_length=1000)),
                ("license_info", models.CharField(max_length=160)),
                ("source_url", models.URLField(max_length=500, blank=True)),
                ("sample_count", models.PositiveIntegerField(default=1)),
                ("no_phi_attestation", models.BooleanField(default=False, editable=False)),
                ("format", models.CharField(max_length=16, choices=[
                    ("nifti", "Four NIfTI volumes"), ("dicom_zip", "DICOM ZIP archive"),
                ])),
                ("file_count", models.PositiveSmallIntegerField(default=0, editable=False)),
                ("total_bytes", models.PositiveBigIntegerField(default=0, editable=False)),
                ("status", models.CharField(max_length=24, choices=[
                    ("uploaded", "Uploaded"), ("approved", "Approved for research"),
                    ("rejected", "Rejected"),
                ], default="uploaded")),
                ("review_note", models.TextField(blank=True, max_length=1000)),
                ("reviewed_by_user_id", models.UUIDField(null=True, blank=True, editable=False)),
                ("reviewed_at", models.DateTimeField(null=True, blank=True, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="DatasetContributionFile",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, default=uuid.uuid4, editable=False)),
                ("modality", models.CharField(max_length=24)),
                ("byte_size", models.PositiveBigIntegerField(editable=False)),
                ("object_file", models.FileField(
                    upload_to=contribution_upload_to, storage=PrivateReportStorage(),
                    max_length=512, editable=False,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contribution", models.ForeignKey(
                    to="clinical.datasetcontribution", related_name="uploads",
                    on_delete=django.db.models.deletion.CASCADE,
                )),
            ],
            options={"ordering": ["modality"]},
        ),
        migrations.AddConstraint(
            model_name="datasetcontributionfile",
            constraint=models.UniqueConstraint(
                fields=("contribution", "modality"), name="unique_contribution_modality",
            ),
        ),
    ]
