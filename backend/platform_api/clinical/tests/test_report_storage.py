"""No-network regression tests for private Hugging Face bucket storage."""
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings

from clinical.report_serializers import SegmentationReportSaveSerializer
from clinical.storage import PrivateReportStorage


class ReportStorageBackendTests(SimpleTestCase):
    @override_settings(REPORT_SNAPSHOT_MAX_BYTES=3 * 1024 * 1024 + 2)
    @patch("clinical.report_serializers.validate_snapshot_png")
    def test_snapshot_serializer_uses_configured_size_limit(self, validate_png):
        snapshot = SimpleUploadedFile(
            "viewer.png",
            b"x" * (3 * 1024 * 1024 + 1),
            content_type="image/png",
        )

        serializer = SegmentationReportSaveSerializer(data={
            "report_token": "signed-proof",
            "snapshot": snapshot,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        validate_png.assert_called_once()

    def test_defaults_to_private_local_media_for_development(self):
        with tempfile.TemporaryDirectory() as root:
            with override_settings(
                NEUROVISION_REPORT_STORAGE="filesystem", MEDIA_ROOT=root,
            ):
                storage = PrivateReportStorage()
                name = storage.save("reports/test/report.png", ContentFile(b"test"))
                self.assertEqual(Path(storage.path(name)).read_bytes(), b"test")
                with self.assertRaises(ValueError):
                    storage.url(name)
                storage.delete(name)

    @override_settings(
        NEUROVISION_REPORT_STORAGE="huggingface",
        HUGGINGFACE_S3_NAMESPACE="pahariaryan",
        HUGGINGFACE_S3_BUCKET="neuro-bucket",
        HUGGINGFACE_S3_ACCESS_KEY_ID="HFAK_TEST_ONLY",
        HUGGINGFACE_S3_SECRET_ACCESS_KEY="test-secret",
    )
    @patch("storages.backends.s3.S3Storage")
    def test_huggingface_s3_uses_private_path_style_and_required_checksums(self, remote):
        storage = PrivateReportStorage()
        remote.return_value.exists.return_value = False
        self.assertFalse(storage.exists("reports/a/b.png"))
        opts = remote.call_args.kwargs
        self.assertEqual(opts["endpoint_url"], "https://s3.hf.co/pahariaryan")
        self.assertEqual(opts["bucket_name"], "neuro-bucket")
        self.assertEqual(opts["region_name"], "us-east-1")
        self.assertEqual(opts["access_key"], "HFAK_TEST_ONLY")
        self.assertEqual(opts["secret_key"], "test-secret")
        self.assertFalse(opts["querystring_auth"] is False)
        self.assertFalse(opts["file_overwrite"] is False)
        self.assertIsNone(opts["default_acl"])
        config = opts["client_config"]
        self.assertEqual(config.s3["addressing_style"], "path")
        self.assertEqual(config.request_checksum_calculation, "when_required")
        self.assertEqual(config.response_checksum_validation, "when_required")
        with self.assertRaises(ValueError):
            storage.url("reports/a/b.png")
        with self.assertRaises(NotImplementedError):
            storage.path("reports/a/b.png")

    @override_settings(
        NEUROVISION_REPORT_STORAGE="huggingface",
        HUGGINGFACE_S3_NAMESPACE="pahariaryan",
        HUGGINGFACE_S3_BUCKET="neuro-bucket",
        HUGGINGFACE_S3_ACCESS_KEY_ID="HFAK_TEST_ONLY",
        HUGGINGFACE_S3_SECRET_ACCESS_KEY="test-secret",
    )
    @patch("storages.backends.s3.S3Storage")
    def test_remote_file_save_read_and_delete_keep_private_object_keys(self, remote):
        from io import BytesIO

        backend = remote.return_value
        backend.exists.return_value = False
        backend.save.side_effect = lambda key, data: key
        backend.open.return_value = BytesIO(b"png-data")
        storage = PrivateReportStorage()
        key = "reports/workspace-id/patient-id/report-id/3d-segmentation.png"
        saved = storage.save(key, ContentFile(b"png-data"))
        self.assertEqual(saved, key)
        self.assertEqual(storage.open(saved, "rb").read(), b"png-data")
        storage.delete(saved)
        backend.save.assert_called_once()
        backend.open.assert_called_once_with(key, "rb")
        backend.delete.assert_called_once_with(key)

    @override_settings(
        NEUROVISION_REPORT_STORAGE="huggingface",
        HUGGINGFACE_S3_ACCESS_KEY_ID="",
        HUGGINGFACE_S3_SECRET_ACCESS_KEY="",
    )
    def test_missing_credentials_fail_closed(self):
        with self.assertRaises(ImproperlyConfigured):
            PrivateReportStorage().exists("reports/image.png")

    @override_settings(NEUROVISION_REPORT_STORAGE="bogus")
    def test_invalid_storage_mode_does_not_fall_back_silently(self):
        with self.assertRaises(ImproperlyConfigured):
            PrivateReportStorage().exists("reports/image.png")
