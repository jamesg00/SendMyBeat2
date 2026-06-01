import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock

os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test_secret"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["JWT_EXPIRATION_MINUTES"] = "60"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_123"
os.environ["GOOGLE_CLIENT_ID"] = "test_client_id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test_client_secret"
os.environ["DB_NAME"] = "test_db"

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend import server
from unittest.mock import patch


class TestAdminOps(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.mock_db = MagicMock()
        server.db = self.mock_db
        server.background_job_service.db = self.mock_db
        self.admin_user = {"id": "admin_1", "username": "admin", "is_admin": True}
        self.non_admin_user = {"id": "user_1", "username": "user", "is_admin": False}

    async def test_clear_admin_ops_jobs_marks_active_uploads_failed(self):
        update_result = MagicMock()
        update_result.modified_count = 2
        self.mock_db.upload_jobs.update_many = AsyncMock(return_value=update_result)

        request = server.AdminClearJobsRequest(
            job_type="youtube_upload",
            statuses=["queued", "processing"],
        )
        with patch("backend.server._is_admin_user", return_value=True):
            result = await server.clear_admin_ops_jobs(request, current_user=self.admin_user)

        self.assertTrue(result["success"])
        self.assertEqual(result["cleared_count"], 2)
        call_args = self.mock_db.upload_jobs.update_many.await_args
        self.assertEqual(call_args.args[0]["type"], "youtube_upload")
        self.assertEqual(call_args.args[0]["status"]["$in"], ["queued", "processing"])
        self.assertEqual(call_args.args[1]["$set"]["status"], "failed")
        self.assertEqual(call_args.args[1]["$set"]["message"], "Job cleared by admin.")
        self.assertTrue(call_args.args[1]["$set"]["cancel_requested"])

    async def test_clear_admin_ops_jobs_requires_admin(self):
        request = server.AdminClearJobsRequest()
        with patch("backend.server._is_admin_user", return_value=False):
            with self.assertRaises(server.HTTPException) as cm:
                await server.clear_admin_ops_jobs(request, current_user=self.non_admin_user)
        self.assertEqual(cm.exception.status_code, 403)

    async def test_clear_admin_ops_job_by_id(self):
        update_result = MagicMock()
        update_result.modified_count = 1
        self.mock_db.upload_jobs.find_one = AsyncMock(
            return_value={
                "id": "job_123",
                "status": "processing",
                "type": "youtube_upload",
                "user_id": "user_123",
            }
        )
        self.mock_db.upload_jobs.update_one = AsyncMock(return_value=update_result)

        with patch("backend.server._is_admin_user", return_value=True):
            result = await server.clear_admin_ops_job("job_123", current_user=self.admin_user)

        self.assertTrue(result["success"])
        self.assertTrue(result["cleared"])
        self.assertEqual(result["job_id"], "job_123")
        self.assertEqual(result["previous_status"], "processing")
        self.assertTrue(result["was_processing"])
        update_args = self.mock_db.upload_jobs.update_one.await_args
        self.assertEqual(update_args.args[0], {"id": "job_123"})
        self.assertEqual(update_args.args[1]["$set"]["status"], "failed")
        self.assertTrue(update_args.args[1]["$set"]["cancel_requested"])


if __name__ == "__main__":
    unittest.main()
