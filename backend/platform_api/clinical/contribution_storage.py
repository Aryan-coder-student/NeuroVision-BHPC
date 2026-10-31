"""Strict private object keys for contributed de-identified research scans."""
from pathlib import PurePosixPath

from django.conf import settings
from django.db import connection


def contribution_upload_to(instance, filename):
    tenant = getattr(connection, "tenant", None)
    if (
        tenant is None
        or connection.schema_name == settings.PUBLIC_SCHEMA_NAME
        or tenant.schema_name != connection.schema_name
    ):
        raise ValueError("A verified workspace is required for dataset storage.")
    # The stored filename never comes from the incoming upload or a patient's name.
    suffix = ".zip" if instance.modality == "dicom_archive" else (
        ".nii.gz" if filename.lower().endswith(".nii.gz") else ".nii"
    )
    return str(PurePosixPath(
        "contributions", str(tenant.id), str(instance.contribution_id),
        f"{instance.modality}{suffix}",
    ))
