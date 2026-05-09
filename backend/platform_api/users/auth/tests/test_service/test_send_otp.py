from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from users.auth.service import UserService
from users.auth.tests.common import TEST_FERNET_KEY, create_user


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestSendOTPEmail(TestCase):

    def setUp(self):
        self.user, _ = create_user(username="sendotp", email="sendotp@example.com")

    @patch("users.auth.service.email_service")
    def test_sends_email_to_user(self, mock_email):
        UserService.send_otp(self.user)
        mock_email.send.assert_called_once()

    @patch("users.auth.service.email_service")
    def test_email_recipient_is_user_email(self, mock_email):
        UserService.send_otp(self.user)
        recipient = mock_email.send.call_args[0][0]
        self.assertEqual(recipient, "sendotp@example.com")

    @patch("users.auth.service.email_service")
    def test_email_subject_contains_verify(self, mock_email):
        UserService.send_otp(self.user)
        subject = mock_email.send.call_args[0][1]
        self.assertIn("Verify", subject)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestSendOTPTimestamp(TestCase):

    def setUp(self):
        self.user, _ = create_user(username="sendts", email="sendts@example.com")

    @patch("users.auth.service.email_service")
    def test_updates_last_otp_sent_at(self, mock_email):
        before = timezone.now()
        UserService.send_otp(self.user)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_otp_sent_at)
        self.assertGreaterEqual(self.user.last_otp_sent_at, before)

    @patch("users.auth.service.email_service")
    def test_saves_user_to_db(self, mock_email):
        UserService.send_otp(self.user)
        self.user.refresh_from_db()
        # last_otp_sent_at is persisted
        self.assertIsNotNone(self.user.last_otp_sent_at)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestSendOTPBody(TestCase):

    def setUp(self):
        self.user, _ = create_user(username="sendbody", email="sendbody@example.com")

    @patch("users.auth.service.email_service")
    def test_body_contains_six_digit_code(self, mock_email):
        UserService.send_otp(self.user)
        body = mock_email.send.call_args[0][2]
        self.assertRegex(body, r"\d{6}")

    @patch("users.auth.service.email_service")
    def test_body_mentions_otp(self, mock_email):
        UserService.send_otp(self.user)
        body = mock_email.send.call_args[0][2]
        self.assertIn("OTP", body)
