from unittest.mock import patch
from django.test import TestCase, override_settings
from users.auth.utils import EmailService


class TestEmailServiceSend(TestCase):
    @patch("users.auth.utils.send_mail")
    def test_calls_django_send_mail(self, mock_send):
        svc = EmailService()
        svc.send("to@example.com", "Subject", "Body")
        mock_send.assert_called_once_with(
            subject="Subject",
            message="Body",
            from_email=svc.from_mail_id,
            recipient_list=["to@example.com"],
            fail_silently=False,
        )

    @patch("users.auth.utils.send_mail")
    def test_custom_from_email(self, mock_send):
        svc = EmailService(from_mail_id="custom@example.com")
        svc.send("to@example.com", "S", "B")
        self.assertEqual(mock_send.call_args.kwargs["from_email"], "custom@example.com")

    @override_settings(DEFAULT_FROM_EMAIL="default@neurovision.com")
    def test_default_from_email_from_settings(self):
        svc = EmailService()
        self.assertEqual(svc.from_mail_id, "default@neurovision.com")
