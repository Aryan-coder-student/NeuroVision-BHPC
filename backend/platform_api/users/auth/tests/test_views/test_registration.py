from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.models import User
from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase, registration_data


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationViewSuccess(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("register-list")

    @patch("users.auth.service.email_service")
    def test_returns_201(self, mock_email):
        resp = self.client.post(self.url, registration_data(), format="json")
        self.assertEqual(resp.status_code, http_status.HTTP_201_CREATED)

    @patch("users.auth.service.email_service")
    def test_user_created_in_db(self, mock_email):
        self.client.post(self.url, registration_data(), format="json")
        self.assertTrue(User.objects.filter(email="testuser@example.com").exists())

    @patch("users.auth.service.email_service")
    def test_sends_otp_email(self, mock_email):
        self.client.post(self.url, registration_data(), format="json")
        mock_email.send.assert_called_once()

    @patch("users.auth.service.email_service")
    def test_response_contains_email(self, mock_email):
        resp = self.client.post(self.url, registration_data(), format="json")
        self.assertEqual(resp.data["email"], "testuser@example.com")


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestRegistrationViewValidation(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("register-list")

    def test_missing_fields_returns_400(self):
        resp = self.client.post(self.url, {"email": "x@x.com"}, format="json")
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_password_mismatch_returns_400(self):
        resp = self.client.post(
            self.url,
            registration_data(password_confirm="Differ3nt!Pass"),
            format="json",
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_weak_password_returns_400(self):
        resp = self.client.post(
            self.url,
            registration_data(password="123", password_confirm="123"),
            format="json",
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_invalid_username_returns_400(self):
        resp = self.client.post(
            self.url,
            registration_data(username="1bad"),
            format="json",
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)
