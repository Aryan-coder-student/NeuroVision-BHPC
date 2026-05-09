from django.test import TestCase, override_settings

from users.auth.service import UserService
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    INVALID_OTP,
    create_user,
    generate_valid_otp,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPValid(TestCase):
    def setUp(self):
        self.user, self.raw_secret = create_user(
            username="verifygood", email="verifygood@example.com"
        )

    def test_returns_true_for_valid_otp(self):
        code = generate_valid_otp(self.raw_secret)
        self.assertTrue(UserService.verify_otp(self.user, code))

    def test_sets_is_otp_verified_true(self):
        code = generate_valid_otp(self.raw_secret)
        UserService.verify_otp(self.user, code)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_otp_verified)

    def test_saves_user_to_db(self):
        code = generate_valid_otp(self.raw_secret)
        UserService.verify_otp(self.user, code)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_otp_verified)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPInvalid(TestCase):
    def setUp(self):
        self.user, self.raw_secret = create_user(
            username="verifybad", email="verifybad@example.com"
        )

    def test_returns_false_for_invalid_otp(self):
        self.assertFalse(UserService.verify_otp(self.user, INVALID_OTP))

    def test_does_not_set_verified_flag(self):
        UserService.verify_otp(self.user, INVALID_OTP)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_otp_verified)

    def test_returns_false_for_empty_string(self):
        self.assertFalse(UserService.verify_otp(self.user, ""))

    def test_returns_false_for_non_numeric(self):
        self.assertFalse(UserService.verify_otp(self.user, "abcdef"))
