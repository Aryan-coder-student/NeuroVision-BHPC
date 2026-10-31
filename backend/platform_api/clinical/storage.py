"""Private file storage for research report PNGs.

Paths include human-readable names plus immutable UUIDs to avoid collisions.
Clinical report media never receives a public URL; only authenticated API
and staff-only Django Admin endpoints may stream image bytes.
"""
import os
from pathlib import Path

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import connection
from django.utils.deconstruct import deconstructible
from django.utils.text import slugify


@deconstructible
class PrivateReportStorage(FileSystemStorage):
    """Keep paths configurable during tests/deployment and disable public URLs."""

    def __init__(self):
        super().__init__(file_permissions_mode=0o600, directory_permissions_mode=0o700)

    @property
    def base_location(self):
        return settings.MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):
        raise ValueError("Report images are private; fetch through the authenticated API.")


def report_snapshot_upload_to(instance, filename):
    """media/reports/{workspace}-{id}/{patient}-{id}/{report-id}/3d-segmentation.png

    The uploaded filename is ignored; patient/workspace names are slugified.
    UUIDs avoid collisions when names match or are later edited.
    """
    tenant = getattr(connection, "tenant", None)
    if (
        tenant is None
        or tenant.schema_name == settings.PUBLIC_SCHEMA_NAME
        or tenant.schema_name != connection.schema_name
    ):
        raise ValueError("A tenant workspace must be selected to save report images.")
    workspace = f"{slugify(tenant.name)[:60] or 'workspace'}-{tenant.id}"
    patient = f"{slugify(instance.patient.display_name)[:60] or 'patient'}-{instance.patient_id}"
    return str(
        Path("reports") / workspace / patient / str(instance.id) / "3d-segmentation.png"
    )
