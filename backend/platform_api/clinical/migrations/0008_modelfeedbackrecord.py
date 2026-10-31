import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0007_datasetcontribution")]

    operations = [
        migrations.CreateModel(
            name="ModelFeedbackRecord",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, default=uuid.uuid4, editable=False)),
                ("submitted_by_user_id", models.UUIDField(editable=False)),
                ("model_id", models.CharField(max_length=120)),
                ("model_name", models.CharField(max_length=160)),
                ("category", models.CharField(max_length=32, choices=[
                    ("false_positive", "False positive"), ("false_negative", "False negative"),
                    ("hallucination", "Incorrect VQA answer"), ("feature_request", "Feature request"),
                    ("ui_issue", "Platform issue"),
                ])),
                ("description", models.TextField(max_length=2000)),
                ("no_phi_attestation", models.BooleanField(default=False, editable=False)),
                ("status", models.CharField(max_length=24, choices=[
                    ("new", "New"), ("triaged", "Triaged"), ("resolved", "Resolved"),
                    ("dismissed", "Dismissed"),
                ], default="new")),
                ("reviewer_note", models.TextField(max_length=1000, blank=True)),
                ("reviewed_by_user_id", models.UUIDField(null=True, blank=True, editable=False)),
                ("reviewed_at", models.DateTimeField(null=True, blank=True, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("report", models.ForeignKey(
                    to="clinical.segmentationreport", related_name="feedback_entries",
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
