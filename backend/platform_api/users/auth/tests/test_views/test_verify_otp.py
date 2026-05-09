from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status as http_status

from users.auth.tests.common import (
    TEST_FERNET_KEY,
    INVALID_OTP,
    TenantTestCase,
    create_user,
    generate_valid_otp,
    otp_data,
)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPViewSuccess(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("verify-otp-list")
        self.user, self.raw_secret = create_user(
            username="verifyview", email="verifyview@example.com"
        )

    def test_returns_200(self):
        code = generate_valid_otp(self.raw_secret)
        resp = self.client.post(
            self.url, otp_data(email="verifyview@example.com", otp=code), format="json"
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)

    def test_sets_access_token_cookie(self):
        code = generate_valid_otp(self.raw_secret)
        resp = self.client.post(
            self.url, otp_data(email="verifyview@example.com", otp=code), format="json"
        )
        self.assertIn("access_token", resp.cookies)

    def test_sets_refresh_token_cookie(self):
        code = generate_valid_otp(self.raw_secret)
        resp = self.client.post(
            self.url, otp_data(email="verifyview@example.com", otp=code), format="json"
        )
        self.assertIn("refresh_token", resp.cookies)

    def test_marks_user_as_verified(self):
        code = generate_valid_otp(self.raw_secret)
        self.client.post(
            self.url, otp_data(email="verifyview@example.com", otp=code), format="json"
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_otp_verified)

    def test_response_contains_success_message(self):
        code = generate_valid_otp(self.raw_secret)
        resp = self.client.post(
            self.url, otp_data(email="verifyview@example.com", otp=code), format="json"
        )
        self.assertIn("message", resp.data)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestVerifyOTPViewInvalid(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("verify-otp-list")
        self.user, _ = create_user(
            username="verifybadview", email="verifybadview@example.com"
        )

    def test_invalid_otp_returns_400(self):
        resp = self.client.post(
            self.url,
            otp_data(email="verifybadview@example.com", otp=INVALID_OTP),
            format="json",
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_invalid_otp_does_not_set_cookies(self):
        resp = self.client.post(
            self.url,
            otp_data(email="verifybadview@example.com", otp=INVALID_OTP),
            format="json",
        )
        self.assertNotIn("access_token", resp.cookies)

    def test_user_stays_unverified(self):
        self.client.post(
            self.url,
            otp_data(email="verifybadview@example.com", otp=INVALID_OTP),
            format="json",
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_otp_verified)
