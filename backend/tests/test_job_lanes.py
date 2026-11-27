"""Job worker lanes and the cheap overload check (performance changes)."""
import asyncio
import os
import sys
import unittest
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

from backend.services.background_jobs import BackgroundJobService  # noqa: E402


def _matches(doc: dict, query: dict) -> bool:
    for key, cond in query.items():
        value = doc.get(key)
        if isinstance(cond, dict):
            if "$in" in cond and value not in cond["$in"]:
                return False
            if "$nin" in cond and value in cond["$nin"]:
                return False
        elif value != cond:
            return False
    return True


class _FakeJobs:
    """Just enough of a Mongo collection for claim/update."""

    def __init__(self, docs):
        self.docs = docs

    async def find_one_and_update(self, query, update, sort=None, return_document=None):
        candidates = [d for d in self.docs if _matches(d, query)]
        for field, direction in reversed(sort or []):
            candidates.sort(key=lambda d: d.get(field), reverse=direction < 0)
        if not candidates:
            return None
        doc = candidates[0]
        doc.update(update.get("$set", {}))
        return dict(doc)

    async def update_one(self, query, update):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)

    async def find_one(self, query, projection=None):
        for doc in self.docs:
            if _matches(doc, query):
                return dict(doc)
        return None


def _job(job_id, job_type, created_at, priority=1):
    return {"id": job_id, "type": job_type, "status": "queued", "priority": priority, "created_at": created_at}


class TestJobLanes(unittest.IsolatedAsyncioTestCase):
    def _service(self, docs):
        db = MagicMock()
        db.upload_jobs = _FakeJobs(docs)
        return BackgroundJobService(db=db, logger=MagicMock(), poll_interval_seconds=0, stale_after_seconds=60)

    async def test_claim_filters_by_lane(self):
        docs = [
            _job("render", "youtube_upload", "2026-01-01T00:00:00", priority=0),
            _job("tags", "tag_generation", "2026-01-01T00:00:01"),
        ]
        service = self._service(docs)
        light = await service.claim_next_job(exclude_types={"youtube_upload"})
        self.assertEqual(light["id"], "tags")
        media = await service.claim_next_job(job_types={"youtube_upload"})
        self.assertEqual(media["id"], "render")
        self.assertIsNone(await service.claim_next_job())

    async def test_claim_without_filter_keeps_old_behaviour(self):
        docs = [_job("b", "tag_generation", "2026-01-01T00:00:02"), _job("a", "youtube_upload", "2026-01-01T00:00:01")]
        service = self._service(docs)
        first = await service.claim_next_job()
        self.assertEqual(first["id"], "a")

    async def test_light_jobs_finish_while_a_render_is_still_running(self):
        docs = [
            _job("render", "youtube_upload", "2026-01-01T00:00:00", priority=0),
            _job("tags-1", "tag_generation", "2026-01-01T00:00:01"),
            _job("tags-2", "beat_analysis", "2026-01-01T00:00:02"),
        ]
        service = self._service(docs)
        render_started = asyncio.Event()
        release_render = asyncio.Event()
        finished: list[str] = []

        async def slow_render(job):
            render_started.set()
            await release_render.wait()
            await service.update_job(job["id"], status="succeeded")
            finished.append(job["id"])

        async def quick(job):
            await service.update_job(job["id"], status="succeeded")
            finished.append(job["id"])

        service.set_handlers({"youtube_upload": slow_render, "tag_generation": quick, "beat_analysis": quick})
        tasks = [
            asyncio.create_task(service.worker_loop(job_types={"youtube_upload"}, lane="media")),
            asyncio.create_task(service.worker_loop(exclude_types={"youtube_upload"}, lane="light")),
        ]
        try:
            await asyncio.wait_for(render_started.wait(), 2)
            for _ in range(50):
                if {"tags-1", "tags-2"} <= set(finished):
                    break
                await asyncio.sleep(0.01)
            self.assertEqual(set(finished), {"tags-1", "tags-2"})  # render still running
            release_render.set()
            for _ in range(50):
                if "render" in finished:
                    break
                await asyncio.sleep(0.01)
            self.assertIn("render", finished)
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)


class TestServerPerfHelpers(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from backend import server

        self.server = server
        server._queue_load_cache["value"] = None
        server._queue_load_cache["at"] = 0.0

    async def test_queue_load_is_cached(self):
        db = MagicMock()
        db.upload_jobs.count_documents = AsyncMock(side_effect=[3, 1, 9, 9])
        with patch.object(self.server, "db", db):
            first = await self.server._get_queue_load()
            second = await self.server._get_queue_load()
        self.assertEqual(first, {"queued": 3, "processing": 1})
        self.assertEqual(second, first)
        self.assertEqual(db.upload_jobs.count_documents.await_count, 2)

    def test_ffmpeg_runs_at_lower_priority(self):
        with patch.object(self.server.os, "name", "posix"), patch.object(self.server, "FFMPEG_NICE", 10), patch.object(self.server.shutil, "which", return_value="/usr/bin/nice"):
            cmd = self.server._with_ffmpeg_priority(["ffmpeg", "-y", "out.mp4"])
        self.assertEqual(cmd[:3], ["/usr/bin/nice", "-n", "10"])
        self.assertEqual(cmd[3:], ["ffmpeg", "-y", "out.mp4"])
        with patch.object(self.server, "FFMPEG_NICE", 0):
            self.assertEqual(self.server._with_ffmpeg_priority(["ffmpeg"]), ["ffmpeg"])

    def test_ffmpeg_skips_posix_priority_on_windows(self):
        with patch.object(self.server.os, "name", "nt"), patch.object(self.server, "FFMPEG_NICE", 10):
            self.assertEqual(self.server._with_ffmpeg_priority(["ffmpeg"]), ["ffmpeg"])

    def test_worker_lanes_split_media_from_light_jobs(self):
        self.assertIn("youtube_upload", self.server.MEDIA_JOB_TYPES)
        self.assertNotIn("tag_generation", self.server.MEDIA_JOB_TYPES)


if __name__ == "__main__":
    unittest.main()
