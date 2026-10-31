import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0005_imagingstudy")]

    operations = [
        migrations.CreateModel(
            name="SegmentationReport",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("proof_nonce", models.UUIDField(unique=True, editable=False)),
                ("created_by_user_id", models.UUIDField(editable=False)),
                ("model_id", models.CharField(max_length=120)),
                ("model_name", models.CharField(max_length=160)),
                ("model_version", models.CharField(max_length=80)),
                ("measurements_cm3", models.JSONField(default=dict)),
                ("snapshot_png", models.BinaryField(editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("imaging_study", models.ForeignKey(
                    to="clinical.imagingstudy", related_name="segmentation_reports",
                    on_delete=django.db.models.deletion.SET_NULL, null=True, blank=True,
                )),
                ("patient", models.ForeignKey(
                    to="clinical.patient", related_name="segmentation_reports",
                    on_delete=django.db.models.deletion.CASCADE,
                )),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(
                    fields=["patient", "-created_at"], name="clinical_re_patient_6394aa_idx",
                )],
            },
        ),
    ]
