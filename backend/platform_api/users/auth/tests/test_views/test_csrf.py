from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.auth.tests.common import TEST_FERNET_KEY, TenantTestCase


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestCSRFTokenViewReturnsToken(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("csrf-list")

    def test_returns_200(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    def test_response_contains_csrf_token_key(self):
        resp = self.client.get(self.url)
        self.assertIn("csrf_token", resp.data)

    def test_csrf_token_is_non_empty_string(self):
        resp = self.client.get(self.url)
        self.assertIsInstance(resp.data["csrf_token"], str)
        self.assertTrue(len(resp.data["csrf_token"]) > 0)

    def test_accessible_without_authentication(self):
        """CSRF endpoint must be publicly accessible."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)
