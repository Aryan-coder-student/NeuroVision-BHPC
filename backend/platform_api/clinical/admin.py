"""Tenant-only, read-only Django Admin views for patient imaging research."""
from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import FileResponse, Http404
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.urls import path, reverse
from django.utils.html import format_html

from .models import DatasetContribution, DatasetContributionFile, ImagingStudy, Patient, SegmentationReport


class TenantClinicalAdmin(admin.ModelAdmin):
    """Clinical models do not exist in the public PostgreSQL schema."""

    @staticmethod
    def _is_workspace_owner(request):
        tenant = getattr(connection, "tenant", None)
        return (
            tenant is not None
            and connection.schema_name != settings.PUBLIC_SCHEMA_NAME
            and tenant.schema_name == connection.schema_name
            and tenant.owner_id == request.user.pk
        )

    def has_module_permission(self, request):
        return self._is_workspace_owner(request) and super().has_module_permission(request)

    def has_view_permission(self, request, obj=None):
        return self._is_workspace_owner(request) and super().has_view_permission(request, obj=obj)

    def has_add_permission(self, request):
        return False  # Patient identity and research reports are created via APIs.

    def has_change_permission(self, request, obj=None):
        return False  # Avoid bypassing patient audits and inference provenance.

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Patient)
class PatientAdmin(TenantClinicalAdmin):
    list_display = ("patient_code", "display_name", "created_at")
    search_fields = ("patient_code", "display_name")
    readonly_fields = ("id", "patient_code", "display_name", "date_of_birth", "version", "created_at", "updated_at")


@admin.register(ImagingStudy)
class ImagingStudyAdmin(TenantClinicalAdmin):
    list_display = ("id", "patient", "created_at")
    readonly_fields = ("id", "patient", "created_by_user_id", "modality_sizes_bytes", "created_at")
    list_select_related = ("patient",)


@admin.register(SegmentationReport)
class SegmentationReportAdmin(TenantClinicalAdmin):
    list_display = ("id", "patient", "model_name", "model_version", "created_at")
    list_filter = ("model_id",)
    search_fields = ("patient__patient_code", "patient__display_name", "model_name")
    list_select_related = ("patient",)
    readonly_fields = (
        "id", "patient", "imaging_study", "model_id", "model_name",
        "model_version", "measurements_cm3", "created_at",
        "created_by_user_id", "snapshot_location", "snapshot_preview",
    )

    @admin.display(description="Private media file")
    def snapshot_location(self, obj):
        return obj.snapshot_image.name if obj and obj.snapshot_image else "Not available"

    @admin.display(description="Snapshot preview")
    def snapshot_preview(self, obj):
        if not obj or not obj.snapshot_image:
            return "Not available"
        url = reverse("admin:clinical_segmentationreport_snapshot", args=[obj.pk])
        return format_html(
            '<img src="{}" alt="Saved segmentation snapshot" style="max-width:600px;width:100%;height:auto" />',
            url,
        )

    def get_urls(self):
        routes = super().get_urls()
        return [
            path("<uuid:report_id>/snapshot/", self.admin_site.admin_view(self.snapshot),
                 name="clinical_segmentationreport_snapshot"),
            *routes,
        ]

    def snapshot(self, request, report_id):
        if not self.has_view_permission(request):
            raise Http404("Report not found.")
        report = get_object_or_404(SegmentationReport, pk=report_id)
        try:
            response = FileResponse(report.snapshot_image.open("rb"), content_type="image/png")
        except (ValueError, FileNotFoundError, OSError) as error:
            raise Http404("Report image unavailable.") from error
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class DatasetContributionFileInline(admin.TabularInline):
    model = DatasetContributionFile
    extra = 0
    can_delete = False
    fields = ("modality", "byte_size", "object_key")
    readonly_fields = fields

    @admin.display(description="Private object key")
    def object_key(self, obj):
        return obj.object_file.name if obj and obj.object_file else "Not available"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(DatasetContribution)
class DatasetContributionAdmin(TenantClinicalAdmin):
    inlines = (DatasetContributionFileInline,)
    list_display = ("title", "origin", "modality", "status", "created_at")
    list_filter = ("status", "origin", "modality")
    search_fields = ("title",)
    readonly_fields = (
        "id", "submitted_by_user_id", "title", "modality", "origin",
        "description", "license_info", "source_url", "sample_count",
        "no_phi_attestation", "format", "file_count", "total_bytes",
        "created_at", "reviewed_at", "reviewed_by_user_id",
    )
    fields = readonly_fields + ("status", "review_note")

    def has_change_permission(self, request, obj=None):
        return self._is_workspace_owner(request) and admin.ModelAdmin.has_change_permission(self, request, obj)

    def save_model(self, request, obj, form, change):
        if not change:
            raise PermissionError("Dataset uploads must originate from the authenticated API.")
        obj.reviewed_by_user_id = request.user.id
        obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
