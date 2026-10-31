from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def assign_existing_workspace_owners(apps, schema_editor):
    Institution = apps.get_model("tenant", "Institution")
    Membership = apps.get_model("users", "InstitutionMembership")
    for institution in Institution.objects.using(schema_editor.connection.alias).all():
        members = Membership.objects.using(schema_editor.connection.alias).filter(
            institution_id=institution.pk, is_active=True
        ).order_by("created_at", "pk")
        admins = members.filter(role="ADMIN")
        # Ambiguous ownership is deliberately not granted to another user.
        if admins.count() == 1:
            owner_id = admins.first().user_id
        elif admins.count() == 0 and members.count() == 1:
            owner_id = members.first().user_id
        else:
            continue
        Institution.objects.using(schema_editor.connection.alias).filter(
            pk=institution.pk
        ).update(owner_id=owner_id)


class Migration(migrations.Migration):
    dependencies = [
        ("tenant", "0002_institution_address_institution_contact_email_and_more"),
        ("users", "0003_institutionmembership_role_user_failed_otp_attempts_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="institution",
            name="owner",
            field=models.ForeignKey(
                to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT,
                null=True, blank=True, related_name="owned_institutions",
            ),
        ),
        migrations.RunPython(
            assign_existing_workspace_owners,
            migrations.RunPython.noop,
        ),
    ]
