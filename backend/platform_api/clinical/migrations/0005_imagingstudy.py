import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0004_patient_version_patientdemographicchange")]

    operations = [
        migrations.CreateModel(
            name="ImagingStudy",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_by_user_id", models.UUIDField(editable=False)),
                ("modality_sizes_bytes", models.JSONField(default=dict, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="imaging_studies", to="clinical.patient"
                )),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["patient", "-created_at"], name="clinical_im_patient_732189_idx"),
                ],
            },
        ),
    ]
