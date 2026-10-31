import pytest
import os
from starlette.requests import Request
from app.routers.auth import (
    get_client_ip,
    _check_rate_limit,
    _record_failed_attempt,
    _RATE_LIMIT_STORE,
)
from fastapi import HTTPException


def test_get_client_ip_headers():
    # 1. Cloudflare header priority
    scope_cf = {
        "type": "http",
        "headers": [
            (b"cf-connecting-ip", b"103.21.244.2"),
            (b"x-forwarded-for", b"1.1.1.1, 2.2.2.2"),
        ],
    }
    req_cf = Request(scope_cf)
    assert get_client_ip(req_cf) == "103.21.244.2"

    # 2. X-Real-IP fallback
    scope_real = {
        "type": "http",
        "headers": [
            (b"x-real-ip", b"192.168.1.100"),
            (b"x-forwarded-for", b"1.1.1.1, 2.2.2.2"),
        ],
    }
    req_real = Request(scope_real)
    assert get_client_ip(req_real) == "192.168.1.100"

    # 3. X-Forwarded-For last hop fallback
    scope_xff = {
        "type": "http",
        "headers": [
            (b"x-forwarded-for", b"203.0.113.195, 70.41.3.18, 150.172.238.178"),
        ],
    }
    req_xff = Request(scope_xff)
    assert get_client_ip(req_xff) == "150.172.238.178"

    # 4. Unknown / None safe handling
    assert get_client_ip(None) == "unknown"


def test_guest_rate_limiting_enforcement():
    _RATE_LIMIT_STORE.clear()
    key = "guest_write:test_dummy_ip"

    # Under threshold -> pass
    for _ in range(5):
        _check_rate_limit(key, max_attempts=5, window_seconds=60)
        _record_failed_attempt(key)

    # Exceeding threshold -> raises 429
    with pytest.raises(HTTPException) as exc_info:
        _check_rate_limit(key, max_attempts=5, window_seconds=60)
    assert exc_info.value.status_code == 429
    assert "Quá nhiều yêu cầu" in exc_info.value.detail
