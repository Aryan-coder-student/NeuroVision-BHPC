import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("tenant", "0001_initial"),
    ]
    operations = [
        migrations.CreateModel(
            name="PatientIdentity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("email_ciphertext", models.TextField()),
                ("email_fingerprint", models.CharField(db_index=True, max_length=64, unique=True)),
                ("email_verified_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="PatientAccessGrant",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tenant_patient_id", models.UUIDField()),
                ("status", models.CharField(choices=[("PENDING", "Pending verification"), ("ACTIVE", "Active"), ("REVOKED", "Revoked")], default="PENDING", max_length=12)),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("identity", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="grants", to="patient_identity.patientidentity")),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="patient_grants", to="tenant.institution")),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="requested_patient_grants", to=settings.AUTH_USER_MODEL)),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("institution", "tenant_patient_id"), name="unique_tenant_patient_grant")]},
        ),
        migrations.CreateModel(
            name="PatientGrantChallenge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code_hash", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("grant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="challenges", to="patient_identity.patientaccessgrant")),
            ],
        ),
    ]
