from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
import uuid


class Institution(TenantMixin):
    """
    Represents a Medical Clinical / Research Organisation (Hospital, Clinic, Uni, Lab).
    This is the core Tenant model that handles schema isolation.
    """

    class InstitutionType(models.TextChoices):
        HOSPITAL = "HOSPITAL", "General Hospital"
        CLINIC = "CLINIC", "Specialized Clinic"
        RESEARCH = "RESEARCH", "Research Laboratory"
        UNIVERSITY = "UNIVERSITY", "University Department"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=100, unique=True)
    inst_type = models.CharField(
        max_length=20, choices=InstitutionType.choices, default=InstitutionType.CLINIC
    )

    # Contact & Profile Info
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    country = models.CharField(max_length=100, default="India")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Required for django-tenants
    auto_create_schema = True

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    """
    Handles routing for the specific Institution.
    """

    pass
