from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status
from rest_framework_simplejwt.tokens import RefreshToken

from users.auth.tests.common import (
    TEST_FERNET_KEY,
    TenantTestCase,
    create_user,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLogoutViewSuccess(TenantTestCase):

    def setUp(self):
        self.url = reverse("logout-list")
        self.user, _ = create_user(
            username="logoutview", email="logoutview@example.com", is_otp_verified=True
        )
        # Build authenticated client with both tokens + CSRF
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["access_token"] = str(refresh.access_token)
        self.client.cookies["refresh_token"] = str(refresh)
        csrf_resp = self.client.get(reverse("csrf-list"))
        self.csrf_token = csrf_resp.data["csrf_token"]
        self.client.cookies["csrftoken"] = self.csrf_token

    def test_returns_200(self):
        resp = self.client.post(
            self.url, format="json", HTTP_X_CSRFTOKEN=self.csrf_token
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    def test_response_contains_message(self):
        resp = self.client.post(
            self.url, format="json", HTTP_X_CSRFTOKEN=self.csrf_token
        )
        self.assertIn("message", resp.data)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLogoutViewAuth(TenantTestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("logout-list")

    def test_anonymous_user_rejected(self):
        resp = self.client.post(self.url, format="json")
        self.assertIn(resp.status_code, [
            http_status.HTTP_401_UNAUTHORIZED,
            http_status.HTTP_403_FORBIDDEN,
        ])
