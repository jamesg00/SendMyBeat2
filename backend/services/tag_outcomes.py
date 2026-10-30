"""What happened to videos uploaded through SendMyBeat, fed back into tag scores.

On upload we record the video and its tags. Seven and 28 days later we read its views (one
videos.list call covers 50 videos for 1 quota unit). Each video is compared with its producer's
typical upload, so a big channel doesn't make every tag look good, and each tag gets a track
record: how its videos did against their channel's normal. Tags with enough videos behind them
then gain or lose a few points in scoring.
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any, Optional

logger = logging.getLogger(__name__)

OUTCOMES = "tag_outcomes"
PERFORMANCE = "tag_performance"
CHECKPOINT_DAYS = (7, 28)
# A tag needs this many tracked videos before its record moves its score.
MIN_VIDEOS = int(os.environ.get("TAG_OUTCOME_MIN_VIDEOS", "3"))
MAX_BOOST = float(os.environ.get("TAG_OUTCOME_MAX_BOOST", "10"))
# Points per doubling (or halving) of views against the channel's normal.
BOOST_PER_DOUBLING = 6.0
# A producer needs this many tracked uploads for their own baseline; otherwise everyone's is used.
MIN_BASELINE_VIDEOS = 3
COLLECT_INTERVAL_SECONDS = int(os.environ.get("TAG_OUTCOME_COLLECT_INTERVAL_SECONDS", str(6 * 3600)))
BATCH = 50


def _key(tag: str) -> str:
    return " ".join(str(tag or "").lower().split())


def _utc(value: Any) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def record_upload(
    db: Any,
    *,
    user_id: str,
    video_id: str,
    tags: list[str],
    run_id: str | None,
    buckets: dict[str, str] | None = None,
    now: datetime | None = None,
) -> None:
    """Remember an upload so its views can be checked later."""
    keys = [k for k in dict.fromkeys(_key(tag) for tag in tags) if k]
    if not video_id or not keys:
        return
    await db[OUTCOMES].update_one(
        {"video_id": video_id},
        {
            "$setOnInsert": {
                "video_id": video_id,
                "user_id": user_id,
                "run_id": run_id,
                "tags": keys,
                "buckets": {k: (buckets or {}).get(k) for k in keys if (buckets or {}).get(k)},
                "uploaded_at": now or datetime.now(timezone.utc),
                "checkpoints": {},
            }
        },
        upsert=True,
    )


def _fetch_views(youtube: Any, video_ids: list[str]) -> dict[str, dict[str, int]]:
    payload = youtube.videos().list(part="statistics", id=",".join(video_ids), maxResults=len(video_ids)).execute()
    out: dict[str, dict[str, int]] = {}
    for item in payload.get("items") or []:
        stats = item.get("statistics") or {}
        out[item.get("id")] = {
            "views": int(stats.get("viewCount") or 0),
            "likes": int(stats.get("likeCount") or 0),
            "comments": int(stats.get("commentCount") or 0),
        }
    return out


async def collect_checkpoints(db: Any, youtube: Any, *, now: datetime | None = None, max_batches: int = 4) -> dict[str, int]:
    """Read views for uploads that just reached a checkpoint. Deleted or private videos are marked
    missing so they aren't asked about again."""
    now = now or datetime.now(timezone.utc)
    stats = {"checked": 0, "missing": 0, "api_calls": 0}
    for days in CHECKPOINT_DAYS:
        field = f"checkpoints.d{days}"
        for _ in range(max_batches):
            due = await db[OUTCOMES].find(
                {"uploaded_at": {"$lte": now - timedelta(days=days)}, field: {"$exists": False}},
                {"_id": 0, "video_id": 1},
            ).to_list(BATCH)
            ids = [doc["video_id"] for doc in due if doc.get("video_id")]
            if not ids:
                break
            try:
                views = await asyncio.to_thread(_fetch_views, youtube, ids)
            except Exception as exc:
                logger.warning("Checking upload views failed: %s", exc)
                return stats
            stats["api_calls"] += 1
            for video_id in ids:
                result = views.get(video_id)
                value = {**result, "at": now} if result else {"missing": True, "at": now}
                stats["missing" if not result else "checked"] += 1
                await db[OUTCOMES].update_one({"video_id": video_id}, {"$set": {f"checkpoints.d{days}": value}})
    return stats


def _views_at(doc: dict) -> Optional[tuple[int, int]]:
    """(checkpoint day, views) using the latest checkpoint the video has."""
    checkpoints = doc.get("checkpoints") or {}
    for days in sorted(CHECKPOINT_DAYS, reverse=True):
        point = checkpoints.get(f"d{days}")
        if isinstance(point, dict) and not point.get("missing") and "views" in point:
            return days, int(point["views"])
    return None


def relative_performance(docs: list[dict]) -> dict[str, float]:
    """log2(views / that producer's typical views at the same checkpoint), per video."""
    by_day_user: dict[tuple[int, str], list[int]] = {}
    by_day: dict[int, list[int]] = {}
    seen: dict[str, tuple[int, int, str]] = {}
    for doc in docs:
        point = _views_at(doc)
        if not point:
            continue
        days, views = point
        user = str(doc.get("user_id") or "")
        seen[doc["video_id"]] = (days, views, user)
        by_day_user.setdefault((days, user), []).append(views)
        by_day.setdefault(days, []).append(views)

    out: dict[str, float] = {}
    for video_id, (days, views, user) in seen.items():
        own = by_day_user.get((days, user), [])
        pool = own if len(own) >= MIN_BASELINE_VIDEOS else by_day.get(days, [])
        if len(pool) < MIN_BASELINE_VIDEOS:
            continue
        baseline = max(1.0, float(median(pool)))
        out[video_id] = math.log2((views + 1) / (baseline + 1))
    return out


async def rebuild_performance(db: Any, *, now: datetime | None = None, limit: int = 5000) -> dict[str, int]:
    """Recompute every tag's track record from the uploads checked so far."""
    now = now or datetime.now(timezone.utc)
    docs = await db[OUTCOMES].find(
        {"$or": [{f"checkpoints.d{d}": {"$exists": True}} for d in CHECKPOINT_DAYS]},
        {"_id": 0, "video_id": 1, "user_id": 1, "tags": 1, "checkpoints": 1},
    ).to_list(limit)
    rel = relative_performance(docs)
    per_tag: dict[str, list[float]] = {}
    for doc in docs:
        score = rel.get(doc.get("video_id"))
        if score is None:
            continue
        for key in doc.get("tags") or []:
            per_tag.setdefault(key, []).append(score)
    for key, scores in per_tag.items():
        await db[PERFORMANCE].update_one(
            {"tag_key": key},
            {"$set": {"tag_key": key, "videos": len(scores), "mean_log_rel": sum(scores) / len(scores), "updated_at": now}},
            upsert=True,
        )
    return {"videos": len(rel), "tags": len(per_tag)}


def boost_for(record: dict | None) -> float:
    """Score points from a tag's track record: about +6 per doubling of views against the channel's
    normal, capped at ±10, and nothing until MIN_VIDEOS videos back it up."""
    if not record or int(record.get("videos") or 0) < MIN_VIDEOS:
        return 0.0
    return max(-MAX_BOOST, min(MAX_BOOST, float(record.get("mean_log_rel") or 0) * BOOST_PER_DOUBLING))


async def load_track_record(db: Any, tags: list[str]) -> dict[str, dict]:
    keys = [k for k in dict.fromkeys(_key(tag) for tag in tags) if k]
    if not keys or db is None:
        return {}
    try:
        docs = await db[PERFORMANCE].find({"tag_key": {"$in": keys}}, {"_id": 0}).to_list(len(keys))
    except Exception as exc:
        logger.warning("Loading tag track records failed: %s", exc)
        return {}
    return {doc["tag_key"]: doc for doc in docs if doc.get("tag_key")}


async def collect_loop(db: Any, youtube_factory: Any) -> None:
    """Every few hours: read views for uploads at a checkpoint, then refresh track records."""
    while True:
        try:
            youtube = youtube_factory()
            if youtube is not None:
                stats = await collect_checkpoints(db, youtube)
                if stats["checked"] or stats["missing"]:
                    logger.info("Upload outcomes: %s; track records: %s", stats, await rebuild_performance(db))
        except Exception as exc:
            logger.warning("Upload outcome collection failed: %s", exc)
        await asyncio.sleep(COLLECT_INTERVAL_SECONDS)
