import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_123456"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "60"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_123"
os.environ["GOOGLE_CLIENT_ID"] = "test_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test_client_secret"
os.environ["DB_NAME"] = "test_db"

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.background_jobs import BackgroundJobService


class _FakeCursor:
    def __init__(self, items):
        self.items = items

    async def to_list(self, _):
        return self.items


def _watchdog_job_timestamps(
    *,
    stage_elapsed_seconds: float,
    heartbeat_age_seconds: float,
) -> dict[str, str]:
    now_dt = datetime.now(timezone.utc)
    return {
        "stage_started_at": (now_dt - timedelta(seconds=stage_elapsed_seconds)).isoformat(),
        "last_heartbeat_at": (now_dt - timedelta(seconds=heartbeat_age_seconds)).isoformat(),
        "updated_at": now_dt.isoformat(),
    }


class TestBackgroundJobs(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.mock_db = MagicMock()
        self.service = BackgroundJobService(
            db=self.mock_db,
            logger=MagicMock(),
            poll_interval_seconds=1,
            stale_after_seconds=60,
            worker_id="worker-test",
            now_factory=lambda: "2026-06-01T00:10:00+00:00",
        )

    async def test_touch_heartbeat_does_not_reset_stage_started_at(self):
        self.mock_db.upload_jobs.update_one = AsyncMock()

        await self.service.touch_heartbeat(
            "job_123",
            message="Rendering video...",
            progress=40,
        )

        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[0], {"id": "job_123"})
        payload = update_args.args[1]["$set"]
        self.assertEqual(payload["last_heartbeat_at"], "2026-06-01T00:10:00+00:00")
        self.assertNotIn("stage_started_at", payload)
        self.assertNotIn("stage", payload)

    async def test_update_job_sets_stage_started_at_when_stage_changes(self):
        self.mock_db.upload_jobs.update_one = AsyncMock()

        await self.service.update_job(
            "job_123",
            progress=40,
            message="Rendering video...",
            extra_updates={"stage": "ffmpeg_render", "last_heartbeat_at": "2026-06-01T00:10:00+00:00"},
        )

        payload = self.mock_db.upload_jobs.update_one.await_args.args[1]["$set"]
        self.assertEqual(payload["stage"], "ffmpeg_render")
        self.assertEqual(payload["stage_started_at"], "2026-06-01T00:10:00+00:00")

    async def test_watchdog_skips_job_when_active_worker_has_fresh_heartbeat(self):
        active_job = {
            "id": "job_active",
            "type": "youtube_upload",
            "status": "processing",
            "stage": "ffmpeg_render",
            "attempts": 0,
            "max_attempts": 2,
            "worker_id": "worker-test",
            **_watchdog_job_timestamps(stage_elapsed_seconds=700, heartbeat_age_seconds=10),
        }
        self.mock_db.upload_jobs.find.return_value = _FakeCursor([active_job])
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=0))

        result = await self.service.run_watchdog_pass(
            default_timeout_seconds=300,
            stage_timeouts={"ffmpeg_render": 300},
            worker_dead_seconds=1800,
        )

        self.assertEqual(result["requeued"], 0)
        self.assertEqual(result["failed"], 0)
        self.mock_db.upload_jobs.update_one.assert_not_awaited()

    async def test_watchdog_fails_job_when_stage_exceeds_timeout_despite_fresh_heartbeat(self):
        stale_job = {
            "id": "job_stale",
            "type": "youtube_upload",
            "status": "processing",
            "stage": "ffmpeg_render",
            "attempts": 2,
            "max_attempts": 2,
            "worker_id": "other-worker",
            **_watchdog_job_timestamps(stage_elapsed_seconds=700, heartbeat_age_seconds=10),
        }
        self.mock_db.upload_jobs.find.return_value = _FakeCursor([stale_job])
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=1))

        result = await self.service.run_watchdog_pass(
            default_timeout_seconds=300,
            stage_timeouts={"ffmpeg_render": 300},
            worker_dead_seconds=1800,
        )

        self.assertEqual(result["failed"], 1)
        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[1]["$set"]["status"], "failed")
        self.assertEqual(update_args.args[1]["$set"]["error_code"], "JOB_TIMEOUT")
        self.assertIn("exceeded 300s", update_args.args[1]["$set"]["error"])

    async def test_watchdog_extends_ffmpeg_stage_timeout_from_per_job_render_timeout(self):
        stale_job = {
            "id": "job_render_timeout",
            "type": "youtube_upload",
            "status": "processing",
            "stage": "ffmpeg_render",
            "attempts": 2,
            "max_attempts": 2,
            "worker_id": "other-worker",
            "render_timeout_seconds": 600,
            **_watchdog_job_timestamps(stage_elapsed_seconds=700, heartbeat_age_seconds=10),
        }
        self.mock_db.upload_jobs.find.return_value = _FakeCursor([stale_job])
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=1))

        result = await self.service.run_watchdog_pass(
            default_timeout_seconds=300,
            stage_timeouts={"ffmpeg_render": 300},
            worker_dead_seconds=1800,
        )

        self.assertEqual(result["failed"], 1)
        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertIn("exceeded 660s", update_args.args[1]["$set"]["error"])

    async def test_watchdog_requeues_stale_processing_job(self):
        stale_job = {
            "id": "job_stale",
            "status": "processing",
            "stage": "ffmpeg_render",
            "attempts": 0,
            "max_attempts": 2,
            "worker_id": "other-worker",
            **_watchdog_job_timestamps(stage_elapsed_seconds=700, heartbeat_age_seconds=700),
        }
        self.mock_db.upload_jobs.find.return_value = _FakeCursor([stale_job])
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=1))

        result = await self.service.run_watchdog_pass(
            default_timeout_seconds=300,
            stage_timeouts={"ffmpeg_render": 300},
        )

        self.assertEqual(result["requeued"], 1)
        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[0]["id"], "job_stale")
        self.assertEqual(update_args.args[1]["$set"]["status"], "queued")
        self.assertEqual(update_args.args[1]["$set"]["message"], "Requeued after timeout.")
        self.assertEqual(update_args.args[1]["$inc"]["attempts"], 1)

    async def test_process_job_marks_processing_job_failed_when_handler_returns_without_terminal_status(self):
        async def noop_handler(_job):
            return None

        self.service.set_handlers({"youtube_upload": noop_handler})
        self.mock_db.upload_jobs.find_one = AsyncMock(
            return_value={"id": "job_1", "status": "processing", "stage": "ffmpeg_render", "progress": 40}
        )
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=1))

        await self.service.process_job({"id": "job_1", "type": "youtube_upload", "stage": "ffmpeg_render"})

        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[0], {"id": "job_1", "status": "processing"})
        self.assertEqual(update_args.args[1]["$set"]["status"], "failed")
        self.assertEqual(update_args.args[1]["$set"]["error_code"], "WORKER_EXITED")


if __name__ == "__main__":
    unittest.main()
