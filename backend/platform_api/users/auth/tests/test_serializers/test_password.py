from django.test import TestCase, override_settings
from users.auth.serializers import RegistrationSerializer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    VALID_PASSWORD,
    registration_data,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestPasswordValidation(TestCase):
    def test_strong_password_passes(self):
        s = RegistrationSerializer(
            data=registration_data(
                password="Str0ng!Passw0rd", password_confirm="Str0ng!Passw0rd"
            )
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_password_mismatch_rejected(self):
        s = RegistrationSerializer(
            data=registration_data(
                password=VALID_PASSWORD, password_confirm="Different123!"
            )
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password_confirm", s.errors)

    def test_weak_password_rejected(self):
        # Too short (Django default is 8)
        s = RegistrationSerializer(
            data=registration_data(password="123", password_confirm="123")
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_common_password_rejected(self):
        s = RegistrationSerializer(
            data=registration_data(
                password="password123", password_confirm="password123"
            )
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_numeric_only_password_rejected(self):
        s = RegistrationSerializer(
            data=registration_data(password="12345678", password_confirm="12345678")
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_missing_password_rejected(self):
        data = registration_data()
        data.pop("password")
        s = RegistrationSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_missing_password_confirm_rejected(self):
        data = registration_data()
        data.pop("password_confirm")
        s = RegistrationSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("password_confirm", s.errors)

    def test_empty_password_rejected(self):
        s = RegistrationSerializer(
            data=registration_data(password="", password_confirm="")
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_null_password_rejected(self):
        s = RegistrationSerializer(
            data=registration_data(password=None, password_confirm=None)
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)
