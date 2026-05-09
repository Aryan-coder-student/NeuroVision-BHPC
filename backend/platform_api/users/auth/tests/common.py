import pyotp
from cryptography.fernet import Fernet

from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User
from tenant.models import Institution, Domain
from users.auth.utils import Cryptography


# ---------------------------------------------------------------------------
# Tenant-aware base class for view / integration tests
# ---------------------------------------------------------------------------


class TenantTestCase(TestCase):
    """
    TestCase subclass that creates the ``public`` schema tenant + domain
    before each test.  Use this as the base for any test that hits URLs
    through the DRF test client (the ``django_tenants`` middleware must
    resolve a tenant from the ``Host`` header).
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Create the public tenant record if it doesn't exist
        # schema_name='public' is the default for shared apps
        cls._tenant, _ = Institution.objects.get_or_create(
            schema_name="public", defaults={"name": "Public", "slug": "public"}
        )
        Domain.objects.get_or_create(
            domain="testserver", tenant=cls._tenant, defaults={"is_primary": True}
        )

    @classmethod
    def tearDownClass(cls):
        # We don't want to drop the public schema in tests as it contains common data
        # Just remove the domain record we created
        Domain.objects.filter(domain="testserver").delete()
        super().tearDownClass()


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEST_FERNET_KEY = Fernet.generate_key().decode()
"""Deterministic Fernet key used across all test classes via @override_settings."""

VALID_PASSWORD = "Str0ngP@ssword!"
WEAK_PASSWORD = "123"
WRONG_PASSWORD = "Wr0ngP@ssword!"

VALID_EMAIL = "testuser@example.com"
NONEXISTENT_EMAIL = "ghost@example.com"

VALID_USERNAME = "johndoe"
VALID_FIRST_NAME = "John"
VALID_LAST_NAME = "Doe"

INVALID_OTP = "000000"


# ---------------------------------------------------------------------------
# Crypto helper (always uses TEST_FERNET_KEY)
# ---------------------------------------------------------------------------


def get_test_crypto():
    """Return a Cryptography instance backed by TEST_FERNET_KEY."""
    return Cryptography()


# ---------------------------------------------------------------------------
# Data factories
# ---------------------------------------------------------------------------


def registration_data(**overrides) -> dict:
    """Return a valid registration payload; merge *overrides* on top."""
    data = {
        "username": VALID_USERNAME,
        "email": VALID_EMAIL,
        "password": VALID_PASSWORD,
        "password_confirm": VALID_PASSWORD,
        "first_name": VALID_FIRST_NAME,
        "last_name": VALID_LAST_NAME,
    }
    data.update(overrides)
    return data


def login_data(email=VALID_EMAIL, password=VALID_PASSWORD) -> dict:
    return {"email": email, "password": password}


def otp_data(email=VALID_EMAIL, otp="123456") -> dict:
    return {"email": email, "otp": otp}


# ---------------------------------------------------------------------------
# User factory
# ---------------------------------------------------------------------------


def create_user(
    username="testuser",
    email=VALID_EMAIL,
    password=VALID_PASSWORD,
    *,
    is_otp_verified=False,
    with_otp_secret=True,
    **extra,
):
    """
    Create and return ``(user, raw_otp_secret)``.

    *raw_otp_secret* is the un-encrypted base32 secret so tests can
    generate valid TOTP codes.  If *with_otp_secret* is False the user
    gets no secret and ``raw_otp_secret`` is None.
    """
    crypto = get_test_crypto()
    raw_secret = None
    if with_otp_secret:
        raw_secret = pyotp.random_base32()
        extra["otp_secret"] = crypto.encrypt(raw_secret)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_otp_verified=is_otp_verified,
        **extra,
    )
    return user, raw_secret


def generate_valid_otp(raw_secret: str) -> str:
    """Generate a currently-valid TOTP code for the given base32 secret."""
    return pyotp.TOTP(raw_secret).now()


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


def get_authenticated_client(user) -> APIClient:
    """Return an APIClient with access_token cookie set for *user*."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.cookies["access_token"] = str(refresh.access_token)
    return client


def make_request_factory():
    return RequestFactory()
