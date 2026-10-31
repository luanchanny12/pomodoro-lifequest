"""
Hybrid Cache Module (Redis with Automatic In-Memory LRU Fallback)
Provides high-speed caching (<5ms) for frequently queried data.
Compatible with Upstash Redis, Redis Cloud, or local in-memory fallback.
"""

import os
import json
import logging
from typing import Any, Optional, Dict
from datetime import date, datetime
from cachetools import TTLCache

logger = logging.getLogger("app.cache")

REDIS_URL = os.getenv("REDIS_URL")

_redis_client = None
_in_memory_cache: TTLCache = TTLCache(maxsize=1000, ttl=180)  # default 3 mins fallback

if REDIS_URL:
    try:
        import redis
        # Use short timeout so backend never hangs if Redis is unreachable
        client = redis.from_url(
            REDIS_URL,
            socket_timeout=1.5,
            socket_connect_timeout=1.5,
            decode_responses=True
        )
        # Test connection
        client.ping()
        _redis_client = client
        logger.info("Connected to Redis cache successfully.")
    except Exception as e:
        logger.warning(f"Failed to connect to Redis ({e}). Falling back to In-Memory TTL Cache.")
        _redis_client = None
else:
    logger.info("REDIS_URL not configured. Operating with In-Memory TTL Cache.")


def _json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def get_cache(key: str) -> Optional[Any]:
    """Retrieve an item from cache (Redis or In-Memory). Returns None if miss or expired."""
    global _redis_client
    if _redis_client:
        try:
            val = _redis_client.get(key)
            if val is not None:
                return json.loads(val)
            return None
        except Exception as e:
            logger.warning(f"Redis get error for {key}: {e}. Falling back to memory.")
    
    # In-memory lookup
    try:
        val = _in_memory_cache.get(key)
        if val is not None:
            # Stored as json string or directly as python object
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return val
            return val
    except Exception:
        pass
    return None


def set_cache(key: str, value: Any, ttl_seconds: int = 120) -> bool:
    """Set an item in cache with a TTL (seconds)."""
    global _redis_client
    serialized = None
    try:
        serialized = json.dumps(value, default=_json_serial)
    except Exception as e:
        logger.warning(f"Could not serialize cache value for {key}: {e}")
        return False

    success = False
    if _redis_client:
        try:
            _redis_client.setex(key, ttl_seconds, serialized)
            success = True
        except Exception as e:
            logger.warning(f"Redis set error for {key}: {e}. Falling back to memory.")

    # Always write to memory cache as well for immediate local availability
    try:
        _in_memory_cache[key] = serialized
        success = True
    except Exception:
        pass

    return success


def delete_cache(key: str) -> None:
    """Delete a single cache key."""
    global _redis_client
    if _redis_client:
        try:
            _redis_client.delete(key)
        except Exception as e:
            logger.warning(f"Redis delete error for {key}: {e}")
    try:
        if key in _in_memory_cache:
            del _in_memory_cache[key]
    except Exception:
        pass


def delete_cache_pattern(pattern: str) -> None:
    """Delete all keys matching a wildcard pattern (e.g. 'cache:goals:u_5*')."""
    global _redis_client
    if _redis_client:
        try:
            keys = _redis_client.keys(pattern)
            if keys:
                _redis_client.delete(*keys)
        except Exception as e:
            logger.warning(f"Redis delete pattern error for {pattern}: {e}")

    # For in-memory cache, match prefix/contains
    try:
        clean_prefix = pattern.replace("*", "")
        matching_keys = [k for k in list(_in_memory_cache.keys()) if clean_prefix in k]
        for k in matching_keys:
            del _in_memory_cache[k]
    except Exception:
        pass


def invalidate_user_cache(user_or_id: Any = None) -> None:
    """Invalidate all cached data associated with a user (goals, stats, matrix, race track).
    Safely accepts User model, integer user_id, or None (e.g. Depends defaults).
    """
    user_id = None
    if isinstance(user_or_id, int):
        user_id = user_or_id
    elif user_or_id is not None and hasattr(user_or_id, "id"):
        # Make sure it's not a FastAPI Depends object
        if not type(user_or_id).__name__ == "Depends":
            try:
                user_id = user_or_id.id
            except Exception:
                user_id = None

    uid_str = f"u_{user_id}" if user_id else "u_guest"
    delete_cache_pattern(f"cache:goals:{uid_str}*")
    delete_cache_pattern(f"cache:stats:{uid_str}*")
    delete_cache_pattern(f"cache:matrix:{uid_str}*")
    delete_cache_pattern(f"cache:galaxy:{uid_str}*")
    delete_cache("cache:race:track")
