"""YouTube-proxy tag demand/competition scoring (vidIQ-inspired composite scores)."""

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
TAG_METRICS_CACHE_TTL_SECONDS = int(os.environ.get("TAG_METRICS_CACHE_TTL_SECONDS", str(7 * 24 * 3600)))
TAG_SCORE_DEMAND_WEIGHT = float(os.environ.get("TAG_SCORE_DEMAND_WEIGHT", "0.45"))
TAG_SCORE_COMPETITION_WEIGHT = float(os.environ.get("TAG_SCORE_COMPETITION_WEIGHT", "0.25"))
TAG_SCORE_RELEVANCE_WEIGHT = float(os.environ.get("TAG_SCORE_RELEVANCE_WEIGHT", "0.30"))
TAG_MIN_PACK_SIZE = int(os.environ.get("TAG_MIN_PACK_SIZE", "15"))
TAG_RELAXED_SCORE_DELTA = int(os.environ.get("TAG_RELAXED_SCORE_DELTA", "5"))
TAG_MAX_PUBLISH_COUNT = int(os.environ.get("TAG_MAX_PUBLISH_COUNT", "50"))

TAG_KEYWORD_CACHE_COLLECTION = "tag_keyword_cache"


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


def fetch_tag_youtube_metrics(youtube: Any, tag: str) -> dict[str, Any]:
    """Sync YouTube search + view stats for one tag query."""
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

    view_counts: list[int] = []
    if video_ids:
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
    }


def compute_composite_tag_score(
    *,
    metrics: dict[str, Any],
    relevance_score: float,
    relevance_reason: str = "",
) -> dict[str, Any]:
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
    if composite >= 60:
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
    }


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
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Score candidates via YouTube metrics + relevance. Returns all scored entries (sorted desc).
    Stats dict includes cache_hits, api_calls, etc.
    """
    min_score = TAG_MIN_PUBLISH_SCORE if min_score is None else int(min_score)
    max_lookups = TAG_METRICS_MAX_LOOKUPS if max_lookups is None else int(max_lookups)
    cache_ttl = TAG_METRICS_CACHE_TTL_SECONDS if cache_ttl_seconds is None else int(cache_ttl_seconds)
    kept_counts = kept_counts or {}
    removed_counts = removed_counts or {}
    source_map = source_map or {}

    ordered = prioritize_tags_for_lookup(tags_with_sources, artist_name=artist_name)
    api_calls = [0]
    cache_hits = 0
    scored_by_key: dict[str, dict[str, Any]] = {}

    for tag, source in ordered:
        if api_calls[0] >= max_lookups and normalize_tag_key(tag) not in scored_by_key:
            break

        tag_key = normalize_tag_key(tag)
        if tag_key in scored_by_key:
            continue

        cached_before = await get_cached_tag_metrics(db, tag_key, cache_ttl)
        if cached_before is not None:
            cache_hits += 1
            metrics = cached_before
        else:
            if api_calls[0] >= max_lookups:
                continue
            metrics = await resolve_tag_metrics(
                youtube=youtube,
                db=db,
                tag=tag,
                ttl_seconds=cache_ttl,
                api_calls_counter=api_calls,
            )

        relevance_entry = relevance_scorer(
            tag=tag,
            query=query,
            artist_name=artist_name,
            beat_tokens=beat_tokens,
            source=source_map.get(tag_key, source),
            kept_count=kept_counts.get(tag_key, 0),
            removed_count=removed_counts.get(tag_key, 0),
        )
        relevance_score = float(relevance_entry.get("score") or 0)
        composite = compute_composite_tag_score(
            metrics=metrics,
            relevance_score=relevance_score,
            relevance_reason=str(relevance_entry.get("reason") or ""),
        )
        scored_by_key[tag_key] = build_scored_tag_entry(
            tag=tag,
            source=source_map.get(tag_key, source),
            metrics=metrics,
            composite=composite,
            relevance_entry=relevance_entry,
        )

    # Tags beyond lookup cap: relevance-only fallback (lower confidence, usually filtered out)
    for tag, source in ordered:
        tag_key = normalize_tag_key(tag)
        if tag_key in scored_by_key:
            continue
        relevance_entry = relevance_scorer(
            tag=tag,
            query=query,
            artist_name=artist_name,
            beat_tokens=beat_tokens,
            source=source_map.get(tag_key, source),
            kept_count=kept_counts.get(tag_key, 0),
            removed_count=removed_counts.get(tag_key, 0),
        )
        relevance_score = float(relevance_entry.get("score") or 0)
        empty_metrics = {
            "tag": tag,
            "total_results": 0,
            "median_views": 0,
            "avg_views": 0,
            "top_titles": [],
            "video_count_sampled": 0,
        }
        composite = compute_composite_tag_score(
            metrics=empty_metrics,
            relevance_score=relevance_score * 0.65,
            relevance_reason="YouTube metrics not fetched (lookup cap); relevance-only estimate.",
        )
        scored_by_key[tag_key] = build_scored_tag_entry(
            tag=tag,
            source=source_map.get(tag_key, source),
            metrics=empty_metrics,
            composite=composite,
            relevance_entry=relevance_entry,
        )

    scored_list = sorted(
        scored_by_key.values(),
        key=lambda item: (-int(item.get("score") or 0), normalize_tag_key(item.get("tag"))),
    )
    stats = {
        "min_publish_score": min_score,
        "max_lookups": max_lookups,
        "api_calls": api_calls[0],
        "cache_hits": cache_hits,
        "candidates_considered": len(ordered),
        "candidates_scored": len(scored_by_key),
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
