import os
import sys
import unittest
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

    async def test_touch_heartbeat_updates_last_heartbeat(self):
        self.mock_db.upload_jobs.update_one = AsyncMock()

        await self.service.touch_heartbeat(
            "job_123",
            stage="ffmpeg_render",
            message="Rendering video...",
            progress=40,
        )

        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[0], {"id": "job_123"})
        self.assertEqual(update_args.args[1]["$set"]["stage"], "ffmpeg_render")
        self.assertEqual(update_args.args[1]["$set"]["last_heartbeat_at"], "2026-06-01T00:10:00+00:00")

    async def test_watchdog_requeues_stale_processing_job(self):
        stale_job = {
            "id": "job_stale",
            "status": "processing",
            "stage": "ffmpeg_render",
            "attempts": 0,
            "max_attempts": 2,
            "updated_at": "2026-06-01T00:00:00+00:00",
            "last_heartbeat_at": "2026-06-01T00:00:00+00:00",
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


if __name__ == "__main__":
    unittest.main()
