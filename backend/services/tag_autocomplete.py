"""Search demand for tags from YouTube's search autocomplete (no API quota).

A phrase people search a lot is suggested after only a few words are typed, near the top of the
list. A phrase nobody searches is never suggested, even when typed in full. We type each tag one
word at a time and note how early, and how high, it shows up.

Suggestions are cached per prefix and shared by every user, and tags that start the same way
("future type beat", "future codeine type beat") share their lookups.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Callable, Optional

import requests

logger = logging.getLogger(__name__)

AUTOCOMPLETE_URL = "https://suggestqueries.google.com/complete/search"
AUTOCOMPLETE_CACHE_COLLECTION = "tag_autocomplete_cache"
AUTOCOMPLETE_CACHE_TTL_SECONDS = int(os.environ.get("TAG_AUTOCOMPLETE_CACHE_TTL_SECONDS", str(7 * 24 * 3600)))
# Uncached autocomplete requests per generation; prefixes beyond this are left unknown.
AUTOCOMPLETE_MAX_FETCHES = int(os.environ.get("TAG_AUTOCOMPLETE_MAX_FETCHES", "80"))
AUTOCOMPLETE_CONCURRENCY = 6
AUTOCOMPLETE_TIMEOUT_SECONDS = 4
# Stop asking for the rest of a run after this many failures in a row (blocked or offline).
AUTOCOMPLETE_FAILURE_LIMIT = 3
MAX_PREFIX_WORDS = 6

# Demand when autocomplete couldn't tell us anything: neither rewarded nor ruled out.
UNKNOWN_DEMAND = 45.0
NOT_SUGGESTED_DEMAND = 10.0


def normalize_phrase(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def prefixes_for(tag: str) -> list[str]:
    """The tag typed one word at a time: "a b c" -> ["a", "a b", "a b c"]."""
    words = normalize_phrase(tag).split()[:MAX_PREFIX_WORDS]
    return [" ".join(words[:k]) for k in range(1, len(words) + 1)]


def fetch_suggestions(prefix: str) -> Optional[list[str]]:
    """YouTube's suggestions for what's typed so far, or None when the request fails."""
    try:
        response = requests.get(
            AUTOCOMPLETE_URL,
            params={"client": "firefox", "ds": "yt", "hl": "en", "q": prefix},
            timeout=AUTOCOMPLETE_TIMEOUT_SECONDS,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if response.status_code != 200:
            logger.warning("Autocomplete returned %s for %r", response.status_code, prefix)
            return None
        payload = response.json()
    except Exception as exc:
        logger.warning("Autocomplete failed for %r: %s", prefix, exc)
        return None
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        return None
    return [normalize_phrase(item) for item in payload[1] if isinstance(item, str) and item.strip()]


def demand_from_suggestions(tag: str, suggestions_by_prefix: dict[str, Optional[list[str]]]) -> tuple[Optional[float], dict[str, Any]]:
    """0-100 search demand for a tag from the suggestions for each of its prefixes.

    Suggested before it's fully typed: 55-100, higher the fewer words it took and the higher it
    ranked. Suggested only once fully typed: about 30-38 (a real but small query). Never
    suggested: 10. Prefixes we couldn't look up make the answer unknown (None).
    """
    key = normalize_phrase(tag)
    prefixes = prefixes_for(key)
    words = len(key.split())
    if not prefixes:
        return None, {"found": False}
    all_known = True
    for typed, prefix in enumerate(prefixes, start=1):
        suggestions = suggestions_by_prefix.get(prefix)
        if suggestions is None:
            all_known = False
            continue
        if key not in suggestions:
            continue
        position = suggestions.index(key)
        evidence = {"found": True, "words_typed": typed, "words": words, "position": position}
        if typed < words:
            early = (words - typed) / words
            return max(40.0, min(100.0, 55 + 45 * early - 3 * position)), evidence
        return max(20.0, 38 - 2 * position), evidence
    if all_known:
        return NOT_SUGGESTED_DEMAND, {"found": False}
    return None, {"found": False, "unknown": True}


def _is_fresh(doc: Optional[dict[str, Any]], ttl_seconds: int) -> bool:
    fetched_at = (doc or {}).get("fetched_at")
    if not isinstance(fetched_at, str):
        return False
    try:
        fetched = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    except ValueError:
        return False
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - fetched).total_seconds() <= ttl_seconds


async def autocomplete_demand(
    db: Any,
    tags: list[str],
    *,
    fetcher: Callable[[str], Optional[list[str]]] = fetch_suggestions,
    max_fetches: int = AUTOCOMPLETE_MAX_FETCHES,
    ttl_seconds: int = AUTOCOMPLETE_CACHE_TTL_SECONDS,
) -> tuple[dict[str, tuple[Optional[float], dict[str, Any]]], dict[str, int]]:
    """Demand for each tag (keyed by normalized tag), looking prefixes up in priority order."""
    needed: list[str] = []
    for tag in tags:
        for prefix in prefixes_for(tag):
            if prefix not in needed:
                needed.append(prefix)

    suggestions: dict[str, Optional[list[str]]] = {}
    collection = db[AUTOCOMPLETE_CACHE_COLLECTION] if db is not None else None
    if collection is not None and needed:
        try:
            docs = await collection.find({"prefix": {"$in": needed}}, {"_id": 0}).to_list(len(needed))
        except Exception as exc:
            logger.warning("Autocomplete cache read failed: %s", exc)
            docs = []
        for doc in docs:
            if _is_fresh(doc, ttl_seconds) and isinstance(doc.get("suggestions"), list):
                suggestions[doc["prefix"]] = doc["suggestions"]
    cache_hits = len(suggestions)

    to_fetch = [prefix for prefix in needed if prefix not in suggestions][: max(0, max_fetches)]
    semaphore = asyncio.Semaphore(AUTOCOMPLETE_CONCURRENCY)
    failures = {"in_a_row": 0, "total": 0}
    fetched = 0

    async def lookup(prefix: str) -> None:
        nonlocal fetched
        async with semaphore:
            if failures["in_a_row"] >= AUTOCOMPLETE_FAILURE_LIMIT:
                return
            result = await asyncio.to_thread(fetcher, prefix)
            if result is None:
                failures["in_a_row"] += 1
                failures["total"] += 1
                return
            failures["in_a_row"] = 0
            fetched += 1
            suggestions[prefix] = result
            if collection is not None:
                now = datetime.now(timezone.utc).isoformat()
                try:
                    await collection.update_one(
                        {"prefix": prefix},
                        {"$set": {"prefix": prefix, "suggestions": result, "fetched_at": now}},
                        upsert=True,
                    )
                except Exception as exc:
                    logger.warning("Autocomplete cache write failed: %s", exc)

    await asyncio.gather(*(lookup(prefix) for prefix in to_fetch))

    demand = {normalize_phrase(tag): demand_from_suggestions(tag, suggestions) for tag in tags}
    stats = {
        "prefixes_needed": len(needed),
        "cache_hits": cache_hits,
        "fetched": fetched,
        "failed": failures["total"],
        "skipped": max(0, len(needed) - cache_hits - len(to_fetch)),
    }
    return demand, stats
