from unittest.mock import MagicMock

from django.test import SimpleTestCase
from urllib3.exceptions import ReadTimeoutError

from ai_providers.exceptions import (
    ProviderProtocolError,
    ProviderRejectedRequest,
    ProviderTimeout,
    ProviderUnavailable,
)
from ai_providers.transport import ProviderHTTPTransport


class ProviderHTTPTransportTests(SimpleTestCase):
    def setUp(self):
        self.pool = MagicMock()
        self.transport = ProviderHTTPTransport(pool=self.pool)

    def test_timeout_is_normalized_without_leaking_transport_details(self):
        self.pool.request.side_effect = ReadTimeoutError(
            self.pool,
            "https://provider.test",
            "timed out",
        )

        with self.assertRaises(ProviderTimeout):
            self.transport.post_json(
                "https://provider.test/predict",
                payload={"input": "demo"},
                timeout_seconds=3,
                token="",
            )

    def test_provider_4xx_is_distinct_from_provider_unavailability(self):
        self.pool.request.return_value = MagicMock(status=422, data=b'{}')

        with self.assertRaises(ProviderRejectedRequest):
            self.transport.post_json(
                "https://provider.test/predict",
                payload={"input": "demo"},
                timeout_seconds=3,
                token="",
            )

    def test_provider_5xx_is_normalized_as_unavailable(self):
        self.pool.request.return_value = MagicMock(status=503, data=b'{}')

        with self.assertRaises(ProviderUnavailable):
            self.transport.post_json(
                "https://provider.test/predict",
                payload={"input": "demo"},
                timeout_seconds=3,
                token="",
            )

    def test_non_object_json_is_rejected_as_protocol_error(self):
        self.pool.request.return_value = MagicMock(status=200, data=b'[]')

        with self.assertRaises(ProviderProtocolError):
            self.transport.post_json(
                "https://provider.test/predict",
                payload={"input": "demo"},
                timeout_seconds=3,
                token="",
            )
