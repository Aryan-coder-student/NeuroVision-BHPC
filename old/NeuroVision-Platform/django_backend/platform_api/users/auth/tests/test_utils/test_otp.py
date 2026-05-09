import pyotp
from unittest.mock import patch
from django.test import TestCase
from users.auth.utils import OTP

class TestOTPGenerate(TestCase):

    def setUp(self):
        self.secret = pyotp.random_base32()
        self.otp = OTP(self.secret)

    def test_returns_string(self):
        self.assertIsInstance(self.otp.generate(), str)

    def test_returns_six_digits(self):
        code = self.otp.generate()
        self.assertTrue(code.isdigit())
        self.assertEqual(len(code), 6)

    def test_delegates_to_totp_now(self):
        with patch.object(pyotp.TOTP, "now", return_value="654321") as m:
            result = self.otp.generate()
            m.assert_called_once()
            self.assertEqual(result, "654321")


class TestOTPVerify(TestCase):

    def setUp(self):
        self.secret = pyotp.random_base32()
        self.otp = OTP(self.secret)

    def test_valid_otp_accepted(self):
        code = self.otp.generate()
        self.assertTrue(self.otp.verify(code))

    def test_invalid_otp_rejected(self):
        self.assertFalse(self.otp.verify("000000"))

    def test_wrong_secret_rejected(self):
        other = OTP(pyotp.random_base32())
        code = other.generate()
        self.assertFalse(self.otp.verify(code))

    def test_empty_string_rejected(self):
        self.assertFalse(self.otp.verify(""))

    def test_non_numeric_rejected(self):
        self.assertFalse(self.otp.verify("abcdef"))
