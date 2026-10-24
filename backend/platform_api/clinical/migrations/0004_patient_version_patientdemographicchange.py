import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0003_patient_date_of_birth_and_generated_code")]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="version",
            field=models.PositiveBigIntegerField(default=1, editable=False),
        ),
        migrations.CreateModel(
            name="PatientDemographicChange",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("actor_user_id", models.UUIDField(editable=False)),
                ("actor_username", models.CharField(editable=False, max_length=150)),
                ("changed_fields", models.JSONField(editable=False)),
                ("from_version", models.PositiveBigIntegerField(editable=False)),
                ("to_version", models.PositiveBigIntegerField(editable=False)),
                ("previous_display_name", models.CharField(editable=False, max_length=160)),
                ("new_display_name", models.CharField(editable=False, max_length=160)),
                ("previous_date_of_birth", models.DateField(editable=False, null=True)),
                ("new_date_of_birth", models.DateField(editable=False, null=True)),
                ("changed_at", models.DateTimeField(auto_now_add=True, editable=False)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="demographic_changes",
                        to="clinical.patient",
                    ),
                ),
            ],
            options={
                "ordering": ["-changed_at"],
                "indexes": [models.Index(fields=["patient", "-changed_at"], name="clinical_pa_patient_a572aa_idx")],
            },
        ),
    ]
