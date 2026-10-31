import json
from typing import Any, Mapping

import urllib3
from urllib3.exceptions import HTTPError, MaxRetryError, TimeoutError as Urllib3TimeoutError

from .exceptions import (
    ProviderProtocolError,
    ProviderRejectedRequest,
    ProviderTimeout,
    ProviderUnavailable,
)


class ProviderHTTPTransport:
    """Small urllib3 boundary shared by provider-specific adapters."""

    def __init__(self, pool: urllib3.PoolManager | None = None):
        self._pool = pool or urllib3.PoolManager()

    def post_json(
        self,
        url: str,
        *,
        payload: Mapping[str, Any],
        timeout_seconds: float,
        token: str,
    ) -> Mapping[str, Any]:
        response = self._request(
            url,
            json_payload=payload,
            timeout_seconds=timeout_seconds,
            token=token,
        )
        return self._decode_response(response)

    def post_multipart(
        self,
        url: str,
        *,
        fields: Mapping[str, Any],
        timeout_seconds: float,
        token: str,
    ) -> Mapping[str, Any]:
        response = self._request(
            url,
            fields=fields,
            timeout_seconds=timeout_seconds,
            token=token,
        )
        return self._decode_response(response)

    def _request(
        self,
        url: str,
        *,
        timeout_seconds: float,
        token: str,
        json_payload: Mapping[str, Any] | None = None,
        fields: Mapping[str, Any] | None = None,
    ):
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request_arguments: dict[str, Any] = {
            "headers": headers,
            "timeout": urllib3.Timeout(total=timeout_seconds),
            "retries": False,
        }
        if json_payload is not None:
            request_arguments["json"] = dict(json_payload)
        if fields is not None:
            request_arguments["fields"] = dict(fields)
            request_arguments["encode_multipart"] = True
        try:
            return self._pool.request("POST", url, **request_arguments)
        except MaxRetryError as error:
            if isinstance(error.reason, Urllib3TimeoutError):
                raise ProviderTimeout() from error
            raise ProviderUnavailable() from error
        except Urllib3TimeoutError as error:
            raise ProviderTimeout() from error
        except HTTPError as error:
            raise ProviderUnavailable() from error

    @staticmethod
    def _decode_response(response) -> Mapping[str, Any]:
        if 400 <= response.status < 500:
            raise ProviderRejectedRequest()
        if response.status < 200 or response.status >= 300:
            raise ProviderUnavailable()
        try:
            payload = json.loads(response.data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ProviderProtocolError() from error
        if not isinstance(payload, dict):
            raise ProviderProtocolError()
        return payload


def provider_endpoint(base_url: str, path: str) -> str:
    """Join provider origin and task-specific route once for both adapters."""
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"
