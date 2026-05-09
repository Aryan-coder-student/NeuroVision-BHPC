from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.auth.tests.common import (
    TEST_FERNET_KEY,
    TenantTestCase,
    create_user,
    get_authenticated_client,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestProfileViewAuthenticated(TenantTestCase):
    def setUp(self):
        self.url = reverse("profile-list")
        self.user, _ = create_user(
            username="profileview",
            email="profileview@example.com",
            is_otp_verified=True,
            first_name="Profile",
            last_name="View",
        )
        self.client = get_authenticated_client(self.user)

    def test_returns_200(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    def test_response_contains_email(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.data["user"]["email"], "profileview@example.com")

    def test_response_contains_username(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.data["user"]["username"], "profileview")

    def test_response_contains_first_name(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.data["user"]["first_name"], "Profile")

    def test_response_contains_last_name(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.data["user"]["last_name"], "View")


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestProfileViewAnonymous(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("profile-list")

    def test_anonymous_user_rejected(self):
        resp = self.client.get(self.url)
        self.assertIn(
            resp.status_code,
            [
                http_status.HTTP_401_UNAUTHORIZED,
                http_status.HTTP_403_FORBIDDEN,
            ],
        )
