import pyotp
from django.test import TestCase, override_settings

from users.models import User
from users.auth.service import UserService
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    VALID_PASSWORD,
    registration_data,
    get_test_crypto,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegisterCreatesUser(TestCase):

    def test_returns_user_instance(self):
        user = UserService.register(registration_data())
        self.assertIsInstance(user, User)

    def test_user_saved_to_db(self):
        UserService.register(registration_data())
        self.assertTrue(User.objects.filter(email="testuser@example.com").exists())

    def test_email_stored_correctly(self):
        user = UserService.register(registration_data())
        self.assertEqual(user.email, "testuser@example.com")

    def test_username_stored_correctly(self):
        user = UserService.register(registration_data())
        self.assertEqual(user.username, "johndoe")

    def test_first_name_stored_correctly(self):
        user = UserService.register(registration_data())
        self.assertEqual(user.first_name, "John")

    def test_last_name_stored_correctly(self):
        user = UserService.register(registration_data())
        self.assertEqual(user.last_name, "Doe")


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegisterPasswordConfirmRemoval(TestCase):

    def test_password_confirm_stripped_before_create(self):
        """password_confirm is not a model field; register() must pop it."""
        user = UserService.register(registration_data())
        self.assertTrue(user.pk)  # no error means pop succeeded


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegisterOTPSecret(TestCase):

    def test_generates_otp_secret_when_missing(self):
        data = registration_data()
        data.pop("otp_secret", None)
        user = UserService.register(data)
        self.assertTrue(len(user.otp_secret) > 0)

    def test_preserves_provided_otp_secret(self):
        crypto = get_test_crypto()
        raw = pyotp.random_base32()
        encrypted = crypto.encrypt(raw)
        data = registration_data(otp_secret=encrypted)
        user = UserService.register(data)
        self.assertEqual(user.otp_secret, encrypted)

    def test_default_is_otp_verified_false(self):
        user = UserService.register(registration_data())
        self.assertFalse(user.is_otp_verified)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegisterPassword(TestCase):

    def test_password_hashed_correctly(self):
        user = UserService.register(registration_data())
        self.assertTrue(user.check_password(VALID_PASSWORD))

    def test_raw_password_not_stored(self):
        user = UserService.register(registration_data())
        self.assertNotEqual(user.password, VALID_PASSWORD)
