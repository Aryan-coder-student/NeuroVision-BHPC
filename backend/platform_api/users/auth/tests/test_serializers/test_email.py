from django.test import TestCase, override_settings
from users.models import User
from users.auth.serializers import RegistrationSerializer
from users.auth.tests.common import (
    TEST_FERNET_KEY,
    VALID_PASSWORD,
    registration_data,
)

@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestEmailValidation(TestCase):

    def test_valid_email_passes(self):
        s = RegistrationSerializer(data=registration_data(email="valid@example.com"))
        self.assertTrue(s.is_valid(), s.errors)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            username="existing", email="testuser@example.com", password=VALID_PASSWORD
        )
        s = RegistrationSerializer(data=registration_data(email="testuser@example.com"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_invalid_email_format_rejected(self):
        s = RegistrationSerializer(data=registration_data(email="not-an-email"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_missing_email_rejected(self):
        data = registration_data()
        data.pop("email")
        s = RegistrationSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_empty_email_rejected(self):
        s = RegistrationSerializer(data=registration_data(email=""))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_null_email_rejected(self):
        s = RegistrationSerializer(data=registration_data(email=None))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_email_with_spaces_rejected(self):
        s = RegistrationSerializer(data=registration_data(email="test user@example.com"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)
