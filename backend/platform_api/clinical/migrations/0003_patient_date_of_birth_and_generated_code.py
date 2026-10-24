from django.db import migrations, models

import clinical.models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0002_patient_global_identity_id")]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="patient",
            name="patient_code",
            field=models.CharField(
                default=clinical.models.generate_patient_code,
                editable=False,
                max_length=64,
                unique=True,
            ),
        ),
    ]
