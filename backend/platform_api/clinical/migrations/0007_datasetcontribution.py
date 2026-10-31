import uuid
from django.db import migrations, models


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
                ("status", models.CharField(max_length=24, choices=[
                    ("pending_review", "Pending review"), ("metadata_approved", "Metadata reviewed"),
                    ("rejected", "Rejected"),
                ], default="pending_review", editable=False)),
                ("review_note", models.TextField(blank=True, max_length=1000)),
                ("reviewed_by_user_id", models.UUIDField(null=True, blank=True, editable=False)),
                ("reviewed_at", models.DateTimeField(null=True, blank=True, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
