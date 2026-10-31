from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True

    EMAIL_BACKEND: str = "django.core.mail.backends.smtp.EmailBackend"
    DEFAULT_FROM_EMAIL: str = "noreply@neurovision.com"

    # Production: Brevo SMTP over port 2525 (works with Render Free SMTP restrictions)
    EMAIL_HOST_PROD: str = "smtp-relay.brevo.com"
    EMAIL_PORT_PROD: int = 2525
    EMAIL_USE_TLS_PROD: bool = True
    EMAIL_USE_SSL_PROD: bool = False

    # Dev Overrides (optional in .env)
    EMAIL_HOST_DEV: str = "mailhog"
    EMAIL_PORT_DEV: int = 1025

    EMAIL_HOST_USER: str = ""
    EMAIL_HOST_PASSWORD: str = ""

    ENCRYPTION_KEY: str = "dummy-key-for-testing-only-1234567890="
    SECRET_KEY: str = "django-insecure-default-change-me-in-production"
    DATABASE_URL: str = "postgres://localhost/neurovision"
    TENANT_BASE_DOMAIN: str = "localtest.me"
    JWT_ALGORITHM: str = ""

    MONAI_SEGMENTATION_BASE_URL: str = "http://127.0.0.1:5000"
    # Disabled until MONAI implements authenticated POST /predict/files.
    MONAI_SEGMENTATION_UPLOAD_ENABLED: bool = False
    MONAI_SEGMENTATION_TIMEOUT_SECONDS: float = 120.0
    MONAI_SEGMENTATION_API_TOKEN: str = ""
    MONAI_SEGMENTATION_MODEL_VERSION: str = "2.1"

    BLIP_VQA_BASE_URL: str = "https://pahariaryan121-neurovision-api.hf.space"
    BLIP_VQA_TIMEOUT_SECONDS: float = 60.0
    BLIP_VQA_API_TOKEN: str = ""
    BLIP_VQA_MODEL_VERSION: str = "1.0"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def is_dev(self) -> bool:
        return self.ENV == "development"

    @property
    def email_host(self) -> str:
        return self.EMAIL_HOST_DEV if self.is_dev else self.EMAIL_HOST_PROD

    @property
    def email_port(self) -> int:
        return self.EMAIL_PORT_DEV if self.is_dev else self.EMAIL_PORT_PROD

    @property
    def email_use_tls(self) -> bool:
        return False if self.is_dev else self.EMAIL_USE_TLS_PROD

    @property
    def email_use_ssl(self) -> bool:
        return False if self.is_dev else self.EMAIL_USE_SSL_PROD


settings = Settings()
