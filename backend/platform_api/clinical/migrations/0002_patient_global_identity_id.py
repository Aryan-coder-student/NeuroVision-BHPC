from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clinical", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="global_identity_id",
            field=models.UUIDField(blank=True, editable=False, null=True),
        )
    ]
