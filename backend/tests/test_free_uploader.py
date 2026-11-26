"""The free "upload MP3 to YouTube" tool: daily caps, the free job payload and its visual rules."""
import asyncio
import json
import os
import sys
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_123456")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRATION_MINUTES", "60")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_123")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test_client_id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test_client_secret")
os.environ.setdefault("DB_NAME", "test_db")

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException  # noqa: E402

from backend import server  # noqa: E402
from backend.services import free_uploader  # noqa: E402

NOON_PT = datetime(2026, 11, 25, 20, 0, tzinfo=timezone.utc)
DAY = free_uploader.quota_day(NOON_PT)


class _FakeCounts:
    """Enough of a Mongo collection for the counters' conditional updates."""

    def __init__(self, fail_on=None):
        self.docs = {}
        self.fail_on = fail_on or set()

    async def find_one(self, query, projection=None):
        return self.docs.get(query["key"])

    async def update_one(self, query, update, upsert=False):
        key = query["key"]
        if key in self.fail_on and "$inc" in update:
            raise RuntimeError("db down")
        doc = self.docs.get(key)
        if doc is None:
            if upsert and "$setOnInsert" in update:
                self.docs[key] = dict(update["$setOnInsert"])
            return SimpleNamespace(modified_count=0)
        if "$setOnInsert" in update and "$inc" not in update:
            return SimpleNamespace(modified_count=0)
        cond = query.get("count") or {}
        if "$lte" in cond and doc["count"] > cond["$lte"]:
            return SimpleNamespace(modified_count=0)
        if "$gte" in cond and doc["count"] < cond["$gte"]:
            return SimpleNamespace(modified_count=0)
        doc["count"] += update["$inc"]["count"]
        return SimpleNamespace(modified_count=1)


def _db(**kwargs):
    counts = _FakeCounts(**kwargs)
    return {free_uploader.COLLECTION: counts}, counts


def _count(counts, key):
    return (counts.docs.get(key) or {}).get("count", 0)


# ---- the daily counters -----------------------------------------------------------------------


def test_per_user_cap_reserves_until_full_then_refuses():
    db, counts = _db()

    async def run():
        return [await free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=40) for _ in range(4)]

    assert asyncio.run(run()) == ["reserved"] * 3 + ["user_cap"]
    assert _count(counts, free_uploader.user_key("u1", DAY)) == 3
    assert _count(counts, free_uploader.global_key(DAY)) == 3


def test_concurrent_requests_never_pass_the_cap():
    db, counts = _db()

    async def run():
        return await asyncio.gather(
            *[free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=40) for _ in range(10)]
        )

    results = asyncio.run(run())
    assert results.count("reserved") == 3
    assert _count(counts, free_uploader.user_key("u1", DAY)) == 3


def test_global_cap_refuses_and_gives_the_account_count_back():
    db, counts = _db()

    async def run():
        first = await free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=2)
        second = await free_uploader.try_use_free_upload(db, "u2", NOON_PT, per_user_cap=3, global_cap=2)
        third = await free_uploader.try_use_free_upload(db, "u3", NOON_PT, per_user_cap=3, global_cap=2)
        return first, second, third

    assert asyncio.run(run()) == ("reserved", "reserved", "global_cap")
    assert _count(counts, free_uploader.user_key("u3", DAY)) == 0
    assert _count(counts, free_uploader.global_key(DAY)) == 2


def test_release_gives_both_counts_back_and_never_goes_below_zero():
    db, counts = _db()

    async def run():
        for _ in range(3):
            await free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=40)
        refused = await free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=40)
        await free_uploader.release_free_upload(db, "u1", DAY)
        allowed = await free_uploader.try_use_free_upload(db, "u1", NOON_PT, per_user_cap=3, global_cap=40)
        for _ in range(5):
            await free_uploader.release_free_upload(db, "u1", DAY)
        return refused, allowed, await free_uploader.used_today(db, "u1", NOON_PT)

    assert asyncio.run(run()) == ("user_cap", "reserved", 0)
    assert _count(counts, free_uploader.global_key(DAY)) == 0


def test_database_error_refuses_the_upload():
    db, counts = _db(fail_on={free_uploader.user_key("u1", DAY)})
    assert asyncio.run(free_uploader.try_use_free_upload(db, "u1", NOON_PT)) == "error"

    db, counts = _db(fail_on={free_uploader.global_key(DAY)})
    assert asyncio.run(free_uploader.try_use_free_upload(db, "u1", NOON_PT)) == "error"
    assert _count(counts, free_uploader.user_key("u1", DAY)) == 0  # account count given back


def test_counts_follow_the_pacific_quota_day():
    late_night_pt = datetime(2026, 11, 26, 7, 30, tzinfo=timezone.utc)  # 23:30 on the 25th, Pacific
    assert free_uploader.quota_day(late_night_pt) == "2026-11-25"
    assert free_uploader.quota_day(datetime(2026, 11, 26, 8, 30, tzinfo=timezone.utc)) == "2026-11-26"


# ---- the job payload --------------------------------------------------------------------------


def _uploads_find_one(image_doc):
    async def find_one(query, projection=None):
        if query.get("file_type") == "audio":
            return {"id": query["id"], "user_id": query["user_id"], "file_type": "audio", "stored_filename": "a.mp3"}
        if query.get("file_type") == "image":
            return image_doc
        return None

    return find_one


def _mock_db(image_doc, connected=True):
    db = MagicMock()
    db.youtube_connections.find_one = AsyncMock(return_value={"user_id": "u1"} if connected else None)
    db.uploads.find_one = AsyncMock(side_effect=_uploads_find_one(image_doc))
    db.descriptions.find_one = AsyncMock(return_value=None)
    db.tag_generations.find_one = AsyncMock(return_value=None)
    return db


def _image(stored_filename, original_filename=None):
    return {
        "id": "img1",
        "user_id": "u1",
        "file_type": "image",
        "stored_filename": stored_filename,
        "original_filename": original_filename or stored_filename,
    }


def _free_kwargs(**overrides):
    kwargs = dict(
        current_user={"id": "u1"},
        title="Dark Trap Beat",
        description_id="",
        tags_id=None,
        privacy_status="public",
        audio_file_id="aud1",
        image_file_id="img1",
        description_override="",
        aspect_ratio="16:9",
        image_scale=1.0,
        image_scale_x=None,
        image_scale_y=None,
        image_pos_x=0.0,
        image_pos_y=0.0,
        image_rotation=0.0,
        background_color="black",
        remove_watermark=False,
        tags=["travis scott type beat", "dark trap", "x" * 40, 'quote"d'],
        free_uploader=True,
        tag_set="travis-scott",
    )
    kwargs.update(overrides)
    return kwargs


class TestFreePayload(unittest.IsolatedAsyncioTestCase):
    async def _build(self, image_doc, plan="free", **overrides):
        ensure = AsyncMock()
        with patch.object(server, "db", _mock_db(image_doc)), \
             patch.object(server, "get_user_subscription_status", AsyncMock(return_value={"plan": plan})), \
             patch.object(server, "ensure_has_upload_credit", ensure):
            payload = await server._build_youtube_upload_job_payload(**_free_kwargs(**overrides))
        return payload, ensure

    async def test_free_payload_skips_the_credit_check(self):
        payload, ensure = await self._build(_image("img1.png"))
        ensure.assert_not_awaited()
        self.assertTrue(payload["free_uploader"])
        self.assertEqual(payload["tag_set"], "travis-scott")
        self.assertEqual(payload["tags"], ["travis scott type beat", "dark trap", "quoted"])
        self.assertFalse(payload["visualizer"].get("enabled"))
        self.assertEqual(payload["aspect_ratio"], "16:9")
        self.assertEqual(payload["description"], "")
        self.assertEqual(payload["playlist_mode"], "none")
        self.assertIsNone(payload["publish_at"])
        self.assertIsNone(payload["thumbnail_file_id"])
        self.assertFalse(payload["remove_watermark"])  # free plan keeps the watermark

    async def test_paid_plan_gets_no_watermark(self):
        payload, _ = await self._build(_image("img1.jpg"), plan="plus")
        self.assertTrue(payload["remove_watermark"])

    async def test_free_payload_ignores_visualizer_and_extras_from_direct_calls(self):
        payload, _ = await self._build(
            _image("img1.webp"),
            visualizer_enabled=True,
            visualizer_style="ridgeline",
            playlist_mode="artist",
            thumbnail_file_id="thumb1",
        )
        self.assertFalse(payload["visualizer"].get("enabled"))
        self.assertEqual(payload["playlist_mode"], "none")
        self.assertIsNone(payload["thumbnail_file_id"])

    async def test_gif_is_accepted(self):
        payload, _ = await self._build(_image("img1.gif"))
        self.assertTrue(payload["free_uploader"])

    async def test_video_visuals_are_rejected(self):
        for name in ("clip.mp4", "clip.mov", "clip.webm", "clip.m4v"):
            with self.subTest(name=name):
                with self.assertRaises(HTTPException) as ctx:
                    await self._build(_image(name))
                self.assertEqual(ctx.exception.status_code, 400)

    async def test_stored_extension_beats_the_original_filename(self):
        with self.assertRaises(HTTPException) as ctx:
            await self._build(_image("img1.mp4", original_filename="cover.png"))
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_youtube_must_be_connected(self):
        with patch.object(server, "db", _mock_db(_image("img1.png"), connected=False)), \
             patch.object(server, "get_user_subscription_status", AsyncMock(return_value={"plan": "free"})), \
             patch.object(server, "ensure_has_upload_credit", AsyncMock()):
            with self.assertRaises(HTTPException) as ctx:
                await server._build_youtube_upload_job_payload(**_free_kwargs())
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_regular_upload_still_checks_credits_and_needs_a_description(self):
        ensure = AsyncMock()
        regular = _free_kwargs(free_uploader=False, tags=None, tag_set=None, description_override="My beat")
        with patch.object(server, "db", _mock_db(_image("clip.mp4"))), \
             patch.object(server, "get_user_subscription_status", AsyncMock(return_value={"plan": "free"})), \
             patch.object(server, "ensure_has_upload_credit", ensure):
            payload = await server._build_youtube_upload_job_payload(**regular)
            ensure.assert_awaited_once_with("u1")
            self.assertNotIn("free_uploader", payload)
            self.assertEqual(payload["tags"], [])

            with self.assertRaises(HTTPException) as ctx:
                await server._build_youtube_upload_job_payload(**{**regular, "description_override": ""})
            self.assertEqual(ctx.exception.status_code, 400)


# ---- giving the slot back when a job fails ----------------------------------------------------


class TestReleaseOnFailure(unittest.IsolatedAsyncioTestCase):
    def _jobs(self, modified=1):
        db = MagicMock()
        db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=modified))
        return db

    async def test_failed_free_job_releases_on_its_own_day(self):
        release = AsyncMock()
        job = {"id": "j1", "user_id": "u1", "payload": {"free_uploader": True, "free_upload_day": "2026-11-25"}}
        with patch.object(server, "db", self._jobs()), \
             patch.object(server.free_uploader_service, "release_free_upload", release):
            await server._release_free_upload_for_job(job)
        release.assert_awaited_once()
        self.assertEqual(release.await_args.args[1:], ("u1", "2026-11-25"))

    async def test_release_happens_once(self):
        release = AsyncMock()
        job = {"id": "j1", "user_id": "u1", "payload": {"free_uploader": True, "free_upload_day": "2026-11-25"}}
        with patch.object(server, "db", self._jobs(modified=0)), \
             patch.object(server.free_uploader_service, "release_free_upload", release):
            await server._release_free_upload_for_job(job)
        release.assert_not_awaited()

    async def test_no_release_for_paid_jobs_or_videos_already_on_youtube(self):
        release = AsyncMock()
        with patch.object(server, "db", self._jobs()), \
             patch.object(server.free_uploader_service, "release_free_upload", release):
            await server._release_free_upload_for_job({"id": "j1", "user_id": "u1", "payload": {}})
            await server._release_free_upload_for_job(
                {"id": "j2", "user_id": "u1", "payload": {"free_uploader": True}, "_youtube_video_id": "abc"}
            )
        release.assert_not_awaited()

    async def test_worker_failure_releases_the_slot(self):
        release_for_job = AsyncMock()
        job = {"id": "j1", "user_id": "u1", "payload": {"free_uploader": True}}
        with patch.object(server, "_execute_youtube_upload_job", AsyncMock(side_effect=RuntimeError("ffmpeg died"))), \
             patch.object(server, "_get_background_job", AsyncMock(return_value={"stage": "ffmpeg_render"})), \
             patch.object(server, "_update_upload_job", AsyncMock()), \
             patch.object(server, "_release_free_upload_for_job", release_for_job):
            await server._process_youtube_upload_job(job)
        release_for_job.assert_awaited_once_with(job)


# ---- the worker: credits ----------------------------------------------------------------------


class TestRunnerCredits(unittest.IsolatedAsyncioTestCase):
    async def _run(self, payload):
        async def heartbeat(job_id):
            await asyncio.sleep(3600)

        uploads = MagicMock()
        uploads.find_one = AsyncMock(side_effect=lambda query, projection=None: {"id": query["id"], "file_type": query["file_type"]})
        db = MagicMock()
        db.uploads = uploads
        ensure, consume = AsyncMock(), AsyncMock()
        job = {"id": "j1", "user_id": "u1", "payload": {"title": "T", "audio_file_id": "a", "image_file_id": "i", **payload}}
        quota = server.youtube_quota_service
        with patch.object(server, "db", db), \
             patch.object(server, "ensure_has_upload_credit", ensure), \
             patch.object(server, "consume_upload_credit", consume), \
             patch.object(server, "_assert_job_not_cancel_requested", AsyncMock()), \
             patch.object(server, "_update_upload_job", AsyncMock()), \
             patch.object(server, "refresh_youtube_token", AsyncMock(return_value=MagicMock())), \
             patch.object(quota, "try_use_upload", AsyncMock(return_value=True)), \
             patch.object(quota, "release_upload", AsyncMock()), \
             patch.object(server, "_job_heartbeat_loop", heartbeat), \
             patch.object(server, "_get_render_slots", lambda: asyncio.Semaphore(1)), \
             patch.object(server, "_render_youtube_video", AsyncMock(return_value=server.Path("/nonexistent/out.mp4"))), \
             patch.object(server, "build", MagicMock()), \
             patch.object(server, "MediaFileUpload", MagicMock()), \
             patch.object(server, "_youtube_resumable_upload", AsyncMock(return_value={"id": "vid1"})), \
             patch.object(server, "_record_upload_outcome", AsyncMock()), \
             patch.object(server, "_run_publish_extras", AsyncMock(return_value={})):
            result = await server._execute_youtube_upload_job(job)
        return result, ensure, consume, job

    async def test_free_job_never_touches_upload_credits(self):
        result, ensure, consume, job = await self._run({"free_uploader": True})
        self.assertEqual(result["video_id"], "vid1")
        ensure.assert_not_awaited()
        consume.assert_not_awaited()
        self.assertEqual(job["_youtube_video_id"], "vid1")

    async def test_paid_job_still_checks_and_spends_a_credit(self):
        result, ensure, consume, _ = await self._run({})
        self.assertEqual(result["video_id"], "vid1")
        ensure.assert_awaited_once_with("u1")
        consume.assert_awaited_once_with("u1")


# ---- the endpoint -----------------------------------------------------------------------------


class TestFreeUploadEndpoint(unittest.IsolatedAsyncioTestCase):
    def _patches(self, *, used=0, global_full=False, outcome="reserved"):
        fu = server.free_uploader_service
        return [
            patch.object(server, "_guard_heavy_feature", AsyncMock()),
            patch.object(server, "_enforce_action_rate_limit", MagicMock()),
            patch.object(server, "_find_active_youtube_upload_job", AsyncMock(return_value=None)),
            patch.object(server, "_youtube_upload_slots_full", AsyncMock(return_value=False)),
            patch.object(fu, "used_today", AsyncMock(return_value=used)),
            patch.object(fu, "global_slots_full", AsyncMock(return_value=global_full)),
            patch.object(fu, "try_use_free_upload", AsyncMock(return_value=outcome)),
            patch.object(fu, "release_free_upload", AsyncMock()),
            patch.object(server, "_build_youtube_upload_job_payload", AsyncMock(return_value={"free_uploader": True})),
            patch.object(server, "_create_youtube_upload_job", AsyncMock(return_value={"id": "job1", "status": "queued"})),
        ]

    async def _call(self, patches, **fields):
        form = dict(title="My Beat", description="hi", tags=json.dumps(["a", "b"]), tag_set="drake",
                    privacy_status="public", audio_file_id="aud1", image_file_id="img1")
        form.update(fields)
        for p in patches:
            p.start()
        try:
            return await server.free_upload_to_youtube(current_user={"id": "u1"}, **form)
        finally:
            for p in reversed(patches):
                p.stop()

    async def test_success_returns_job_and_left_today(self):
        result = await self._call(self._patches(used=0))
        self.assertTrue(result["success"])
        self.assertEqual(result["job_id"], "job1")
        self.assertIn("left_today", result)

    async def test_user_cap_is_429(self):
        with self.assertRaises(HTTPException) as ctx:
            await self._call(self._patches(used=free_uploader.FREE_UPLOADER_DAILY_PER_USER))
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("free upload", ctx.exception.detail)

    async def test_global_cap_is_429_with_the_shared_message(self):
        with self.assertRaises(HTTPException) as ctx:
            await self._call(self._patches(global_full=True))
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertEqual(ctx.exception.detail, server.YOUTUBE_DAILY_UPLOADS_USED_MESSAGE)

    async def test_bad_title_and_tags_are_400(self):
        for fields in ({"title": ""}, {"title": "x" * 101}, {"tags": "not json"}, {"tags": json.dumps([1, 2])},
                       {"description": "x" * 5001}):
            with self.subTest(fields=list(fields)):
                with self.assertRaises(HTTPException) as ctx:
                    await self._call(self._patches(), **fields)
                self.assertEqual(ctx.exception.status_code, 400)

    async def test_failed_job_creation_gives_the_slot_back(self):
        patches = self._patches()
        patches[-1] = patch.object(server, "_create_youtube_upload_job", AsyncMock(side_effect=RuntimeError("db")))
        release = AsyncMock()
        patches[7] = patch.object(server.free_uploader_service, "release_free_upload", release)
        with self.assertRaises(HTTPException) as ctx:
            await self._call(patches)
        self.assertEqual(ctx.exception.status_code, 500)
        release.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
