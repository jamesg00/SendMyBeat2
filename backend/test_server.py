import sys
import os
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
from pathlib import Path
import asyncio

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock environment variables before importing server
with patch.dict(os.environ, {
    "STRIPE_SECRET_KEY": "test_stripe_key",
    "MONGO_URL": "mongodb://localhost:27017",
    "JWT_SECRET_KEY": "test_jwt_key",
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRATION_MINUTES": "60",
    "GOOGLE_CLIENT_ID": "test_google_client_id",
    "GOOGLE_CLIENT_SECRET": "test_google_client_secret",
    "STRIPE_PRICE_ID": "test_price_id"
}):
    from backend import server

class TestYoutubeUploadRefactor(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Setup mocks for dependencies
        self.mock_db = MagicMock()
        server.db = self.mock_db

        self.mock_check_credits = AsyncMock()
        server.check_and_use_upload_credit = self.mock_check_credits

        self.mock_get_sub_status = AsyncMock()
        server.get_user_subscription_status = self.mock_get_sub_status

        self.mock_refresh_token = AsyncMock()
        server.refresh_youtube_token = self.mock_refresh_token

        self.mock_build = MagicMock()
        server.build = self.mock_build

    async def test_check_credits_helper(self):
        """Test check_credits helper function (to be created)"""
        # This test will fail until we implement check_credits
        if not hasattr(server, 'check_credits'):
            self.skipTest("check_credits not implemented yet")

        # Mock dependencies
        self.mock_check_credits.return_value = True
        self.mock_get_sub_status.return_value = {"is_subscribed": True}

        # Call the function
        user_id = "test_user"
        remove_watermark = True

        is_subscribed = await server.check_credits(user_id, remove_watermark)

        # Assertions
        self.assertTrue(is_subscribed)
        self.mock_check_credits.assert_called_once_with(user_id)
        self.mock_get_sub_status.assert_called_with(user_id)

    async def test_prepare_video_helper(self):
        """Test prepare_video helper function (to be created)"""
        if not hasattr(server, 'prepare_video'):
            self.skipTest("prepare_video not implemented yet")

        # Mock subprocess
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            # Mock Path
            with patch('pathlib.Path.unlink', return_value=None):
                 # Call the function
                audio_file = {"file_path": "/tmp/audio.mp3"}
                image_file = {"file_path": "/tmp/image.jpg"}
                video_path = Path("/tmp/video.mp4")

                await server.prepare_video(
                    audio_file=audio_file,
                    image_file=image_file,
                    video_path=video_path,
                    aspect_ratio="16:9",
                    image_scale=1.0,
                    image_scale_x=1.0,
                    image_scale_y=1.0,
                    image_pos_x=0.0,
                    image_pos_y=0.0,
                    image_rotation=0.0,
                    background_color="black",
                    is_subscribed=True,
                    remove_watermark=True,
                    ffmpeg_path="/usr/bin/ffmpeg"
                )

                # Verify subprocess.run was called
                mock_run.assert_called_once()
                args, _ = mock_run.call_args
                cmd = args[0]
                self.assertEqual(cmd[0], "/usr/bin/ffmpeg")
                self.assertIn("/tmp/audio.mp3", cmd)
                self.assertIn("/tmp/image.jpg", cmd)

    async def test_upload_video_helper(self):
        """Test upload_video helper function (to be created)"""
        if not hasattr(server, 'upload_video'):
            self.skipTest("upload_video not implemented yet")

        # Mock YouTube client
        mock_youtube = MagicMock()
        mock_request = MagicMock()
        mock_response = {"id": "video123"}
        mock_request.next_chunk.side_effect = [(MagicMock(progress=lambda: 0.5), None), (None, mock_response)]
        mock_youtube.videos().insert.return_value = mock_request

        # Call the function
        video_path = Path("/tmp/video.mp4")
        title = "Test Video"
        description = "Test Description"
        tags = ["tag1", "tag2"]
        privacy_status = "private"

        # Mock file size and MediaFileUpload
        with patch('pathlib.Path.stat') as mock_stat, \
             patch('backend.server.MediaFileUpload') as mock_media_upload:

            mock_stat.return_value.st_size = 1000

            response = await server.upload_video(
                youtube_client=mock_youtube,
                video_path=video_path,
                title=title,
                description=description,
                tags=tags,
                privacy_status=privacy_status
            )

            self.assertEqual(response, mock_response)
            mock_youtube.videos().insert.assert_called_once()

if __name__ == '__main__':
    unittest.main()
