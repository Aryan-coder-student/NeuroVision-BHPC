from django.core.management.base import BaseCommand
from tenant.models import Institution, Domain
from django.conf import settings


class Command(BaseCommand):
    help = "Initializes the NeuroVision platform by creating the public tenant and its domain."

    def handle(self, *args, **options):
        self.stdout.write("Initializing NeuroVision platform...")

        # 1. Create the public tenant
        tenant, created = Institution.objects.get_or_create(
            schema_name="public", name="NeuroVision Central", slug="public"
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created public tenant: {tenant.name}")
            )
        else:
            self.stdout.write(f"Public tenant already exists: {tenant.name}")

        # 2. Create the domain for public tenant
        # Use TENANT_BASE_DOMAIN from settings or fallback
        domain_url = getattr(settings, "TENANT_BASE_DOMAIN", "localtest.me")

        domain, created = Domain.objects.get_or_create(
            domain=domain_url, tenant=tenant
        )

        if created:
            domain.is_primary = True
            domain.save()
            self.stdout.write(
                self.style.SUCCESS(f"Created domain for public tenant: {domain.domain}")
            )
        else:
            self.stdout.write(f"Domain already exists: {domain.domain}")

        self.stdout.write(self.style.SUCCESS("Platform initialization complete."))
