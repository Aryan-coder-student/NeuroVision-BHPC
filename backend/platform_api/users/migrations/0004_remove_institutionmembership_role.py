from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_institutionmembership_role_user_failed_otp_attempts_and_more"),
        ("tenant", "0003_institution_owner"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="institutionmembership",
            name="role",
        ),
    ]
