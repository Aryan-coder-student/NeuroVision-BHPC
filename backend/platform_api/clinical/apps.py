from django.apps import AppConfig


class ClinicalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "clinical"

    def ready(self):
        # Register post-delete cleanup for private report image files.
        from . import signals  # noqa: F401

