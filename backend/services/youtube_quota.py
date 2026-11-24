"""A daily count of YouTube search.list calls, shared by every SendMyBeat user.

Google gives the API project a daily search allowance that every user's tag runs draw from.
Each search is counted here before it is made. Once the day's soft cap is reached, tag runs stop
searching and score competition from the cache and demand from autocomplete only, so a busy day
slows tag quality a little instead of failing runs.

The count lives in `system_settings` under one key per quota day. YouTube's quota day resets at
midnight Pacific time.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Searches the project may make in one quota day (confirm against the Google Cloud console).
YOUTUBE_SEARCH_DAILY_CAP = int(os.environ.get("YOUTUBE_SEARCH_DAILY_CAP", "100"))
# Searches kept back from tag runs for everything else that searches (Pros lookups, retries).
YOUTUBE_SEARCH_HEADROOM = int(os.environ.get("YOUTUBE_SEARCH_HEADROOM", "10"))

SETTINGS_COLLECTION = "system_settings"
KEY_PREFIX = "youtube_search_calls:"

try:  # zoneinfo needs tzdata on some systems; a fixed offset is close enough as a fallback.
    from zoneinfo import ZoneInfo

    _PACIFIC: Any = ZoneInfo("America/Los_Angeles")
except Exception:  # pragma: no cover - depends on the host's tz database
    _PACIFIC = timezone(timedelta(hours=-8))


def quota_day(now: datetime | None = None) -> str:
    """The YouTube quota day (Pacific date) for a moment, as YYYY-MM-DD."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return now.astimezone(_PACIFIC).date().isoformat()


def tag_run_limit(cap: int | None = None, headroom: int | None = None) -> int:
    """How many of the day's searches tag runs may use."""
    cap = YOUTUBE_SEARCH_DAILY_CAP if cap is None else cap
    headroom = YOUTUBE_SEARCH_HEADROOM if headroom is None else headroom
    return max(0, cap - headroom)


def _collection(db: Any) -> Any:
    return db[SETTINGS_COLLECTION]


async def searches_used(db: Any, now: datetime | None = None) -> int:
    """Searches counted so far today. 0 when the count can't be read."""
    if db is None:
        return 0
    try:
        doc = await _collection(db).find_one({"key": KEY_PREFIX + quota_day(now)}, {"_id": 0, "search_calls": 1})
    except Exception as exc:
        logger.warning("Could not read the YouTube search count: %s", exc)
        return 0
    return int((doc or {}).get("search_calls") or 0)


async def tag_searches_left(db: Any, now: datetime | None = None, *, limit: int | None = None) -> int:
    """Searches tag runs may still make today."""
    limit = tag_run_limit() if limit is None else limit
    return max(0, limit - await searches_used(db, now))


async def try_use_searches(db: Any, calls: int = 1, now: datetime | None = None, *, limit: int | None = None) -> bool:
    """Count `calls` searches if they fit under today's tag-run limit. True means go ahead.

    The check and the count happen in one conditional update, so two runs at once can't both
    take the last search. If the count can't be written at all, the search is allowed: this is a
    guardrail, and a database hiccup shouldn't stop tag runs.
    """
    calls = max(1, int(calls))
    limit = tag_run_limit() if limit is None else limit
    if db is None:
        return True
    key = KEY_PREFIX + quota_day(now)
    stamp = (now or datetime.now(timezone.utc)).isoformat()
    try:
        collection = _collection(db)
        await collection.update_one(
            {"key": key},
            {"$setOnInsert": {"key": key, "search_calls": 0, "created_at": stamp}},
            upsert=True,
        )
        result = await collection.update_one(
            {"key": key, "search_calls": {"$lte": limit - calls}},
            {"$inc": {"search_calls": calls}, "$set": {"updated_at": stamp}},
        )
    except Exception as exc:
        logger.warning("Could not count YouTube searches, allowing the search: %s", exc)
        return True
    return int(getattr(result, "modified_count", 0) or 0) == 1
