from django.test import TestCase, override_settings

from users.auth.serializers import VerificationOTPSerializer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    NONEXISTENT_EMAIL,
    create_user,
    otp_data,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPValid(TestCase):

    def setUp(self):
        self.user, _ = create_user(
            username="otpvalid",
            email="otpvalid@example.com",
            with_otp_secret=False,
        )

    def test_valid_unverified_email_passes(self):
        s = VerificationOTPSerializer(data=otp_data(email="otpvalid@example.com"))
        self.assertTrue(s.is_valid(), s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPInvalidEmail(TestCase):

    def test_nonexistent_email_rejected(self):
        s = VerificationOTPSerializer(data=otp_data(email=NONEXISTENT_EMAIL))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPAlreadyVerified(TestCase):

    def setUp(self):
        self.user, _ = create_user(
            username="alreadyverified",
            email="verified@example.com",
            is_otp_verified=True,
            with_otp_secret=False,
        )

    def test_already_verified_email_rejected(self):
        s = VerificationOTPSerializer(data=otp_data(email="verified@example.com"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPMissingFields(TestCase):

    def setUp(self):
        create_user(
            username="missingfield",
            email="missing@example.com",
            with_otp_secret=False,
        )

    def test_missing_otp_field(self):
        s = VerificationOTPSerializer(data={"email": "missing@example.com"})
        self.assertFalse(s.is_valid())
        self.assertIn("otp", s.errors)

    def test_missing_email_field(self):
        s = VerificationOTPSerializer(data={"otp": "123456"})
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_empty_payload_rejected(self):
        s = VerificationOTPSerializer(data={})
        self.assertFalse(s.is_valid())
