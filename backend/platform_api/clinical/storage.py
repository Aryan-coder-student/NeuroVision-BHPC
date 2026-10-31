"""Private Django FileField storage for report images.

Filesystem for local tests, Hugging Face S3-compatible bucket for deployed demos.
No public image URLs are exposed: all reads require authenticated Django views.
"""
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage, Storage
from django.db import connection
from django.utils.deconstruct import deconstructible
from django.utils.text import slugify


@deconstructible
class PrivateReportStorage(Storage):
    """Delegate Django FileField operations without exposing public URLs.

    Deliberately resolves the backend on each operation: Django's long-lived
    FileField instance must honor test overrides of MEDIA_ROOT/storage mode.
    """

    @staticmethod
    def _backend():
        mode = settings.NEUROVISION_REPORT_STORAGE
        if mode == "filesystem":
            return FileSystemStorage(
                location=settings.MEDIA_ROOT,
                file_permissions_mode=0o600,
                directory_permissions_mode=0o700,
            )
        if mode == "huggingface":
            if not settings.HUGGINGFACE_S3_ACCESS_KEY_ID or not settings.HUGGINGFACE_S3_SECRET_ACCESS_KEY:
                raise ImproperlyConfigured(
                    "Hugging Face S3 credentials are required for private report storage."
                )
            # Import only for S3 deployments; local tests remain backend-agnostic.
            from botocore.config import Config
            from storages.backends.s3 import S3Storage

            return S3Storage(
                bucket_name=settings.HUGGINGFACE_S3_BUCKET,
                endpoint_url=f"https://s3.hf.co/{settings.HUGGINGFACE_S3_NAMESPACE}",
                access_key=settings.HUGGINGFACE_S3_ACCESS_KEY_ID,
                secret_key=settings.HUGGINGFACE_S3_SECRET_ACCESS_KEY,
                region_name="us-east-1",
                default_acl=None,
                file_overwrite=True,
                querystring_auth=True,
                client_config=Config(
                    region_name="us-east-1",
                    s3={"addressing_style": "path"},
                    request_checksum_calculation="when_required",
                    response_checksum_validation="when_required",
                ),
            )
        raise ImproperlyConfigured("Unknown NEUROVISION_REPORT_STORAGE configuration.")

    def _open(self, name, mode="rb"):
        return self._backend().open(name, mode)

    def _save(self, name, content):
        return self._backend().save(name, content)

    def exists(self, name):
        return self._backend().exists(name)

    def delete(self, name):
        return self._backend().delete(name)

    def size(self, name):
        return self._backend().size(name)

    def path(self, name):
        if settings.NEUROVISION_REPORT_STORAGE != "filesystem":
            raise NotImplementedError("Remote object storage has no local filesystem path.")
        return self._backend().path(name)

    def url(self, name):
        raise ValueError("Report images are private; fetch through the authenticated API.")


def report_snapshot_upload_to(instance, filename):
    """reports/<workspace-name>-<id>/<patient-name>-<id>/<report-id>/3d-segmentation.png.

    UUIDs prevent collisions and unsafe input filenames are ignored.
    This is only intended for research/demo data; names in object keys are
    sensitive and real clinical datasets should use opaque UUID-only paths.
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
