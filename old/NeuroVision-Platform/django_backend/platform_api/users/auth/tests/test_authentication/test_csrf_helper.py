from unittest.mock import patch
from django.test import TestCase, RequestFactory
from rest_framework import exceptions
from users.auth.authentication import enforce_csrf

class TestEnforceCSRF(TestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def test_does_not_raise_on_valid_csrf(self):
        request = self.factory.post("/")
        with patch("users.auth.authentication.CSRFCheck") as MockCheck:
            instance = MockCheck.return_value
            instance.process_request.return_value = None
            instance.process_view.return_value = None
            enforce_csrf(request)  # should not raise

    def test_raises_permission_denied_on_failure(self):
        request = self.factory.post("/")
        with patch("users.auth.authentication.CSRFCheck") as MockCheck:
            instance = MockCheck.return_value
            instance.process_request.return_value = None
            instance.process_view.return_value = "CSRF cookie not set."
            with self.assertRaises(exceptions.PermissionDenied):
                enforce_csrf(request)
