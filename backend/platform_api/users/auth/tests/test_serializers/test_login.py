from unittest.mock import patch
from django.test import TestCase, override_settings
from users.auth.serializers import LoginSerilizer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    WRONG_PASSWORD,
    NONEXISTENT_EMAIL,
    create_user,
    login_data,
    make_request_factory,
)


def _serialize(data):
    """Build a LoginSerilizer with a fake request context."""
    factory = make_request_factory()
    request = factory.post("/auth/login/")
    return LoginSerilizer(data=data, context={"request": request})


# ---------------------------------------------------------------------------
# Successful authentication
# ---------------------------------------------------------------------------
@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginSuccess(TestCase):

    def setUp(self):
        self.user, _ = create_user(
            username="loginuser",
            email="login@example.com",
            is_otp_verified=True,
        )

    def test_valid_credentials_passes(self):
        s = _serialize(login_data(email="login@example.com"))
        self.assertTrue(s.is_valid(), s.errors)

    def test_validated_data_contains_user(self):
        s = _serialize(login_data(email="login@example.com"))
        s.is_valid()
        self.assertEqual(s.validated_data["user"], self.user)


# ---------------------------------------------------------------------------
# Invalid credentials
# ---------------------------------------------------------------------------
@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginInvalidCredentials(TestCase):

    def setUp(self):
        self.user, _ = create_user(
            username="loginuser2",
            email="login2@example.com",
            is_otp_verified=True,
        )

    def test_wrong_password_rejected(self):
        s = _serialize(login_data(email="login2@example.com", password=WRONG_PASSWORD))
        self.assertFalse(s.is_valid())

    def test_nonexistent_email_rejected(self):
        """Should return False instead of raising UnboundLocalError."""
        s = _serialize(login_data(email=NONEXISTENT_EMAIL))
        self.assertFalse(s.is_valid())


# ---------------------------------------------------------------------------
# Account state checks
# ---------------------------------------------------------------------------
@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginAccountState(TestCase):

    def setUp(self):
        self.user, _ = create_user(
            username="stateuser",
            email="state@example.com",
            is_otp_verified=True,
        )

    def test_inactive_user_rejected(self):
        self.user.is_active = False
        self.user.save()
        s = _serialize(login_data(email="state@example.com"))
        self.assertFalse(s.is_valid())

    @patch("users.auth.service.email_service")
    def test_unverified_user_triggers_otp_resend(self, mock_email):
        self.user.is_otp_verified = False
        self.user.save()
        s = _serialize(login_data(email="state@example.com"))
        self.assertFalse(s.is_valid())
        # The serializer re-sends an OTP before rejecting
        mock_email.send.assert_called_once()

    @patch("users.auth.service.email_service")
    def test_unverified_user_error_contains_otp_flag(self, mock_email):
        self.user.is_otp_verified = False
        self.user.save()
        s = _serialize(login_data(email="state@example.com"))
        s.is_valid()
        # The non_field_errors should contain OTP_NOT_VERIFIED info
        errors = s.errors
        self.assertTrue(
            any("OTP_NOT_VERIFIED" in str(v) for v in errors.values()),
            f"Expected OTP_NOT_VERIFIED flag in errors: {errors}",
        )
