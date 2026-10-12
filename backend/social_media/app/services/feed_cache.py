"""Optional Redis cache for serialized, user-scoped feed responses."""

import json
import logging
from datetime import date, datetime
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if not settings.redis_url:
        return None
    if _client is None:
        try:
            from redis.asyncio import Redis
        except ImportError:
            logger.warning("REDIS_URL is configured but the redis package is not installed")
            return None
        _client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def get_feed_cache(key: str) -> Any | None:
    client = _get_client()
    if client is None:
        return None
    try:
        cached = await client.get(key)
        return json.loads(cached) if cached else None
    except Exception:
        logger.warning("Feed cache read failed; falling back to the database", exc_info=True)
        return None


async def set_feed_cache(key: str, value: Any) -> None:
    client = _get_client()
    if client is None:
        return

    def serialize(item):
        if isinstance(item, (datetime, date)):
            return item.isoformat()
        raise TypeError(f"Cannot serialize {type(item).__name__}")

    try:
        await client.set(
            key,
            json.dumps(value, default=serialize, separators=(",", ":")),
            ex=max(1, settings.feed_cache_ttl_seconds),
        )
    except Exception:
        logger.warning("Feed cache write failed; the database response is still available", exc_info=True)


async def invalidate_feed_cache(user_id: int) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        await client.delete(f"feed:all:v2:user:{user_id}")
    except Exception:
        logger.warning("Feed cache invalidation failed", exc_info=True)


async def close_feed_cache() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
