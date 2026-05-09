from django.test import TestCase, override_settings
from users.models import User
from users.auth.serializers import RegistrationSerializer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    VALID_PASSWORD,
    registration_data,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationGeneral(TestCase):
    """General registration flow and valid data acceptance."""

    def test_all_valid_fields_passes(self):
        s = RegistrationSerializer(data=registration_data())
        self.assertTrue(s.is_valid(), s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationUsername(TestCase):
    """Exhaustive tests for username pattern and uniqueness."""

    def test_valid_usernames(self):
        valid_list = ["johndoe", "john.doe", "john_doe", "john123", "J0hn.D_oe"]
        for uname in valid_list:
            s = RegistrationSerializer(data=registration_data(username=uname))
            self.assertTrue(
                s.is_valid(), f"Username '{uname}' should be valid but got {s.errors}"
            )

    def test_must_start_with_letter(self):
        s = RegistrationSerializer(data=registration_data(username="1badname"))
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)

    def test_too_short_rejected(self):
        s = RegistrationSerializer(data=registration_data(username="ab"))
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)

    def test_too_long_rejected(self):
        s = RegistrationSerializer(data=registration_data(username="a" * 32))
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)

    def test_special_chars_rejected(self):
        invalid_list = ["john@doe", "john#doe", "john!doe", "john%doe"]
        for uname in invalid_list:
            s = RegistrationSerializer(data=registration_data(username=uname))
            self.assertFalse(s.is_valid(), f"Username '{uname}' should be invalid")

    def test_spaces_rejected(self):
        s = RegistrationSerializer(data=registration_data(username="john doe"))
        self.assertFalse(s.is_valid())

    def test_duplicate_username_rejected(self):
        User.objects.create_user(
            username="johndoe", email="other@example.com", password=VALID_PASSWORD
        )
        s = RegistrationSerializer(data=registration_data(username="johndoe"))
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationNames(TestCase):
    """Validation for first_name and last_name."""

    def test_valid_names(self):
        s = RegistrationSerializer(
            data=registration_data(first_name="Mary Jane", last_name="Van Der Berg")
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_name_with_numbers_rejected(self):
        s = RegistrationSerializer(data=registration_data(first_name="John123"))
        self.assertFalse(s.is_valid())
        self.assertIn("first_name", s.errors)

    def test_name_with_symbols_rejected(self):
        s = RegistrationSerializer(data=registration_data(last_name="Doe$"))
        self.assertFalse(s.is_valid())
        self.assertIn("last_name", s.errors)

    def test_empty_names_rejected(self):
        s = RegistrationSerializer(data=registration_data(first_name="", last_name=""))
        self.assertFalse(s.is_valid())


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationMissingFields(TestCase):
    """Tests for missing required fields (other than email/password)."""

    def test_missing_username(self):
        data = registration_data()
        data.pop("username")
        s = RegistrationSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)
