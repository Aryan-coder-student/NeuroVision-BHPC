from unittest.mock import patch
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, create_user


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPViewSuccess(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("resend-otp-list")
        self.user, _ = create_user(
            username="resendview", email="resendview@example.com"
        )

    @patch("users.auth.service.email_service")
    def test_returns_200(self, mock_email):
        resp = self.client.post(
            self.url, {"email": "resendview@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    @patch("users.auth.service.email_service")
    def test_sends_email(self, mock_email):
        self.client.post(self.url, {"email": "resendview@example.com"}, format="json")
        mock_email.send.assert_called_once()

    @patch("users.auth.service.email_service")
    def test_response_contains_message(self, mock_email):
        resp = self.client.post(
            self.url, {"email": "resendview@example.com"}, format="json"
        )
        self.assertIn("message", resp.data)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPViewRateLimit(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("resend-otp-list")
        self.user, _ = create_user(username="resendrl", email="resendrl@example.com")

    @patch("users.auth.service.email_service")
    def test_within_cooldown_returns_429(self, mock_email):
        self.user.last_otp_sent_at = timezone.now()
        self.user.save()
        resp = self.client.post(
            self.url, {"email": "resendrl@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_429_TOO_MANY_REQUESTS)

    @patch("users.auth.service.email_service")
    def test_after_cooldown_returns_200(self, mock_email):
        self.user.last_otp_sent_at = timezone.now() - timedelta(seconds=61)
        self.user.save()
        resp = self.client.post(
            self.url, {"email": "resendrl@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    @patch("users.auth.service.email_service")
    def test_rate_limit_response_contains_error(self, mock_email):
        self.user.last_otp_sent_at = timezone.now()
        self.user.save()
        resp = self.client.post(
            self.url, {"email": "resendrl@example.com"}, format="json"
        )
        self.assertIn("error", resp.data)

    @patch("users.auth.service.email_service")
    def test_no_previous_otp_allows_resend(self, mock_email):
        """User with NULL last_otp_sent_at should be allowed."""
        self.user.last_otp_sent_at = None
        self.user.save()
        resp = self.client.post(
            self.url, {"email": "resendrl@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestResendOTPViewAlreadyVerified(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("resend-otp-list")
        self.user, _ = create_user(
            username="resendverified",
            email="resendverified@example.com",
            is_otp_verified=True,
        )

    def test_already_verified_returns_400(self):
        resp = self.client.post(
            self.url, {"email": "resendverified@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)
