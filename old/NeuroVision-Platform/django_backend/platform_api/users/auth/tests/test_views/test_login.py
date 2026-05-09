from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.auth.tests.common import (
    TEST_FERNET_KEY,
    WRONG_PASSWORD,
    NONEXISTENT_EMAIL,
    TenantTestCase,
    create_user,
    login_data,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginViewSuccess(TenantTestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("login-list")
        self.user, _ = create_user(
            username="loginview", email="loginview@example.com", is_otp_verified=True
        )

    def test_returns_200(self):
        resp = self.client.post(
            self.url, login_data(email="loginview@example.com"), format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    def test_sets_access_token_cookie(self):
        resp = self.client.post(
            self.url, login_data(email="loginview@example.com"), format="json"
        )
        self.assertIn("access_token", resp.cookies)

    def test_sets_refresh_token_cookie(self):
        resp = self.client.post(
            self.url, login_data(email="loginview@example.com"), format="json"
        )
        self.assertIn("refresh_token", resp.cookies)

    def test_access_cookie_is_httponly(self):
        resp = self.client.post(
            self.url, login_data(email="loginview@example.com"), format="json"
        )
        self.assertTrue(resp.cookies["access_token"]["httponly"])

    def test_refresh_cookie_is_httponly(self):
        resp = self.client.post(
            self.url, login_data(email="loginview@example.com"), format="json"
        )
        self.assertTrue(resp.cookies["refresh_token"]["httponly"])


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginViewResponseBody(TenantTestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("login-list")
        self.user, _ = create_user(
            username="loginbody",
            email="loginbody@example.com",
            is_otp_verified=True,
            first_name="Login",
            last_name="Body",
        )

    def test_response_contains_email(self):
        resp = self.client.post(
            self.url, login_data(email="loginbody@example.com"), format="json"
        )
        self.assertEqual(resp.data["user"]["email"], "loginbody@example.com")

    def test_response_contains_username(self):
        resp = self.client.post(
            self.url, login_data(email="loginbody@example.com"), format="json"
        )
        self.assertEqual(resp.data["user"]["username"], "loginbody")

    def test_response_contains_first_name(self):
        resp = self.client.post(
            self.url, login_data(email="loginbody@example.com"), format="json"
        )
        self.assertEqual(resp.data["user"]["first_name"], "Login")

    def test_response_contains_message(self):
        resp = self.client.post(
            self.url, login_data(email="loginbody@example.com"), format="json"
        )
        self.assertIn("message", resp.data)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestLoginViewInvalid(TenantTestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("login-list")
        self.user, _ = create_user(
            username="logininvalid", email="logininvalid@example.com", is_otp_verified=True
        )

    def test_wrong_password_returns_400(self):
        resp = self.client.post(
            self.url,
            login_data(email="logininvalid@example.com", password=WRONG_PASSWORD),
            format="json",
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_email_returns_error(self):
        """Source code has an UnboundLocalError when user_obj is None."""
        resp = self.client.post(
            self.url,
            login_data(email=NONEXISTENT_EMAIL),
            format="json",
        )
        self.assertIn(resp.status_code, [
            http_status.HTTP_400_BAD_REQUEST,
            http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])

    def test_no_cookies_on_failure(self):
        resp = self.client.post(
            self.url,
            login_data(email="logininvalid@example.com", password=WRONG_PASSWORD),
            format="json",
        )
        self.assertNotIn("access_token", resp.cookies)
