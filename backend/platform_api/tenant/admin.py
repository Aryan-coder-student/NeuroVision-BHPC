from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Institution, Domain

@admin.register(Institution)
class InstitutionAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ("name", "schema_name", "inst_type", "created_at")

@admin.register(Domain)
class DomainAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
