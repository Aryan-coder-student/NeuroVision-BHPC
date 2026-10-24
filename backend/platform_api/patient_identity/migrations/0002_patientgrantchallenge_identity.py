import django.db.models.deletion
from django.db import migrations, models


def bind_existing_challenges(apps, schema_editor):
    challenge_model = apps.get_model("patient_identity", "PatientGrantChallenge")
    for challenge in challenge_model.objects.select_related("grant").iterator():
        challenge.identity_id = challenge.grant.identity_id
        challenge.save(update_fields=("identity",))


class Migration(migrations.Migration):
    dependencies = [("patient_identity", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="patientgrantchallenge",
            name="identity",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="grant_challenges",
                to="patient_identity.patientidentity",
            ),
        ),
        migrations.RunPython(bind_existing_challenges, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="patientgrantchallenge",
            name="identity",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="grant_challenges",
                to="patient_identity.patientidentity",
            ),
        ),
    ]
