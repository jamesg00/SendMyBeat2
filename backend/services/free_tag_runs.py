"""Daily runs of the free (no-account) tag generator.

Each visitor gets FREE_TAG_RUNS_PER_DAY runs (default 3) per day, counted on the Pacific day
(the same day youtube_quota counts on, since free runs spend YouTube search quota). A visitor is
judged by two keys, a hash of their network address and a hash of the random id the page keeps in
the browser, and the higher of the two counts is what they've used. Clearing browser storage gives
a new visitor id but the address count still stands, and a new network doesn't reset the id count.

On top of that, every free run counts toward a site-wide daily cap (FREE_TAG_DAILY_CAP in
server.py), which protects the YouTube search quota.

Counts live in `free_tag_uses`, one doc per key per day:
"ip:<hash>:<day>", "visitor:<hash>:<day>" and "site:<day>". The collection's unique index on `key`
predates this (it held one "ip:<hash>" / "visitor:<hash>" doc per visitor, forever); the day in the
new keys keeps them unique, and the old docs are simply never read again. Every check and count is
one conditional update, so two tabs at once can't both take the last run. A run that fails gives
its counts back.

A database error refuses the run (fails closed): this cap is what keeps the free page from eating
the paid users' search quota.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from .youtube_quota import quota_day

logger = logging.getLogger(__name__)

FREE_TAG_RUNS_PER_DAY = max(1, int(os.environ.get("FREE_TAG_RUNS_PER_DAY", "3")))

COLLECTION = "free_tag_uses"
# Counter docs are dropped by a TTL index on expires_at a couple of days after their day.
KEEP_DAYS = 3

# try_reserve_run results
RESERVED = "reserved"
USED_UP = "used_up"
BUSY = "busy"
ERROR = "error"


def day_key(base_key: str, day: str) -> str:
    """"ip:<hash>" -> "ip:<hash>:<day>"."""
    return f"{base_key}:{day}"


def site_key(day: str) -> str:
    return f"site:{day}"


def _collection(db: Any) -> Any:
    return db[COLLECTION]


def _per_day(per_day: int | None) -> int:
    return FREE_TAG_RUNS_PER_DAY if per_day is None else max(0, int(per_day))


async def _counts(db: Any, keys: list[str]) -> dict[str, int]:
    docs = await _collection(db).find({"key": {"$in": keys}}, {"_id": 0, "key": 1, "count": 1}).to_list(len(keys) or 1)
    out = {key: 0 for key in keys}
    for doc in docs or []:
        if doc.get("key") in out:
            out[doc["key"]] = int(doc.get("count") or 0)
    return out


async def _try_inc(db: Any, key: str, cap: int, now: datetime) -> bool:
    """Add one to `key` if it is still under `cap`. Raises on database errors."""
    collection = _collection(db)
    stamp = now.isoformat()
    try:
        await collection.update_one(
            {"key": key},
            {
                "$setOnInsert": {
                    "key": key,
                    "kind": key.split(":", 1)[0],
                    "count": 0,
                    "created_at": stamp,
                    "expires_at": now + timedelta(days=KEEP_DAYS),
                }
            },
            upsert=True,
        )
    except Exception as exc:  # a racing insert hits the unique index; the doc exists either way
        logger.debug("Free tag counter insert for %s: %s", key, exc)
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


async def _give_back(db: Any, keys: Iterable[str]) -> None:
    for key in keys:
        try:
            await _dec(db, key)
        except Exception as exc:
            logger.warning("Could not give back free tag count %s: %s", key, exc)


async def runs_used_today(db: Any, base_keys: list[str], now: datetime | None = None) -> int:
    """Runs this visitor used today: the higher of their address and visitor-id counts.

    Raises on database errors (the caller decides what to show)."""
    day = quota_day(now)
    keys = [day_key(base, day) for base in base_keys]
    if not keys:
        return 0
    counts = await _counts(db, keys)
    return max(counts.values())


async def site_used_today(db: Any, now: datetime | None = None) -> int:
    key = site_key(quota_day(now))
    return (await _counts(db, [key]))[key]


async def try_reserve_run(
    db: Any,
    base_keys: list[str],
    now: datetime | None = None,
    *,
    per_day: int | None = None,
    site_cap: int,
) -> tuple[str, str]:
    """Reserve one free run for the visitor identified by `base_keys` (["ip:<hash>", "visitor:<hash>"]).

    Returns (result, day). result is RESERVED, USED_UP (this visitor used today's runs), BUSY (the
    site used today's free runs) or ERROR (counts couldn't be written; refuse the run). Pass `day`
    to release_run if the run fails. Anything taken before a refusal is given back.
    """
    now = now or datetime.now(timezone.utc)
    day = quota_day(now)
    if db is None:
        return ERROR, day
    cap = _per_day(per_day)
    taken: list[str] = []
    try:
        for base in base_keys:
            key = day_key(base, day)
            if not await _try_inc(db, key, cap, now):
                await _give_back(db, taken)
                return USED_UP, day
            taken.append(key)
        if not await _try_inc(db, site_key(day), int(site_cap), now):
            await _give_back(db, taken)
            return BUSY, day
    except Exception as exc:
        logger.warning("Could not count a free tag run: %s", exc)
        await _give_back(db, taken)
        return ERROR, day
    return RESERVED, day


async def release_run(db: Any, base_keys: list[str], day: str) -> None:
    """Give back a reserved run (it failed). Pass the day try_reserve_run returned."""
    if db is None:
        return
    await _give_back(db, [day_key(base, day) for base in base_keys] + [site_key(day)])
