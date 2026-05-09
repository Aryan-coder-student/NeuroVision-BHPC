from django.test import TestCase, override_settings

from users.auth.serializers import ResendOTPSerializer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    NONEXISTENT_EMAIL,
    create_user,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPValid(TestCase):
    def setUp(self):
        self.user, _ = create_user(
            username="resendvalid",
            email="resend@example.com",
            with_otp_secret=False,
        )

    def test_valid_unverified_email_passes(self):
        s = ResendOTPSerializer(data={"email": "resend@example.com"})
        self.assertTrue(s.is_valid(), s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPInvalidEmail(TestCase):
    def test_nonexistent_email_rejected(self):
        s = ResendOTPSerializer(data={"email": NONEXISTENT_EMAIL})
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPAlreadyVerified(TestCase):
    def setUp(self):
        self.user, _ = create_user(
            username="resendverified",
            email="resendv@example.com",
            is_otp_verified=True,
            with_otp_secret=False,
        )

    def test_already_verified_email_rejected(self):
        s = ResendOTPSerializer(data={"email": "resendv@example.com"})
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPMissingFields(TestCase):
    def test_missing_email_rejected(self):
        s = ResendOTPSerializer(data={})
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)
