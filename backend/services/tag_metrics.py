"""Tag scoring: search demand from YouTube autocomplete, competition from a few YouTube searches,
and relevance to the query, combined into one 0-100 score per tag."""

from __future__ import annotations

import asyncio
import logging
import math
import os
import re
from datetime import datetime, timezone
from statistics import median
from typing import Any, Callable

logger = logging.getLogger(__name__)

TAG_MIN_PUBLISH_SCORE = int(os.environ.get("TAG_MIN_PUBLISH_SCORE", "58"))
TAG_METRICS_MAX_LOOKUPS = int(os.environ.get("TAG_METRICS_MAX_LOOKUPS", "40"))
TAG_METRICS_CACHE_TTL_SECONDS = int(os.environ.get("TAG_METRICS_CACHE_TTL_SECONDS", str(14 * 24 * 3600)))
# YouTube API units one tag generation may spend (artist lookup included). A search costs 100.
TAG_QUOTA_BUDGET_UNITS = int(os.environ.get("TAG_QUOTA_BUDGET_UNITS", "300"))
YOUTUBE_SEARCH_COST = 100
# Competition for tags we never searched: neither rewarded nor ruled out.
UNKNOWN_COMPETITION = 50.0
# Demand for tags autocomplete couldn't tell us about (same value as tag_autocomplete.UNKNOWN_DEMAND).
UNKNOWN_DEMAND = 45.0
TAG_SCORE_DEMAND_WEIGHT = float(os.environ.get("TAG_SCORE_DEMAND_WEIGHT", "0.45"))
TAG_SCORE_COMPETITION_WEIGHT = float(os.environ.get("TAG_SCORE_COMPETITION_WEIGHT", "0.25"))
TAG_SCORE_RELEVANCE_WEIGHT = float(os.environ.get("TAG_SCORE_RELEVANCE_WEIGHT", "0.30"))
TAG_MIN_PACK_SIZE = int(os.environ.get("TAG_MIN_PACK_SIZE", "15"))
TAG_RELAXED_SCORE_DELTA = int(os.environ.get("TAG_RELAXED_SCORE_DELTA", "5"))
TAG_MAX_PUBLISH_COUNT = int(os.environ.get("TAG_MAX_PUBLISH_COUNT", "50"))

TAG_KEYWORD_CACHE_COLLECTION = "tag_keyword_cache"
YOUTUBE_TAGS_CHAR_LIMIT = 500


def youtube_tags_char_count(tags: list[str]) -> int:
    """Characters YouTube counts toward its 500 limit: tags joined by commas, and a tag that
    contains a space is wrapped in quotes, which count too."""
    clean = [str(tag or "").strip() for tag in tags or []]
    clean = [tag for tag in clean if tag]
    if not clean:
        return 0
    return sum(len(tag) + (2 if " " in tag else 0) for tag in clean) + len(clean) - 1


# Rough share of the 500 characters each kind of tag should get, so a list isn't all one kind.
TAG_BUCKET_SHARE = {"core": 0.40, "crossover": 0.25, "sound": 0.20, "long_tail": 0.15}
# Always keep this many of the best-scoring tags, whatever their kind.
TAG_SET_ANCHORS = 1
_FILLER_TOKENS = {"type", "beat", "beats", "instrumental", "x"}


def tag_bucket(tag: str, artist_name: str = "") -> str:
    """crossover: "a x b" or another artist's type beat. long_tail: five words or more.
    core: the artist's own type-beat tags. sound: genre / mood tags without "type beat"."""
    key = normalize_tag_key(tag)
    artist_key = normalize_tag_key(artist_name)
    words = key.split()
    if " x " in f" {key} ":
        return "crossover"
    if len(words) >= 5:
        return "long_tail"
    if "type beat" in key:
        return "core" if artist_key and artist_key in key else "crossover"
    return "sound"


def _tag_cost(tag: str, first: bool) -> int:
    return len(tag) + (2 if " " in tag else 0) + (0 if first else 1)


def _content_tokens(tag: str) -> set[str]:
    return {token for token in normalize_tag_key(tag).split() if token not in _FILLER_TOKENS}


def select_tag_set(
    entries: list[dict[str, Any]],
    *,
    artist_name: str = "",
    limit: int = YOUTUBE_TAGS_CHAR_LIMIT,
) -> list[str]:
    """Choose the set of tags that best fills YouTube's character limit.

    The best tag always goes in. After that each pick weighs a tag's score (squared, so quality
    leads), how much new it adds (word overlap with tags already chosen), whether its kind already
    has its share of the space, and its length (mildly, so more good tags fit). Returned best first.
    """
    pool: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in entries:
        tag = str(entry.get("tag") or "").strip()
        key = normalize_tag_key(tag)
        if tag and key not in seen:
            seen.add(key)
            pool.append({"tag": tag, "score": float(entry.get("score") or 0), "bucket": tag_bucket(tag, artist_name)})
    pool.sort(key=lambda item: -item["score"])

    picked: list[dict[str, Any]] = []
    used = 0
    bucket_chars = {bucket: 0 for bucket in TAG_BUCKET_SHARE}

    def take(item: dict[str, Any]) -> None:
        nonlocal used
        cost = _tag_cost(item["tag"], first=not picked)
        picked.append(item)
        used += cost
        bucket_chars[item["bucket"]] += cost
        pool.remove(item)

    for item in list(pool[:TAG_SET_ANCHORS]):
        if used + _tag_cost(item["tag"], first=not picked) <= limit:
            take(item)

    while pool:
        best, best_value = None, 0.0
        for item in pool:
            cost = _tag_cost(item["tag"], first=not picked)
            if used + cost > limit:
                continue
            over_share = bucket_chars[item["bucket"]] / limit - TAG_BUCKET_SHARE[item["bucket"]]
            bucket_factor = 1.0 if over_share <= 0 else max(0.4, 1 - 2 * over_share)
            tokens = _content_tokens(item["tag"])
            overlap = max(
                (len(tokens & _content_tokens(other["tag"])) / len(tokens | _content_tokens(other["tag"])) for other in picked),
                default=0.0,
            ) if tokens else 0.0
            value = item["score"] ** 2 * bucket_factor * (1 - 0.5 * overlap) / cost ** 0.35
            if value > best_value:
                best, best_value = item, value
        if best is None:
            break
        take(best)

    picked.sort(key=lambda item: -item["score"])
    return [item["tag"] for item in picked]


def fit_tags_to_char_limit(tags: list[str], limit: int = YOUTUBE_TAGS_CHAR_LIMIT) -> list[str]:
    """Keep tags in order (best first) while they fit under YouTube's limit. A tag that doesn't fit
    is skipped rather than ending the list, so shorter tags further down can use the space left."""
    kept: list[str] = []
    used = 0
    for tag in tags or []:
        clean = str(tag or "").strip()
        if not clean:
            continue
        cost = len(clean) + (2 if " " in clean else 0) + (1 if kept else 0)
        if used + cost > limit:
            continue
        kept.append(clean)
        used += cost
    return kept


def normalize_tag_key(tag: str) -> str:
    return re.sub(r"\s+", " ", str(tag or "").strip().lower())


def normalize_demand_score(median_views: int) -> float:
    if median_views <= 0:
        return 8.0
    # log-scale: ~1k→28, ~10k→40, ~100k→55, ~1M→75, ~2M→82
    scaled = (math.log10(median_views + 1) / math.log10(2_000_000)) * 100
    return max(5.0, min(100.0, scaled))


def normalize_competition_score(total_results: int) -> float:
    if total_results <= 0:
        return 5.0
    if total_results < 300:
        return 18.0
    if total_results < 2_000:
        return 55.0
    if total_results < 25_000:
        return 85.0
    if total_results < 200_000:
        return 92.0
    if total_results < 1_500_000:
        return 72.0
    return 48.0


def fetch_tag_youtube_metrics(youtube: Any, tag: str, include_views: bool = True) -> dict[str, Any]:
    """Sync YouTube search (100 units) for one tag query, plus view stats (1 unit) if asked."""
    clean_tag = str(tag or "").strip()
    empty: dict[str, Any] = {
        "tag": clean_tag,
        "total_results": 0,
        "median_views": 0,
        "avg_views": 0,
        "top_titles": [],
        "video_count_sampled": 0,
    }
    if not clean_tag or youtube is None:
        return empty

    try:
        search_payload = (
            youtube.search()
            .list(q=clean_tag, part="snippet", type="video", maxResults=5, safeSearch="none")
            .execute()
        )
    except Exception as exc:
        logger.warning("YouTube search failed for tag %r: %s", clean_tag, exc)
        return empty

    total_results = int((search_payload.get("pageInfo") or {}).get("totalResults") or 0)
    items = search_payload.get("items") or []
    video_ids: list[str] = []
    top_titles: list[str] = []
    for item in items:
        vid = (item.get("id") or {}).get("videoId")
        if vid:
            video_ids.append(vid)
        title = (item.get("snippet") or {}).get("title") or ""
        if title:
            top_titles.append(title)

    phrase = normalize_tag_key(clean_tag)
    exact_title_matches = sum(1 for title in top_titles if phrase and phrase in normalize_tag_key(title))

    view_counts: list[int] = []
    if video_ids and include_views:
        try:
            stats_payload = (
                youtube.videos()
                .list(part="statistics,snippet", id=",".join(video_ids))
                .execute()
            )
            for item in stats_payload.get("items") or []:
                raw_views = (item.get("statistics") or {}).get("viewCount")
                try:
                    view_counts.append(int(raw_views or 0))
                except (TypeError, ValueError):
                    view_counts.append(0)
        except Exception as exc:
            logger.warning("YouTube video stats failed for tag %r: %s", clean_tag, exc)

    med_views = int(median(view_counts)) if view_counts else 0
    avg_views = int(sum(view_counts) / len(view_counts)) if view_counts else 0
    return {
        "tag": clean_tag,
        "total_results": total_results,
        "median_views": med_views,
        "avg_views": avg_views,
        "top_titles": top_titles[:5],
        "video_count_sampled": len(view_counts),
        "exact_title_matches": exact_title_matches,
        "searched": True,
    }


def competition_from_metrics(metrics: dict[str, Any] | None) -> float | None:
    """0-100, higher = easier to rank. None when this tag was never searched on YouTube."""
    if not metrics or not (metrics.get("searched") or int(metrics.get("total_results") or 0) > 0):
        return None
    score = normalize_competition_score(int(metrics.get("total_results") or 0))
    titles = metrics.get("top_titles") or []
    if titles:
        # Top results that already use the exact phrase in their title are harder to beat.
        share = int(metrics.get("exact_title_matches") or 0) / len(titles)
        score *= 1 - 0.35 * share
    return max(5.0, min(100.0, score))


def compute_composite_tag_score(
    *,
    metrics: dict[str, Any],
    relevance_score: float,
    relevance_reason: str = "",
    demand: float | None = None,
    demand_known: bool = True,
) -> dict[str, Any]:
    """With `demand` (autocomplete, 0-100) it drives the score and unsearched tags get neutral
    competition; without it, the older view-count proxy is used. `demand_known=False` marks a
    neutral placeholder demand (autocomplete unavailable)."""
    if demand is not None:
        demand_norm = max(0.0, min(100.0, float(demand)))
        competition = competition_from_metrics(metrics)
        competition_norm = UNKNOWN_COMPETITION if competition is None else competition
    else:
        demand_norm = normalize_demand_score(int(metrics.get("median_views") or 0))
        competition_norm = normalize_competition_score(int(metrics.get("total_results") or 0))
    relevance_norm = max(0.0, min(100.0, float(relevance_score)))

    raw = (
        TAG_SCORE_DEMAND_WEIGHT * demand_norm
        + TAG_SCORE_COMPETITION_WEIGHT * competition_norm
        + TAG_SCORE_RELEVANCE_WEIGHT * relevance_norm
    )
    composite = max(1, min(100, round(raw)))

    med = int(metrics.get("median_views") or 0)
    total = int(metrics.get("total_results") or 0)
    if demand is not None:
        if not demand_known:
            reason = relevance_reason or "Search demand unknown; scored on relevance."
        elif demand_norm >= 55:
            reason = "Suggested by YouTube search after only part of it is typed, so people search it often."
        elif demand_norm >= 20:
            reason = "A real YouTube search, but a smaller one."
        else:
            reason = "YouTube search doesn't suggest this phrase, so few people search it."
    elif composite >= 60:
        reason = (
            f"Strong YouTube demand proxy ({med:,} median views on top results) "
            f"with workable competition ({total:,} matching videos)."
        )
    elif composite >= TAG_MIN_PUBLISH_SCORE:
        reason = (
            f"Acceptable search demand ({med:,} median views) for this niche query."
        )
    else:
        reason = relevance_reason or "Low demand/competition signals on YouTube for this exact phrase."

    return {
        "score": composite,
        "demand": round(demand_norm, 1),
        "competition": round(competition_norm, 1),
        "relevance": round(relevance_norm, 1),
        "reason": reason,
        "monthly_search_proxy": med,
        "total_results": total,
        "demand_source": ("autocomplete" if demand_known else "unknown") if demand is not None else "views",
        "competition_known": demand is None or competition_from_metrics(metrics) is not None,
    }


def tag_signals(breakdown: dict[str, Any] | None) -> dict[str, str]:
    """Plain labels for the app: demand high/medium/low and competition low/medium/high, or
    "unknown" when we have no real data (older runs scored on view counts count as unknown)."""
    breakdown = breakdown or {}
    demand = "unknown"
    if breakdown.get("demand_source") == "autocomplete":
        value = float(breakdown.get("demand") or 0)
        demand = "high" if value >= 55 else "medium" if value >= 20 else "low"
    competition = "unknown"
    if breakdown.get("competition_known") and breakdown.get("demand_source") in ("autocomplete", "unknown"):
        value = float(breakdown.get("competition") or 0)
        competition = "low" if value >= 70 else "medium" if value >= 40 else "high"
    return {"demand": demand, "competition": competition}


def _cache_is_fresh(doc: dict[str, Any] | None, ttl_seconds: int) -> bool:
    if not doc:
        return False
    fetched_at = doc.get("fetched_at")
    if not isinstance(fetched_at, str) or not fetched_at.strip():
        return False
    try:
        fetched_dt = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
        if fetched_dt.tzinfo is None:
            fetched_dt = fetched_dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    age = (datetime.now(timezone.utc) - fetched_dt).total_seconds()
    return age <= ttl_seconds


async def get_cached_tag_metrics(db: Any, tag_key: str, ttl_seconds: int) -> dict[str, Any] | None:
    if db is None or not tag_key:
        return None
    doc = await db[TAG_KEYWORD_CACHE_COLLECTION].find_one({"tag_key": tag_key}, {"_id": 0})
    if not _cache_is_fresh(doc, ttl_seconds):
        return None
    metrics = doc.get("metrics")
    return metrics if isinstance(metrics, dict) else None


async def set_cached_tag_metrics(db: Any, tag_key: str, metrics: dict[str, Any]) -> None:
    if db is None or not tag_key:
        return
    now = datetime.now(timezone.utc).isoformat()
    await db[TAG_KEYWORD_CACHE_COLLECTION].update_one(
        {"tag_key": tag_key},
        {
            "$set": {
                "tag_key": tag_key,
                "metrics": metrics,
                "fetched_at": now,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def build_scored_tag_entry(
    *,
    tag: str,
    source: str,
    metrics: dict[str, Any],
    composite: dict[str, Any],
    relevance_entry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    breakdown = {
        "demand": composite.get("demand"),
        "competition": composite.get("competition"),
        "relevance": composite.get("relevance"),
        "monthly_search_proxy": composite.get("monthly_search_proxy"),
        "demand_source": composite.get("demand_source"),
        "competition_known": composite.get("competition_known"),
        "total_results": composite.get("total_results"),
        "median_views": metrics.get("median_views"),
        "avg_views": metrics.get("avg_views"),
    }
    if isinstance(relevance_entry, dict) and isinstance(relevance_entry.get("breakdown"), dict):
        breakdown["relevance_detail"] = relevance_entry.get("breakdown")

    return {
        "tag": tag,
        "score": int(composite.get("score") or 0),
        "reason": str(composite.get("reason") or ""),
        "breakdown": breakdown,
        "signals": tag_signals(breakdown),
        "source": source,
        "feedback_counts": (relevance_entry or {}).get("feedback_counts") or {"kept": 0, "removed": 0},
    }


async def resolve_tag_metrics(
    *,
    youtube: Any,
    db: Any,
    tag: str,
    ttl_seconds: int,
    api_calls_counter: list[int],
) -> dict[str, Any]:
    tag_key = normalize_tag_key(tag)
    cached = await get_cached_tag_metrics(db, tag_key, ttl_seconds)
    if cached is not None:
        return cached

    metrics = await asyncio.to_thread(fetch_tag_youtube_metrics, youtube, tag)
    api_calls_counter[0] += 1
    await set_cached_tag_metrics(db, tag_key, metrics)
    return metrics


def prioritize_tags_for_lookup(
    tags_with_sources: list[tuple[str, str]],
    *,
    artist_name: str,
) -> list[tuple[str, str]]:
    artist_key = normalize_tag_key(artist_name)

    def sort_key(item: tuple[str, str]) -> tuple[int, int, str]:
        tag, source = item
        exact = normalize_tag_key(tag)
        source_rank = {
            "youtube": 0,
            "youtube_titles": 0,
            "youtube_tracks": 0,
            "custom": 1,
            "spotify": 2,
            "spotify_tracks": 2,
            "soundcloud": 3,
            "soundcloud_tracks": 3,
            "llm": 4,
            "artist_nest": 0,
        }.get(source, 5)
        has_artist = 0 if artist_key and artist_key in exact else 1
        has_type_beat = 0 if "type beat" in exact else 1
        return (source_rank, has_artist + has_type_beat, exact)

    seen: set[str] = set()
    ordered: list[tuple[str, str]] = []
    for tag, source in sorted(tags_with_sources, key=sort_key):
        key = normalize_tag_key(tag)
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append((tag, source))
    return ordered


async def score_tags_with_youtube_proxy(
    *,
    youtube: Any,
    db: Any,
    tags_with_sources: list[tuple[str, str]],
    query: str,
    artist_name: str,
    beat_tokens: set[str],
    relevance_scorer: Callable[..., dict[str, Any]],
    kept_counts: dict[str, int] | None = None,
    removed_counts: dict[str, int] | None = None,
    source_map: dict[str, str] | None = None,
    min_score: int | None = None,
    max_lookups: int | None = None,
    cache_ttl_seconds: int | None = None,
    quota_budget: list[int] | None = None,
    demand_lookup: Callable[..., Any] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Score every candidate. Returns all scored entries (best first) and a stats dict.

    1. Demand for every tag from YouTube autocomplete (`demand_lookup`, no API quota).
    2. Competition from cached YouTube searches; the best few uncached tags are searched while
       `quota_budget` (remaining API units, shared with the caller) allows.
    3. Relevance from `relevance_scorer`.
    """
    min_score = TAG_MIN_PUBLISH_SCORE if min_score is None else int(min_score)
    max_lookups = TAG_METRICS_MAX_LOOKUPS if max_lookups is None else int(max_lookups)
    cache_ttl = TAG_METRICS_CACHE_TTL_SECONDS if cache_ttl_seconds is None else int(cache_ttl_seconds)
    budget = quota_budget if quota_budget is not None else [TAG_QUOTA_BUDGET_UNITS]
    kept_counts = kept_counts or {}
    removed_counts = removed_counts or {}
    source_map = source_map or {}

    ordered = prioritize_tags_for_lookup(tags_with_sources, artist_name=artist_name)

    demand_by_key: dict[str, tuple[float | None, dict[str, Any]]] = {}
    demand_stats: dict[str, Any] = {"enabled": demand_lookup is not None}
    if demand_lookup is not None and ordered:
        try:
            demand_by_key, lookup_stats = await demand_lookup(db, [tag for tag, _ in ordered])
            demand_stats.update(lookup_stats)
        except Exception as exc:
            logger.warning("Autocomplete demand lookup failed: %s", exc)
            demand_stats["error"] = str(exc)

    relevance_by_key: dict[str, dict[str, Any]] = {}
    metrics_by_key: dict[str, dict[str, Any]] = {}
    cache_hits = 0
    for tag, source in ordered:
        tag_key = normalize_tag_key(tag)
        relevance_by_key[tag_key] = relevance_scorer(
            tag=tag,
            query=query,
            artist_name=artist_name,
            beat_tokens=beat_tokens,
            source=source_map.get(tag_key, source),
            kept_count=kept_counts.get(tag_key, 0),
            removed_count=removed_counts.get(tag_key, 0),
        )
        cached = await get_cached_tag_metrics(db, tag_key, cache_ttl)
        if cached is not None:
            cache_hits += 1
            metrics_by_key[tag_key] = cached

    def demand_of(tag_key: str) -> tuple[float, bool]:
        value, _ = demand_by_key.get(tag_key, (None, {}))
        return (UNKNOWN_DEMAND, False) if value is None else (float(value), True)

    # Spend the remaining YouTube budget on the most promising tags we have no competition data for.
    api_calls = 0
    if youtube is not None:
        unsearched = [(tag, source) for tag, source in ordered if normalize_tag_key(tag) not in metrics_by_key]
        unsearched.sort(
            key=lambda item: -(
                demand_of(normalize_tag_key(item[0]))[0]
                + float(relevance_by_key[normalize_tag_key(item[0])].get("score") or 0)
            )
        )
        for tag, _source in unsearched:
            if api_calls >= max_lookups or budget[0] < YOUTUBE_SEARCH_COST:
                break
            metrics = await asyncio.to_thread(fetch_tag_youtube_metrics, youtube, tag, False)
            budget[0] -= YOUTUBE_SEARCH_COST
            api_calls += 1
            if metrics.get("searched"):
                metrics_by_key[normalize_tag_key(tag)] = metrics
                await set_cached_tag_metrics(db, normalize_tag_key(tag), metrics)

    scored_by_key: dict[str, dict[str, Any]] = {}
    for tag, source in ordered:
        tag_key = normalize_tag_key(tag)
        if tag_key in scored_by_key:
            continue
        relevance_entry = relevance_by_key[tag_key]
        metrics = metrics_by_key.get(tag_key) or {"tag": tag, "total_results": 0, "median_views": 0}
        demand, known = demand_of(tag_key)
        composite = compute_composite_tag_score(
            metrics=metrics,
            relevance_score=float(relevance_entry.get("score") or 0),
            relevance_reason=str(relevance_entry.get("reason") or ""),
            demand=demand,
            demand_known=known,
        )
        entry = build_scored_tag_entry(
            tag=tag,
            source=source_map.get(tag_key, source),
            metrics=metrics,
            composite=composite,
            relevance_entry=relevance_entry,
        )
        entry["breakdown"]["autocomplete"] = demand_by_key.get(tag_key, (None, {}))[1]
        scored_by_key[tag_key] = entry

    scored_list = sorted(
        scored_by_key.values(),
        key=lambda item: (-int(item.get("score") or 0), normalize_tag_key(item.get("tag"))),
    )
    stats = {
        "min_publish_score": min_score,
        "max_lookups": max_lookups,
        "api_calls": api_calls,
        "quota_units_left": budget[0],
        "cache_hits": cache_hits,
        "candidates_considered": len(ordered),
        "candidates_scored": len(scored_by_key),
        "autocomplete": demand_stats,
    }
    return scored_list, stats


def filter_scored_tags_by_threshold(
    scored_tags: list[dict[str, Any]],
    *,
    min_score: int,
) -> tuple[list[str], list[dict[str, Any]], int]:
    """Returns (tag strings, scored entries, effective_min_score used)."""
    passed = [entry for entry in scored_tags if int(entry.get("score") or 0) >= min_score]
    if len(passed) >= TAG_MIN_PACK_SIZE:
        tags = [str(entry.get("tag") or "") for entry in passed if entry.get("tag")]
        return tags, passed, min_score

    relaxed = max(40, min_score - TAG_RELAXED_SCORE_DELTA)
    passed = [entry for entry in scored_tags if int(entry.get("score") or 0) >= relaxed]
    tags = [str(entry.get("tag") or "") for entry in passed if entry.get("tag")]
    return tags, passed, relaxed


def build_artist_nest_candidates(artist_name: str, type_beat_titles: list[str]) -> list[str]:
    """High-intent artist nest queries beyond isolated song seeds."""
    artist = re.sub(r"\s+", " ", str(artist_name or "").strip())
    if not artist:
        return []
    candidates = [
        f"{artist} type beat",
        f"{artist} type beat instrumental",
        f"{artist} x type beat",
        f"free {artist} type beat",
    ]
    for title in type_beat_titles or []:
        clean = re.sub(r"\s+", " ", str(title or "").strip())
        if not clean or "type beat" not in clean.lower():
            continue
        if clean.lower() not in {c.lower() for c in candidates}:
            candidates.append(clean)
    return candidates[:24]
