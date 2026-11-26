"""Daily caps for the free "upload MP3 to YouTube" tool.

Free uploads skip upload credits, so they are capped two ways per YouTube quota day (midnight
Pacific, the same day youtube_quota counts on):

- per account: FREE_UPLOADER_DAILY_PER_USER (default 3)
- site-wide: FREE_UPLOADER_DAILY_GLOBAL (default 40), so paying users keep the rest of the shared
  YouTube upload allowance (YOUTUBE_UPLOAD_DAILY_CAP).

A slot is reserved when the job is created and given back if the job fails. Counts live in
`free_upload_counts`, one doc per key ("global:<day>" and "user:<user_id>:<day>"). Every check and
count is one conditional update, so two requests at once can't both take the last slot.

Unlike the YouTube counters, a database error refuses the free upload: this cap is what stops
free uploads from eating the paid allowance, so it fails closed.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from .youtube_quota import quota_day

logger = logging.getLogger(__name__)

FREE_UPLOADER_DAILY_PER_USER = int(os.environ.get("FREE_UPLOADER_DAILY_PER_USER", "3"))
FREE_UPLOADER_DAILY_GLOBAL = int(os.environ.get("FREE_UPLOADER_DAILY_GLOBAL", "40"))

COLLECTION = "free_upload_counts"

# try_use_free_upload results
RESERVED = "reserved"
USER_CAP = "user_cap"
GLOBAL_CAP = "global_cap"
ERROR = "error"


def global_key(day: str) -> str:
    return f"global:{day}"


def user_key(user_id: str, day: str) -> str:
    return f"user:{user_id}:{day}"


def _collection(db: Any) -> Any:
    return db[COLLECTION]


def _per_user_cap(cap: int | None) -> int:
    return FREE_UPLOADER_DAILY_PER_USER if cap is None else int(cap)


def _global_cap(cap: int | None) -> int:
    return FREE_UPLOADER_DAILY_GLOBAL if cap is None else int(cap)


async def _count(db: Any, key: str) -> int:
    doc = await _collection(db).find_one({"key": key}, {"_id": 0, "count": 1})
    return int((doc or {}).get("count") or 0)


async def _try_inc(db: Any, key: str, cap: int, stamp: str) -> bool:
    """Add one to `key` if it is still under `cap`. Raises on database errors."""
    collection = _collection(db)
    try:
        await collection.update_one(
            {"key": key},
            {"$setOnInsert": {"key": key, "count": 0, "created_at": stamp}},
            upsert=True,
        )
    except Exception as exc:  # a racing insert hits the unique index; the doc exists either way
        logger.debug("Free upload counter insert for %s: %s", key, exc)
    result = await collection.update_one(
        {"key": key, "count": {"$lte": cap - 1}},
        {"$inc": {"count": 1}, "$set": {"updated_at": stamp}},
    )
    return int(getattr(result, "modified_count", 0) or 0) == 1


async def _dec(db: Any, key: str) -> None:
    await _collection(db).update_one(
        {"key": key, "count": {"$gte": 1}},
        {"$inc": {"count": -1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )


async def used_today(db: Any, user_id: str, now: datetime | None = None) -> int:
    """Free uploads this account has used today. 0 when the count can't be read."""
    if db is None:
        return 0
    try:
        return await _count(db, user_key(user_id, quota_day(now)))
    except Exception as exc:
        logger.warning("Could not read the free upload count: %s", exc)
        return 0


async def global_used_today(db: Any, now: datetime | None = None) -> int:
    """Free uploads used site-wide today. 0 when the count can't be read."""
    if db is None:
        return 0
    try:
        return await _count(db, global_key(quota_day(now)))
    except Exception as exc:
        logger.warning("Could not read the site-wide free upload count: %s", exc)
        return 0


async def global_slots_full(db: Any, now: datetime | None = None, *, cap: int | None = None) -> bool:
    return await global_used_today(db, now) >= _global_cap(cap)


async def try_use_free_upload(
    db: Any,
    user_id: str,
    now: datetime | None = None,
    *,
    per_user_cap: int | None = None,
    global_cap: int | None = None,
) -> str:
    """Reserve one free upload for `user_id` today.

    Returns RESERVED, USER_CAP (this account used today's free uploads), GLOBAL_CAP (the site used
    today's free uploads) or ERROR (the count couldn't be written; refuse the upload). The account
    count is taken first and given back if the site-wide count is full.
    """
    if db is None:
        return ERROR
    day = quota_day(now)
    stamp = (now or datetime.now(timezone.utc)).isoformat()
    u_key = user_key(user_id, day)
    try:
        if not await _try_inc(db, u_key, _per_user_cap(per_user_cap), stamp):
            return USER_CAP
    except Exception as exc:
        logger.warning("Could not count a free upload for %s: %s", user_id, exc)
        return ERROR
    try:
        took_global = await _try_inc(db, global_key(day), _global_cap(global_cap), stamp)
    except Exception as exc:
        logger.warning("Could not count a site-wide free upload: %s", exc)
        took_global = None
    if took_global:
        return RESERVED
    try:
        await _dec(db, u_key)
    except Exception as exc:
        logger.warning("Could not give back a free upload for %s: %s", user_id, exc)
    return GLOBAL_CAP if took_global is False else ERROR


async def release_free_upload(db: Any, user_id: str, day: str | None = None) -> None:
    """Give back a free upload (the job failed). Pass the quota day it was reserved on."""
    if db is None:
        return
    day = day or quota_day()
    for key in (user_key(user_id, day), global_key(day)):
        try:
            await _dec(db, key)
        except Exception as exc:
            logger.warning("Could not give back free upload count %s: %s", key, exc)
