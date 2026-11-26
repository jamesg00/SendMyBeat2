"""Trending type beat artists: which "<artist> type beat" searches are rising this week.

Built from the YouTube search autocomplete signal the tag engine already collects
(tag_autocomplete: how early and how high "<artist> type beat" is suggested while it's typed,
cached per prefix in `tag_autocomplete_cache` and shared with every tag run). That cache keeps
only the latest suggestions per prefix, so this module stores its own snapshot of every artist's
score each refresh (`seo_trending_snapshots`, one doc per refresh) and compares it with the
snapshot from about a week earlier. Until a week of snapshots exists, artists are ranked by
current demand and `change` is null: nothing is made up.

Per artist:
- score (0-100): 85% the autocomplete demand of "<artist> type beat" (tag_autocomplete's
  demand_from_suggestions) and 15% how many longer searches YouTube suggests under it
  ("<artist> type beat 2026", "... hard", up to 10). null when autocomplete couldn't be read.
- change: score now minus the score in the snapshot about 7 days earlier, in points. null when
  there is no such snapshot or either score is unknown.
- producer_runs / producer_runs_prev: SendMyBeat tag runs that named the artist in the last 7 days
  and the 7 days before (tag_generations; free no-account runs aren't stored, so not counted).
  These are our own users' runs, not YouTube search volume.

There is no search-volume number anywhere in the data, so `searches` is always null.

The refresh runs in the background (a loop started with the server, and a nudge from the endpoint
when the snapshot is stale), never per request. It reuses fresh cache entries and makes at most
TRENDING_MAX_FETCHES uncached autocomplete requests per refresh; artists it couldn't look up yet
are left out of that refresh and picked up on the next one.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from . import tag_autocomplete
from .trending_artists import TRENDING_ARTISTS, search_name, type_beat_query

logger = logging.getLogger(__name__)

SNAPSHOT_COLLECTION = "seo_trending_snapshots"
WINDOW_DAYS = 7
# The earlier snapshot "change" compares with is the one closest to 7 days back, within this range.
COMPARE_MIN_DAYS = 6
COMPARE_MAX_DAYS = 10
KEEP_SNAPSHOT_DAYS = 60
DEFAULT_LIMIT = 30
DEMAND_WEIGHT = 0.85
BREADTH_POINTS = 1.5  # per suggested longer search, up to MAX_BREADTH
MAX_BREADTH = 10
# The endpoint re-reads the latest snapshot from the database at most this often.
PAYLOAD_MEMORY_SECONDS = 300


def _env_int(name: str, default: int) -> int:
    # Read when used, not at import: server.py loads .env after importing the services.
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def refresh_seconds() -> int:
    return max(600, _env_int("TRENDING_REFRESH_SECONDS", 12 * 3600))


def max_fetches() -> int:
    return max(0, _env_int("TRENDING_MAX_FETCHES", 200))


def autocomplete_ttl_seconds() -> int:
    return max(3600, _env_int("TRENDING_AUTOCOMPLETE_TTL_SECONDS", 3 * 24 * 3600))


def max_generations_scanned() -> int:
    return max(0, _env_int("TRENDING_MAX_GENERATIONS", 20000))


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _plain(text: Any) -> str:
    """A query as search_name() writes artist names, for matching producers' tag runs."""
    value = str(text or "").lower().replace("$", "s").replace("-", " ")
    value = re.sub(r"[.!',]", "", value)
    return re.sub(r"\s+", " ", value).strip()


def breadth(phrase: str, suggestions: Any) -> int:
    """How many longer searches YouTube suggests under `phrase` (0-10)."""
    if not isinstance(suggestions, list):
        return 0
    start = f"{phrase} "
    seen = {tag_autocomplete.normalize_phrase(s) for s in suggestions if isinstance(s, str)}
    return min(MAX_BREADTH, sum(1 for s in seen if s.startswith(start)))


def score_of(demand: Optional[float], breadth_count: Optional[int]) -> Optional[float]:
    if demand is None:
        return None
    return round(min(100.0, DEMAND_WEIGHT * float(demand) + BREADTH_POINTS * int(breadth_count or 0)), 1)


def count_producer_runs(queries: list[tuple[str, Optional[datetime]]], now: datetime) -> dict[str, tuple[int, int]]:
    """Tag runs per artist slug: (last 7 days, the 7 days before). A run counts for an artist when
    its query names the artist as whole words and is a type beat query."""
    week_start = now - timedelta(days=WINDOW_DAYS)
    prev_start = now - timedelta(days=2 * WINDOW_DAYS)
    names = [(slug, f" {search_name(slug, name)} ") for slug, name in TRENDING_ARTISTS]
    counts = {slug: [0, 0] for slug, _ in TRENDING_ARTISTS}
    for query, created in queries:
        if created is None or created < prev_start or created > now:
            continue
        text = f" {_plain(query)} "
        if " type " not in text:
            continue
        slot = 0 if created >= week_start else 1
        for slug, padded in names:
            if padded in text:
                counts[slug][slot] += 1
    return {slug: (c[0], c[1]) for slug, c in counts.items()}


async def _recent_tag_queries(db: Any, now: datetime) -> list[tuple[str, Optional[datetime]]]:
    since = _iso(now - timedelta(days=2 * WINDOW_DAYS))
    limit = max_generations_scanned()
    if limit <= 0:
        return []
    try:
        docs = await db.tag_generations.find(
            {"created_at": {"$gte": since}}, {"_id": 0, "query": 1, "created_at": 1}
        ).to_list(limit)
    except Exception as exc:
        logger.warning("Trending: could not read recent tag runs: %s", exc)
        return []
    return [(doc.get("query") or "", _parse(doc.get("created_at"))) for doc in docs or []]


async def _cached_suggestions(db: Any, phrases: list[str], ttl_seconds: int) -> dict[str, list[str]]:
    try:
        docs = await db[tag_autocomplete.AUTOCOMPLETE_CACHE_COLLECTION].find(
            {"prefix": {"$in": phrases}}, {"_id": 0}
        ).to_list(len(phrases) or 1)
    except Exception as exc:
        logger.warning("Trending: autocomplete cache read failed: %s", exc)
        return {}
    out: dict[str, list[str]] = {}
    for doc in docs or []:
        if tag_autocomplete._is_fresh(doc, ttl_seconds) and isinstance(doc.get("suggestions"), list):
            out[doc["prefix"]] = doc["suggestions"]
    return out


async def _previous_snapshot(db: Any, now: datetime) -> Optional[dict[str, Any]]:
    target = now - timedelta(days=WINDOW_DAYS)
    try:
        docs = await db[SNAPSHOT_COLLECTION].find(
            {"computed_at": {"$gte": _iso(now - timedelta(days=COMPARE_MAX_DAYS)), "$lte": _iso(now - timedelta(days=COMPARE_MIN_DAYS))}},
            {"_id": 0, "computed_at": 1, "artists": 1},
        ).to_list(100)
    except Exception as exc:
        logger.warning("Trending: could not read earlier snapshots: %s", exc)
        return None
    best = None
    best_gap = None
    for doc in docs or []:
        at = _parse(doc.get("computed_at"))
        if at is None or not isinstance(doc.get("artists"), dict):
            continue
        gap = abs((at - target).total_seconds())
        if best_gap is None or gap < best_gap:
            best, best_gap = doc, gap
    return best


def build_payload(
    computed_at: str,
    artists: dict[str, dict[str, Any]],
    previous: Optional[dict[str, Any]],
    *,
    limit: int = DEFAULT_LIMIT,
) -> dict[str, Any]:
    prev_artists = (previous or {}).get("artists") or {}
    rows: list[dict[str, Any]] = []
    for slug, name in TRENDING_ARTISTS:
        data = artists.get(slug) or {}
        score = data.get("score")
        if score is None:
            continue
        prev_score = (prev_artists.get(slug) or {}).get("score")
        change = round(float(score) - float(prev_score), 1) if prev_score is not None else None
        rows.append({
            "name": name,
            "slug": slug,
            "query": type_beat_query(slug, name),
            "score": float(score),
            "change": change,
            "searches": None,
            "producer_runs": int(data.get("runs") or 0),
            "producer_runs_prev": int(data.get("runs_prev") or 0),
        })
    ranked_by_change = any(row["change"] is not None for row in rows)

    def growth(row: dict[str, Any]) -> int:
        return row["producer_runs"] - row["producer_runs_prev"]

    if ranked_by_change:
        rows.sort(key=lambda r: (-(r["change"] or 0.0), -growth(r), -r["score"], r["name"]))
    else:
        rows.sort(key=lambda r: (-r["score"], -growth(r), -r["producer_runs"], r["name"]))
    return {
        "updated_at": computed_at,
        "window_days": WINDOW_DAYS,
        "ranked_by": "change" if ranked_by_change else "demand",
        "compared_to": (previous or {}).get("computed_at") if ranked_by_change else None,
        "artists": rows[: max(0, limit)],
    }


def empty_payload() -> dict[str, Any]:
    return {"updated_at": None, "window_days": WINDOW_DAYS, "ranked_by": "demand", "compared_to": None, "artists": []}


async def compute_snapshot(
    db: Any,
    now: Optional[datetime] = None,
    *,
    fetcher: Callable[[str], Optional[list[str]]] = tag_autocomplete.fetch_suggestions,
    fetch_budget: Optional[int] = None,
    ttl_seconds: Optional[int] = None,
) -> dict[str, Any]:
    """Score every artist, store the snapshot (with its ready-made payload) and return it."""
    now = now or datetime.now(timezone.utc)
    ttl = autocomplete_ttl_seconds() if ttl_seconds is None else int(ttl_seconds)
    budget = max_fetches() if fetch_budget is None else int(fetch_budget)
    queries = {slug: type_beat_query(slug, name) for slug, name in TRENDING_ARTISTS}

    demand, stats = await tag_autocomplete.autocomplete_demand(
        db, list(queries.values()), fetcher=fetcher, max_fetches=budget, ttl_seconds=ttl
    )
    suggestions = await _cached_suggestions(db, list(queries.values()), ttl)
    runs = count_producer_runs(await _recent_tag_queries(db, now), now)

    artists: dict[str, dict[str, Any]] = {}
    for slug, query in queries.items():
        value, evidence = demand.get(query, (None, {}))
        # Unknown demand (prefixes we couldn't look up), or no fresh list for the full phrase,
        # leaves the artist unscored this round rather than scored on half the signal.
        known = value is not None and not (evidence or {}).get("unknown")
        b = breadth(query, suggestions.get(query)) if query in suggestions else None
        this_week, last_week = runs.get(slug, (0, 0))
        artists[slug] = {
            "score": score_of(value, b) if known and b is not None else None,
            "demand": round(float(value), 1) if known else None,
            "breadth": b,
            "runs": this_week,
            "runs_prev": last_week,
        }

    computed_at = _iso(now)
    previous = await _previous_snapshot(db, now)
    payload = build_payload(computed_at, artists, previous)
    doc = {"computed_at": computed_at, "artists": artists, "payload": payload, "stats": stats}
    collection = db[SNAPSHOT_COLLECTION]
    await collection.insert_one(dict(doc))
    try:
        await collection.delete_many({"computed_at": {"$lt": _iso(now - timedelta(days=KEEP_SNAPSHOT_DAYS))}})
    except Exception as exc:
        logger.warning("Trending: could not drop old snapshots: %s", exc)
    scored = sum(1 for a in artists.values() if a["score"] is not None)
    logger.info("Trending snapshot: %s of %s artists scored, autocomplete %s", scored, len(artists), stats)
    return doc


async def latest_snapshot(db: Any) -> Optional[dict[str, Any]]:
    return await db[SNAPSHOT_COLLECTION].find_one(
        {}, {"_id": 0, "computed_at": 1, "payload": 1}, sort=[("computed_at", -1)]
    )


def _is_stale(computed_at: Any, now: datetime) -> bool:
    at = _parse(computed_at)
    return at is None or (now - at).total_seconds() >= refresh_seconds()


_refresh_lock = asyncio.Lock()
_refresh_task: Optional[asyncio.Task] = None
_memory: dict[str, Any] = {"payload": None, "loaded": 0.0}


async def refresh_if_stale(db: Any, now: Optional[datetime] = None, **kwargs: Any) -> bool:
    """Build a new snapshot when the latest one is older than TRENDING_REFRESH_SECONDS.
    Returns True when one was built. Never raises."""
    async with _refresh_lock:
        try:
            now = now or datetime.now(timezone.utc)
            latest = await latest_snapshot(db)
            if latest and not _is_stale(latest.get("computed_at"), now):
                return False
            doc = await compute_snapshot(db, now, **kwargs)
            _memory["payload"] = doc["payload"]
            _memory["loaded"] = time.monotonic()
            return True
        except Exception as exc:
            logger.warning("Trending refresh failed: %s", exc)
            return False


def schedule_refresh(db: Any) -> bool:
    """Start a background refresh unless one is already running. Returns True when started."""
    global _refresh_task
    if _refresh_task is not None and not _refresh_task.done():
        return False
    if _refresh_lock.locked():
        return False
    _refresh_task = asyncio.create_task(refresh_if_stale(db))
    return True


async def current_payload(db: Any, now: Optional[datetime] = None) -> dict[str, Any]:
    """The latest stored payload (kept in memory for a few minutes), nudging a background refresh
    when it's missing or stale. Never fetches from YouTube itself."""
    now = now or datetime.now(timezone.utc)
    payload = _memory.get("payload")
    if payload is None or time.monotonic() - float(_memory.get("loaded") or 0) > PAYLOAD_MEMORY_SECONDS:
        try:
            latest = await latest_snapshot(db)
        except Exception as exc:
            logger.warning("Trending: could not read the latest snapshot: %s", exc)
            latest = None
        if latest and isinstance(latest.get("payload"), dict):
            payload = latest["payload"]
            _memory["payload"] = payload
            _memory["loaded"] = time.monotonic()
    if payload is None or _is_stale(payload.get("updated_at"), now):
        schedule_refresh(db)
    return payload if payload is not None else empty_payload()


async def refresh_loop(db: Any, *, first_delay: float = 120.0, check_every: float = 3600.0) -> None:
    """Background loop started with the server: refresh when the snapshot is stale."""
    await asyncio.sleep(first_delay)
    while True:
        await refresh_if_stale(db)
        await asyncio.sleep(check_every)


def _reset_for_tests() -> None:
    global _refresh_task
    _refresh_task = None
    _memory["payload"] = None
    _memory["loaded"] = 0.0
