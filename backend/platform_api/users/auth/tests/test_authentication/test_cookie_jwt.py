from unittest.mock import patch
from django.test import TestCase, RequestFactory, override_settings
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User
from users.auth.authentication import CookieJWTAuthentication
from users.auth.tests.common import TEST_FERNET_KEY


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestCookieAuthTokenResolution(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.auth = CookieJWTAuthentication()
        self.user = User.objects.create_user(
            username="authuser", email="auth@example.com", password="Str0ngP@ssword!"
        )
        self.refresh = RefreshToken.for_user(self.user)

    def test_authenticates_from_cookie(self):
        request = self.factory.get("/")
        request.COOKIES["access_token"] = str(self.refresh.access_token)
        user, _ = self.auth.authenticate(request)
        self.assertEqual(user.pk, self.user.pk)

    def test_returns_none_without_token(self):
        request = self.factory.get("/")
        self.assertIsNone(self.auth.authenticate(request))

    def test_header_takes_precedence(self):
        request = self.factory.get(
            "/", HTTP_AUTHORIZATION=f"Bearer {self.refresh.access_token}"
        )
        request.COOKIES["access_token"] = "stale-cookie"
        user, _ = self.auth.authenticate(request)
        self.assertEqual(user.pk, self.user.pk)

    def test_invalid_token_raises(self):
        request = self.factory.get("/")
        request.COOKIES["access_token"] = "not-a-jwt"
        with self.assertRaises(Exception):
            self.auth.authenticate(request)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestCookieAuthCSRF(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.auth = CookieJWTAuthentication()
        self.user = User.objects.create_user(
            username="csrfuser", email="csrf@example.com", password="Str0ngP@ssword!"
        )
        self.token = str(RefreshToken.for_user(self.user).access_token)

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_enforced_on_post(self, mock_csrf):
        request = self.factory.post("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_called_once()

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_enforced_on_put(self, mock_csrf):
        request = self.factory.put("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_called_once()

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_enforced_on_delete(self, mock_csrf):
        request = self.factory.delete("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_called_once()

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_not_enforced_on_get(self, mock_csrf):
        request = self.factory.get("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_not_called()

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_not_enforced_on_head(self, mock_csrf):
        request = self.factory.head("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_not_called()

    @patch("users.auth.authentication.enforce_csrf")
    def test_csrf_not_enforced_on_options(self, mock_csrf):
        request = self.factory.options("/")
        request.COOKIES["access_token"] = self.token
        self.auth.authenticate(request)
        mock_csrf.assert_not_called()
