import pytest
import time
from unittest.mock import MagicMock
from app.cache import (
    get_cache,
    set_cache,
    delete_cache,
    delete_cache_pattern,
    invalidate_user_cache,
    invalidate_admin_cache,
    check_rate_limit_redis,
    record_rate_limit_attempt_redis,
    _in_memory_cache,
)


def test_in_memory_cache_hit_and_miss():
    key = "test:unit:hit_miss"
    # Ensure clean state
    delete_cache(key)
    assert get_cache(key) is None

    # Set cache with value
    assert set_cache(key, {"foo": "bar", "count": 42}, ttl_seconds=60) is True

    # Get cache hit
    val = get_cache(key)
    assert val is not None
    assert val["foo"] == "bar"
    assert val["count"] == 42

    # Delete cache
    delete_cache(key)
    assert get_cache(key) is None


def test_cache_pattern_invalidation():
    set_cache("cache:goals:u_999_all", [{"id": 1}], ttl_seconds=60)
    set_cache("cache:stats:u_999_today", {"hours": 5.0}, ttl_seconds=60)
    set_cache("cache:matrix:u_999_2026-11-03", [{"task": "dev"}], ttl_seconds=60)
    set_cache("cache:other:u_111", {"ignore": True}, ttl_seconds=60)

    # Invalidate for user 999
    invalidate_user_cache(999)

    assert get_cache("cache:goals:u_999_all") is None
    assert get_cache("cache:stats:u_999_today") is None
    assert get_cache("cache:matrix:u_999_2026-11-03") is None
    assert get_cache("cache:other:u_111") is not None

    # Clean up
    delete_cache("cache:other:u_111")


def test_admin_cache_invalidation():
    set_cache("cache:admin:overview", {"total": 10}, ttl_seconds=60)
    set_cache("cache:admin:traffic", {"visits": 100}, ttl_seconds=60)

    invalidate_admin_cache()

    assert get_cache("cache:admin:overview") is None
    assert get_cache("cache:admin:traffic") is None


def test_cache_fallback_when_redis_error(monkeypatch):
    import app.cache as cache_module

    # Create broken mock redis that raises exceptions
    mock_broken_redis = MagicMock()
    mock_broken_redis.get.side_effect = Exception("Redis connection timed out")
    mock_broken_redis.setex.side_effect = Exception("Redis host unreachable")

    monkeypatch.setattr(cache_module, "_redis_client", mock_broken_redis)

    test_key = "test:broken_redis:fallback"
    # Set should catch exception and write to memory cache
    assert set_cache(test_key, "fallback_value", ttl_seconds=60) is True

    # Get should catch exception and read from memory cache
    val = get_cache(test_key)
    assert val == "fallback_value"

    delete_cache(test_key)


def test_rate_limit_redis_and_fallback(monkeypatch):
    import app.cache as cache_module

    # When no redis client, check_rate_limit_redis returns None (allowing memory fallback)
    monkeypatch.setattr(cache_module, "_redis_client", None)
    assert check_rate_limit_redis("test_ip", 5, 60) is None

    # When redis throws exception, returns None smoothly without raising
    mock_broken_redis = MagicMock()
    mock_broken_redis.pipeline.side_effect = Exception("Pipeline failure")
    monkeypatch.setattr(cache_module, "_redis_client", mock_broken_redis)

    assert check_rate_limit_redis("test_ip", 5, 60) is None
    # record attempt should also not crash
    record_rate_limit_attempt_redis("test_ip", 60)
