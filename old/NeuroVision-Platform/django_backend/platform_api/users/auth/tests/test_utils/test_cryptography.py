from django.test import TestCase, override_settings
from users.auth.utils import Cryptography
from users.auth.tests.common import TEST_FERNET_KEY
@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestCryptographyEncrypt(TestCase):

    def setUp(self):
        self.crypto = Cryptography()

    def test_returns_string(self):
        self.assertIsInstance(self.crypto.encrypt("hello"), str)

    def test_ciphertext_differs_from_plaintext(self):
        ct = self.crypto.encrypt("hello")
        self.assertNotEqual(ct, "hello")

    def test_two_encryptions_differ(self):
        """Fernet uses a nonce; same plaintext ≠ same ciphertext."""
        ct1 = self.crypto.encrypt("same")
        ct2 = self.crypto.encrypt("same")
        self.assertNotEqual(ct1, ct2)


@override_settings(ENCRYPTION_KEY=TEST_FERNET_KEY)
class TestCryptographyDecrypt(TestCase):

    def setUp(self):
        self.crypto = Cryptography()

    def test_returns_string(self):
        ct = self.crypto.encrypt("hello")
        self.assertIsInstance(self.crypto.decrypt(ct), str)

    def test_roundtrip(self):
        plaintext = "JBSWY3DPEHPK3PXP"
        ct = self.crypto.encrypt(plaintext)
        self.assertEqual(self.crypto.decrypt(ct), plaintext)

    def test_tampered_ciphertext_raises(self):
        ct = self.crypto.encrypt("secret")
        with self.assertRaises(Exception):
            self.crypto.decrypt(ct[:-4] + "XXXX")

    def test_empty_string_raises(self):
        with self.assertRaises(Exception):
            self.crypto.decrypt("")
