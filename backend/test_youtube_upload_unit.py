import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test_secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "60"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_123"
os.environ["GOOGLE_CLIENT_ID"] = "test_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test_client_secret"
os.environ["DB_NAME"] = "test_db"
os.environ["HOSTING_COST_USD"] = "3.50"

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import server


class TestYouTubeUpload(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.mock_db = MagicMock()
        server.db = self.mock_db
        self.user_id = "test_user_id"
        self.current_user = {"id": self.user_id, "username": "test_user"}
        self.free_status = {
            "is_subscribed": False,
            "upload_credits_remaining": 1,
            "plan": "free",
            "resets_at": "2026-05-02T00:00:00Z",
        }

        self.mock_db.youtube_connections.find_one = AsyncMock(return_value={"user_id": self.user_id})
        self.mock_db.descriptions.find_one = AsyncMock(return_value={"id": "desc_1", "content": "Test Description"})
        self.mock_db.tag_generations.find_one = AsyncMock(return_value={"id": "tags_1", "tags": ["beat", "instrumental"]})
        self.mock_db.uploads.find_one = AsyncMock(
            side_effect=[
                {"id": "audio_1", "user_id": self.user_id, "file_type": "audio", "file_path": "audio.mp3"},
                {"id": "image_1", "user_id": self.user_id, "file_type": "image", "file_path": "image.jpg"},
            ]
        )

    async def test_upload_to_youtube_queues_job(self):
        queued_job = {
            "id": "job_123",
            "type": "youtube_upload",
            "user_id": self.user_id,
            "status": "queued",
            "progress": 0,
            "message": "Queued YouTube upload job.",
            "result": None,
            "error": None,
            "created_at": "2026-05-01T12:00:00+00:00",
            "updated_at": "2026-05-01T12:00:00+00:00",
        }

        with patch("backend.server.get_user_subscription_status", new_callable=AsyncMock) as mock_status, \
             patch("backend.server.check_and_use_upload_credit", new_callable=AsyncMock) as mock_credit, \
             patch("backend.server._create_youtube_upload_job", new_callable=AsyncMock) as mock_create_job:
            mock_status.return_value = self.free_status
            mock_credit.return_value = True
            mock_create_job.return_value = queued_job

            result = await server.upload_to_youtube(
                title="Queued Upload",
                description_id="desc_1",
                tags_id="tags_1",
                privacy_status="private",
                audio_file_id="audio_1",
                image_file_id="image_1",
                description_override=None,
                aspect_ratio="16:9",
                image_scale=1.0,
                image_scale_x=None,
                image_scale_y=None,
                image_pos_x=0.0,
                image_pos_y=0.0,
                image_rotation=0.0,
                background_color="black",
                remove_watermark=False,
                current_user=self.current_user,
            )

        self.assertTrue(result["success"])
        self.assertTrue(result["queued"])
        self.assertEqual(result["job"]["id"], "job_123")
        mock_credit.assert_called_once_with(self.user_id)
        mock_create_job.assert_called_once()

    async def test_upload_to_youtube_no_credits(self):
        with patch("backend.server.get_user_subscription_status", new_callable=AsyncMock) as mock_status, \
             patch("backend.server.check_and_use_upload_credit", new_callable=AsyncMock) as mock_credit:
            mock_status.return_value = self.free_status
            mock_credit.return_value = False

            with self.assertRaises(HTTPException) as cm:
                await server.upload_to_youtube(
                    title="No Credits",
                    description_id="desc_1",
                    tags_id=None,
                    privacy_status="public",
                    audio_file_id="audio_1",
                    image_file_id="image_1",
                    description_override=None,
                    aspect_ratio="16:9",
                    image_scale=1.0,
                    image_scale_x=None,
                    image_scale_y=None,
                    image_pos_x=0.0,
                    image_pos_y=0.0,
                    image_rotation=0.0,
                    background_color="black",
                    remove_watermark=False,
                    current_user=self.current_user,
                )

        self.assertEqual(cm.exception.status_code, 402)
        self.assertIn("Daily upload limit reached", str(cm.exception.detail))

    async def test_upload_to_youtube_requires_paid_watermark_removal(self):
        with patch("backend.server.get_user_subscription_status", new_callable=AsyncMock) as mock_status:
            mock_status.return_value = self.free_status

            with self.assertRaises(HTTPException) as cm:
                await server.upload_to_youtube(
                    title="No Watermark",
                    description_id="desc_1",
                    tags_id=None,
                    privacy_status="public",
                    audio_file_id="audio_1",
                    image_file_id="image_1",
                    description_override=None,
                    aspect_ratio="16:9",
                    image_scale=1.0,
                    image_scale_x=None,
                    image_scale_y=None,
                    image_pos_x=0.0,
                    image_pos_y=0.0,
                    image_rotation=0.0,
                    background_color="black",
                    remove_watermark=True,
                    current_user=self.current_user,
                )

        self.assertEqual(cm.exception.status_code, 402)
        self.assertEqual(cm.exception.detail.get("feature"), "remove_watermark")

    async def test_process_youtube_upload_job_success(self):
        job = {
            "id": "job_success",
            "user_id": self.user_id,
            "payload": {
                "title": "My Beat",
                "audio_file_id": "audio_1",
                "image_file_id": "image_1",
                "description": "Test Description",
                "privacy_status": "public",
                "tags": ["beat"],
            },
        }
        update_job = AsyncMock()

        with tempfile.TemporaryDirectory() as temp_dir, \
             patch("backend.server._update_upload_job", update_job), \
             patch("backend.server.refresh_youtube_token", new_callable=AsyncMock) as mock_refresh_token, \
             patch("backend.server._render_youtube_video", new_callable=AsyncMock) as mock_render, \
             patch("backend.server.MediaFileUpload") as mock_media_upload, \
             patch("backend.server.build") as mock_build:
            mock_refresh_token.return_value = MagicMock()
            rendered_path = Path(temp_dir) / "rendered.mp4"
            rendered_path.write_bytes(b"video")
            mock_render.return_value = rendered_path

            progress_status = MagicMock()
            progress_status.progress.return_value = 0.5
            request = MagicMock()
            request.next_chunk.side_effect = [
                (progress_status, None),
                (None, {"id": "yt_video_123"}),
            ]
            youtube = MagicMock()
            youtube.videos().insert.return_value = request
            mock_build.return_value = youtube

            await server._process_youtube_upload_job(job)

        self.assertGreaterEqual(update_job.await_count, 2)
        final_kwargs = update_job.await_args_list[-1].kwargs
        self.assertEqual(final_kwargs["status"], "succeeded")
        self.assertEqual(final_kwargs["result"]["video_id"], "yt_video_123")
        self.assertIn("youtube.com/watch?v=yt_video_123", final_kwargs["result"]["video_url"])

    async def test_process_youtube_upload_job_failure_marks_job_failed(self):
        job = {
            "id": "job_fail",
            "user_id": self.user_id,
            "payload": {
                "title": "Broken Beat",
                "audio_file_id": "audio_1",
                "image_file_id": "image_1",
                "description": "Broken description",
                "privacy_status": "public",
                "tags": [],
            },
        }
        update_job = AsyncMock()

        with patch("backend.server._update_upload_job", update_job), \
             patch("backend.server.refresh_youtube_token", new_callable=AsyncMock) as mock_refresh_token:
            mock_refresh_token.side_effect = HTTPException(status_code=400, detail="YouTube account not connected")
            await server._process_youtube_upload_job(job)

        final_kwargs = update_job.await_args_list[-1].kwargs
        self.assertEqual(final_kwargs["status"], "failed")
        self.assertIn("YouTube account not connected", final_kwargs["error"])


if __name__ == "__main__":
    unittest.main()
