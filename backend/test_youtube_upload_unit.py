import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock, call
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Setup environment variables before importing server
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['JWT_SECRET_KEY'] = 'test_secret'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '60'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_123'
os.environ['GOOGLE_CLIENT_ID'] = 'test_client_id'
os.environ['GOOGLE_CLIENT_SECRET'] = 'test_client_secret'
os.environ['DB_NAME'] = 'test_db'
os.environ['HOSTING_COST_USD'] = '3.50'

# Add parent directory to path to import backend modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the server module
from backend import server

class TestYouTubeUpload(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Reset mocks
        self.mock_db = MagicMock()
        server.db = self.mock_db

        self.mock_uploads_dir = Path('/tmp/test_uploads')
        server.UPLOADS_DIR = self.mock_uploads_dir

        # User setup
        self.user_id = "test_user_id"
        self.current_user = {"id": self.user_id, "username": "test_user"}

        # Default mock responses
        self.mock_user_sub_status = {
            "is_subscribed": False,
            "upload_credits_remaining": 3,
            "plan": "free",
            "resets_at": "2024-01-01T00:00:00Z"
        }

    async def test_upload_to_youtube_success_free_user(self):
        """Test successful upload for a free user (watermark added)"""
        # Mock dependencies
        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_sub, \
             patch('backend.server.check_and_use_upload_credit', new_callable=AsyncMock) as mock_check_credit, \
             patch('backend.server.refresh_youtube_token', new_callable=AsyncMock) as mock_refresh_token, \
             patch('subprocess.run') as mock_subprocess, \
             patch('backend.server.build') as mock_build, \
             patch('backend.server.MediaFileUpload') as mock_media_upload, \
             patch('pathlib.Path.unlink') as mock_unlink, \
             patch('shutil.which') as mock_shutil_which, \
             patch('uuid.uuid4') as mock_uuid:

            # Setup mocks
            mock_get_sub.return_value = self.mock_user_sub_status
            mock_check_credit.return_value = True
            mock_refresh_token.return_value = MagicMock()
            mock_shutil_which.return_value = '/usr/bin/ffmpeg'
            mock_uuid.return_value = "video_uuid"

            # Ensure upload directory exists
            self.mock_uploads_dir.mkdir(parents=True, exist_ok=True)
            dummy_video_path = self.mock_uploads_dir / "video_uuid.mp4"
            with open(dummy_video_path, "w") as f:
                f.write("dummy content")

            # DB Mocks
            self.mock_db.descriptions.find_one = AsyncMock(return_value={
                "id": "desc_1", "content": "Test Description"
            })
            self.mock_db.tag_generations.find_one = AsyncMock(return_value={
                "id": "tags_1", "tags": ["beat", "instrumental"]
            })
            self.mock_db.uploads.find_one = AsyncMock(side_effect=[
                {"id": "audio_1", "file_path": "/tmp/audio.mp3", "user_id": self.user_id},
                {"id": "image_1", "file_path": "/tmp/image.jpg", "user_id": self.user_id}
            ])
            self.mock_db.growth_streaks.find_one = AsyncMock(return_value=None)
            self.mock_db.growth_streaks.update_one = AsyncMock()

            # FFmpeg mock
            mock_subprocess.return_value.returncode = 0

            # YouTube API mock
            mock_youtube = MagicMock()
            mock_build.return_value = mock_youtube
            mock_request = MagicMock()
            mock_youtube.videos().insert.return_value = mock_request
            # Simulate chunked upload
            mock_request.next_chunk.side_effect = [
                (MagicMock(progress=lambda: 0.5), None),
                (None, {'id': 'video_123'})
            ]

            # Call the function
            result = await server.upload_to_youtube(
                title="Test Video",
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
                current_user=self.current_user
            )

            # Assertions
            self.assertTrue(result['success'])
            self.assertEqual(result['video_id'], 'video_123')

            # Verify FFmpeg call included watermark logic
            args, _ = mock_subprocess.call_args
            ffmpeg_cmd = args[0]
            # Verify watermark filter is present for free user
            self.assertTrue(any("drawtext=text='Upload your beats for free" in str(arg) for arg in ffmpeg_cmd))

            # Verify credits used
            mock_check_credit.assert_called_once_with(self.user_id)

    async def test_upload_to_youtube_success_pro_user_remove_watermark(self):
        """Test successful upload for a pro user removing watermark"""
        pro_status = self.mock_user_sub_status.copy()
        pro_status['is_subscribed'] = True

        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_sub, \
             patch('backend.server.check_and_use_upload_credit', new_callable=AsyncMock) as mock_check_credit, \
             patch('backend.server.refresh_youtube_token', new_callable=AsyncMock) as mock_refresh_token, \
             patch('subprocess.run') as mock_subprocess, \
             patch('backend.server.build') as mock_build, \
             patch('backend.server.MediaFileUpload') as mock_media_upload, \
             patch('shutil.which') as mock_shutil_which, \
             patch('uuid.uuid4') as mock_uuid:

            mock_get_sub.return_value = pro_status
            mock_check_credit.return_value = True
            mock_refresh_token.return_value = MagicMock()
            mock_shutil_which.return_value = '/usr/bin/ffmpeg'
            mock_uuid.return_value = "video_uuid_pro"

            # Ensure upload directory exists
            self.mock_uploads_dir.mkdir(parents=True, exist_ok=True)
            dummy_video_path = self.mock_uploads_dir / "video_uuid_pro.mp4"
            with open(dummy_video_path, "w") as f:
                f.write("dummy content")

            # DB Mocks
            self.mock_db.descriptions.find_one = AsyncMock(return_value={"id": "desc_1", "content": "Desc"})
            self.mock_db.uploads.find_one = AsyncMock(side_effect=[
                {"id": "audio_1", "file_path": "/tmp/audio.mp3"},
                {"id": "image_1", "file_path": "/tmp/image.jpg"}
            ])
            self.mock_db.growth_streaks.find_one = AsyncMock(return_value=None)

            mock_subprocess.return_value.returncode = 0

            # YouTube API
            mock_youtube = MagicMock()
            mock_build.return_value = mock_youtube
            mock_youtube.videos().insert.return_value.next_chunk.return_value = (None, {'id': 'video_pro'})

            # Call function
            result = await server.upload_to_youtube(
                title="Pro Video",
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
                current_user=self.current_user
            )

            self.assertEqual(result['video_id'], 'video_pro')

            # Verify NO watermark in FFmpeg command
            args, _ = mock_subprocess.call_args
            ffmpeg_cmd = args[0]
            # The filter string is one argument, usually joined or passed as list
            # In the code: '-vf', video_filter
            # check if drawtext is ABSENT
            filter_str = ""
            for i, arg in enumerate(ffmpeg_cmd):
                if arg == '-vf':
                    filter_str = ffmpeg_cmd[i+1]
                    break

            self.assertNotIn("drawtext=text='Upload your beats for free", filter_str)

    async def test_upload_to_youtube_no_credits(self):
        """Test failure when user has no credits"""
        with patch('backend.server.check_and_use_upload_credit', new_callable=AsyncMock) as mock_check_credit, \
             patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_sub:

            mock_check_credit.return_value = False
            mock_get_sub.return_value = self.mock_user_sub_status

            from fastapi import HTTPException

            with self.assertRaises(HTTPException) as cm:
                await server.upload_to_youtube(
                    title="Fail Video",
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
                    current_user=self.current_user
                )

            self.assertEqual(cm.exception.status_code, 402)
            self.assertIn("Daily upload limit reached", str(cm.exception.detail))

    async def test_upload_to_youtube_ffmpeg_failure(self):
        """Test failure when FFmpeg fails"""
        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_sub, \
             patch('backend.server.check_and_use_upload_credit', new_callable=AsyncMock) as mock_check_credit, \
             patch('backend.server.refresh_youtube_token', new_callable=AsyncMock) as mock_refresh_token, \
             patch('subprocess.run') as mock_subprocess, \
             patch('shutil.which') as mock_shutil_which:

            mock_get_sub.return_value = self.mock_user_sub_status
            mock_check_credit.return_value = True
            mock_refresh_token.return_value = MagicMock()
            mock_shutil_which.return_value = '/usr/bin/ffmpeg'

            # DB Mocks
            self.mock_db.descriptions.find_one = AsyncMock(return_value={"id": "desc_1", "content": "Desc"})
            self.mock_db.uploads.find_one = AsyncMock(side_effect=[
                {"id": "audio_1", "file_path": "/tmp/audio.mp3"},
                {"id": "image_1", "file_path": "/tmp/image.jpg"}
            ])

            # FFmpeg mock failure
            mock_subprocess.return_value.returncode = 1
            mock_subprocess.return_value.stderr = "FFmpeg Error"

            from fastapi import HTTPException

            with self.assertRaises(HTTPException) as cm:
                await server.upload_to_youtube(
                    title="FFmpeg Fail",
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
                    current_user=self.current_user
                )

            self.assertEqual(cm.exception.status_code, 500)
            self.assertIn("Video creation failed", str(cm.exception.detail))

    async def test_upload_to_youtube_not_connected(self):
        """Test failure when YouTube is not connected"""
        with patch('backend.server.check_and_use_upload_credit', new_callable=AsyncMock) as mock_check_credit, \
             patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_sub, \
             patch('backend.server.refresh_youtube_token', new_callable=AsyncMock) as mock_refresh_token:

            mock_check_credit.return_value = True
            mock_get_sub.return_value = self.mock_user_sub_status

            from fastapi import HTTPException
            mock_refresh_token.side_effect = HTTPException(status_code=400, detail="YouTube account not connected")

            with self.assertRaises(HTTPException) as cm:
                await server.upload_to_youtube(
                    title="No YouTube",
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
                    current_user=self.current_user
                )

            self.assertEqual(cm.exception.status_code, 400)
            self.assertEqual(cm.exception.detail, "YouTube account not connected")

if __name__ == '__main__':
    unittest.main()
