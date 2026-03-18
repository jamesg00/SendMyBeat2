from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable

from pydantic import BaseModel


class SpotlightService:
    def __init__(
        self,
        *,
        db,
        logger: logging.Logger,
        refresh_interval_seconds: int,
        spotlight_response_cls,
        spotlight_projection: dict[str, Any],
        spotlight_all_limit: int,
        build_profiles: Callable[[list[dict], dict[str, dict]], Any],
        profile_with_role_tag: Callable[[dict], Any],
        refresh_metrics_for_profiles: Callable[[list[dict]], Any],
        fetch_channel_top_viewed_beats: Callable[[str, int], tuple[list[dict], dict]],
        safe_iso_now: Callable[[], str],
    ) -> None:
        self.db = db
        self.logger = logger
        self.refresh_interval_seconds = refresh_interval_seconds
        self.spotlight_response_cls = spotlight_response_cls
        self.spotlight_projection = spotlight_projection
        self.spotlight_all_limit = spotlight_all_limit
        self.build_profiles = build_profiles
        self.profile_with_role_tag = profile_with_role_tag
        self.refresh_metrics_for_profiles = refresh_metrics_for_profiles
        self.fetch_channel_top_viewed_beats = fetch_channel_top_viewed_beats
        self.safe_iso_now = safe_iso_now

    def serialize_for_cache(self, value: Any) -> Any:
        if isinstance(value, BaseModel):
            return self.serialize_for_cache(value.model_dump())
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, list):
            return [self.serialize_for_cache(item) for item in value]
        if isinstance(value, dict):
            return {key: self.serialize_for_cache(item) for key, item in value.items()}
        return value

    async def compute_spotlight_payload(self) -> dict[str, Any]:
        all_profiles, growth_rows = await asyncio.gather(
            self.db.producer_profiles.find({}, self.spotlight_projection).to_list(5000),
            self.db.growth_streaks.find(
                {},
                {"_id": 0, "user_id": 1, "current_streak": 1, "longest_streak": 1, "total_days_completed": 1},
            ).to_list(5000),
        )
        if not all_profiles:
            return self.spotlight_response_cls(
                featured_producers=[],
                trending_producers=[],
                new_producers=[],
                all_producers=[],
            ).model_dump()

        growth_by_user = {g.get("user_id"): g for g in growth_rows}

        def trending_score(profile: dict) -> float:
            growth = growth_by_user.get(profile.get("user_id"), {})
            likes = float(profile.get("likes") or 0)
            views = float(profile.get("views") or 0)
            streak = float(growth.get("current_streak") or 0)
            days = float(growth.get("total_days_completed") or 0)
            return likes * 4.0 + views * 0.15 + streak * 8.0 + days * 1.5

        def created_at_ts(profile: dict) -> float:
            value = profile.get("created_at")
            if isinstance(value, datetime):
                return value.timestamp()
            if isinstance(value, str):
                try:
                    return datetime.fromisoformat(value).timestamp()
                except Exception:
                    return 0.0
            return 0.0

        featured = [p for p in all_profiles if p.get("featured")]
        featured = sorted(featured, key=trending_score, reverse=True)[:3]
        trending = sorted(all_profiles, key=trending_score, reverse=True)[:12]
        new_producers = sorted(all_profiles, key=created_at_ts, reverse=True)[:12]
        ranked_profiles = sorted(all_profiles, key=trending_score, reverse=True)

        featured_profiles, trending_profiles, new_profiles, all_network_profiles = await asyncio.gather(
            self.build_profiles(featured, growth_by_user),
            self.build_profiles(trending, growth_by_user),
            self.build_profiles(new_producers, growth_by_user),
            self.build_profiles(ranked_profiles[:self.spotlight_all_limit], growth_by_user),
        )

        return self.spotlight_response_cls(
            featured_producers=featured_profiles,
            trending_producers=trending_profiles,
            new_producers=new_profiles,
            all_producers=all_network_profiles,
        ).model_dump()

    async def compute_producer_stats_payload(self, user_id: str) -> dict[str, Any]:
        profile = await self.db.producer_profiles.find_one({"user_id": user_id})
        if not profile:
            raise ValueError("Producer profile not found.")

        user_doc = await self.db.users.find_one({"id": user_id}, {"_id": 0, "username": 1, "created_at": 1})
        growth = await self.db.growth_streaks.find_one({"user_id": user_id}, {"_id": 0})
        youtube = await self.db.youtube_connections.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "google_email": 1, "connected_at": 1})

        uploads = await self.db.uploads.find(
            {"user_id": user_id},
            {"_id": 0, "file_type": 1, "uploaded_at": 1, "original_filename": 1},
        ).to_list(2000)
        descriptions_count = await self.db.descriptions.count_documents({"user_id": user_id})
        tag_sets_count = await self.db.tag_history.count_documents({"user_id": user_id})

        audio_uploads = sum(1 for u in uploads if u.get("file_type") == "audio")
        image_uploads = sum(1 for u in uploads if u.get("file_type") == "image")

        profile_with_role = await self.profile_with_role_tag(profile)
        top_beats = []
        if profile.get("top_beat_url"):
            top_beats.append({"title": "Top Beat", "url": profile.get("top_beat_url")})

        recent_audio = sorted(
            [u for u in uploads if u.get("file_type") == "audio"],
            key=lambda item: str(item.get("uploaded_at") or ""),
            reverse=True,
        )[:5]
        for idx, upload in enumerate(recent_audio):
            name = (upload.get("original_filename") or "").strip()
            if not name:
                continue
            top_beats.append({"title": f"Beat {idx + 1}: {name}", "url": None})

        youtube_url = ((profile.get("social_links") or {}).get("youtube") or "").strip()
        channel_top_beats, channel_perf = await asyncio.to_thread(self.fetch_channel_top_viewed_beats, youtube_url, 5)
        if channel_top_beats:
            top_beats = channel_top_beats

        spotlight_likes = int(profile.get("likes") or 0)
        if channel_top_beats:
            youtube_likes = sum(int(beat.get("likes") or 0) for beat in channel_top_beats)
            if youtube_likes > 0:
                spotlight_likes = youtube_likes
        spotlight_views = int(profile.get("views") or 0)
        if channel_perf.get("total_views"):
            spotlight_views = int(channel_perf.get("total_views") or 0)

        return {
            "profile": profile_with_role.model_dump(),
            "stats": {
                "likes": spotlight_likes,
                "views": spotlight_views,
                "current_streak": int((growth or {}).get("current_streak") or 0),
                "longest_streak": int((growth or {}).get("longest_streak") or 0),
                "total_days_completed": int((growth or {}).get("total_days_completed") or 0),
                "descriptions_created": int(descriptions_count),
                "tag_sets_created": int(tag_sets_count),
                "audio_uploads": int(audio_uploads),
                "image_uploads": int(image_uploads),
            },
            "top_beats": top_beats,
            "top_song": profile.get("top_beat_url"),
            "channel": {
                "connected": bool(youtube),
                "name": (youtube or {}).get("name"),
                "email": (youtube or {}).get("google_email"),
                "connected_at": (youtube or {}).get("connected_at"),
                "performance": channel_perf,
            },
            "channel_top_beats": channel_top_beats,
            "member_since": (user_doc or {}).get("created_at"),
        }

    async def refresh_caches_once(self) -> dict[str, Any]:
        now = self.safe_iso_now()
        all_profiles = await self.db.producer_profiles.find({}, self.spotlight_projection).to_list(5000)
        if all_profiles:
            growth_rows = await self.db.growth_streaks.find(
                {},
                {"_id": 0, "user_id": 1, "current_streak": 1, "longest_streak": 1, "total_days_completed": 1},
            ).to_list(5000)
            growth_by_user = {g.get("user_id"): g for g in growth_rows}

            def trending_score(profile: dict) -> float:
                growth = growth_by_user.get(profile.get("user_id"), {})
                likes = float(profile.get("likes") or 0)
                views = float(profile.get("views") or 0)
                streak = float(growth.get("current_streak") or 0)
                days = float(growth.get("total_days_completed") or 0)
                return likes * 4.0 + views * 0.15 + streak * 8.0 + days * 1.5

            def created_at_ts(profile: dict) -> float:
                value = profile.get("created_at")
                if isinstance(value, datetime):
                    return value.timestamp()
                if isinstance(value, str):
                    try:
                        return datetime.fromisoformat(value).timestamp()
                    except Exception:
                        return 0.0
                return 0.0

            featured = [p for p in all_profiles if p.get("featured")]
            featured = sorted(featured, key=trending_score, reverse=True)[:3]
            trending = sorted(all_profiles, key=trending_score, reverse=True)[:12]
            new_producers = sorted(all_profiles, key=created_at_ts, reverse=True)[:12]
            ranked_profiles = sorted(all_profiles, key=trending_score, reverse=True)

            metrics_candidates_by_user: dict[str, dict] = {}
            for profile in featured + trending + new_producers + ranked_profiles[:24]:
                user_key = profile.get("user_id")
                if user_key and user_key not in metrics_candidates_by_user:
                    metrics_candidates_by_user[user_key] = profile
            await self.refresh_metrics_for_profiles(list(metrics_candidates_by_user.values()))

        spotlight_payload = await self.compute_spotlight_payload()
        await self.db.spotlight_cache.update_one(
            {"key": "global"},
            {"$set": {"key": "global", "payload": self.serialize_for_cache(spotlight_payload), "refreshed_at": now, "updated_at": now}},
            upsert=True,
        )

        refreshed_stats = 0
        failed_stats = 0
        for profile in all_profiles:
            user_id = str(profile.get("user_id") or "").strip()
            if not user_id:
                continue
            try:
                payload = await self.compute_producer_stats_payload(user_id)
                await self.db.producer_stats_cache.update_one(
                    {"user_id": user_id},
                    {"$set": {"user_id": user_id, "payload": self.serialize_for_cache(payload), "refreshed_at": now, "updated_at": now}},
                    upsert=True,
                )
                refreshed_stats += 1
            except Exception as exc:
                failed_stats += 1
                self.logger.warning(f"Producer stats cache refresh failed for {user_id}: {str(exc)}")

        return {
            "profiles_seen": len(all_profiles),
            "stats_refreshed": refreshed_stats,
            "stats_failed": failed_stats,
            "refreshed_at": now,
        }

    async def refresh_loop(self) -> None:
        while True:
            try:
                result = await self.refresh_caches_once()
                self.logger.info(
                    f"Spotlight caches refreshed: profiles={result['profiles_seen']} stats={result['stats_refreshed']} failed={result['stats_failed']}"
                )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.logger.error(f"Spotlight refresh failed: {str(exc)}")
            await asyncio.sleep(self.refresh_interval_seconds)
