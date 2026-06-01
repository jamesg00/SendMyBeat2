import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

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


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args, **_kwargs):
        return self

    def skip(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    async def to_list(self, *_args, **_kwargs):
        return self.rows


class TestAdminUsers(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.mock_db = MagicMock()
        server.db = self.mock_db
        server.background_job_service.db = self.mock_db
        self.admin_user = {"id": "admin_1", "username": "admin"}
        self.regular_user = {"id": "user_1", "username": "producer"}

    async def test_get_admin_users_requires_admin(self):
        with patch("backend.server._is_admin_user", return_value=False):
            with self.assertRaises(server.HTTPException) as cm:
                await server.get_admin_users(current_user=self.regular_user)
        self.assertEqual(cm.exception.status_code, 403)

    async def test_get_admin_users_lists_users_with_status(self):
        self.mock_db.users.count_documents = AsyncMock(return_value=1)
        self.mock_db.users.find = MagicMock(return_value=FakeCursor([
            {
                "id": "user_1",
                "username": "producer",
                "created_at": "2026-01-01T00:00:00+00:00",
                "password_hash": "hash",
                "deleted": False,
            }
        ]))
        self.mock_db.youtube_connections.find = MagicMock(return_value=FakeCursor([
            {"user_id": "user_1", "google_email": "producer@example.com"}
        ]))

        with patch("backend.server._is_admin_user", return_value=True):
            response = await server.get_admin_users(search="prod", current_user=self.admin_user)

        self.assertTrue(response["success"])
        self.assertEqual(response["users"][0]["username"], "producer")
        self.assertEqual(response["users"][0]["email"], "producer@example.com")
        self.assertEqual(response["users"][0]["auth_provider"], "password")
        self.assertEqual(response["users"][0]["status"], "active")
        self.assertEqual(response["pagination"]["total"], 1)

    async def test_disable_admin_user_soft_deletes_and_clears_spotlight(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"id": "user_1", "username": "producer"})
        update_result = MagicMock()
        update_result.modified_count = 1
        self.mock_db.users.update_one = AsyncMock(return_value=update_result)
        self.mock_db.producer_profiles.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        self.mock_db.producer_stats_cache.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        self.mock_db.spotlight_cache.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))

        with patch("backend.server._is_admin_user", return_value=True):
            response = await server.disable_admin_user("user_1", current_user=self.admin_user)

        self.assertTrue(response["success"])
        update_doc = self.mock_db.users.update_one.await_args.args[1]["$set"]
        self.assertTrue(update_doc["deleted"])
        self.assertEqual(update_doc["deleted_by"], "admin_1")
        self.mock_db.producer_profiles.delete_many.assert_awaited_once_with({"user_id": "user_1"})
        self.mock_db.producer_stats_cache.delete_many.assert_awaited_once_with({"user_id": "user_1"})
        self.mock_db.spotlight_cache.delete_many.assert_awaited_once_with({})

    async def test_delete_admin_user_hard_deletes_and_clears_spotlight(self):
        self.mock_db.users.find_one = AsyncMock(return_value={"id": "user_1", "username": "producer"})
        delete_result = MagicMock()
        delete_result.deleted_count = 1
        self.mock_db.users.delete_one = AsyncMock(return_value=delete_result)
        self.mock_db.producer_profiles.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        self.mock_db.producer_stats_cache.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))
        self.mock_db.spotlight_cache.delete_many = AsyncMock(return_value=MagicMock(deleted_count=1))

        with patch("backend.server._is_admin_user", return_value=True):
            response = await server.delete_admin_user("user_1", current_user=self.admin_user)

        self.assertTrue(response["success"])
        self.assertTrue(response["deleted"])
        self.mock_db.users.delete_one.assert_awaited_once_with({"id": "user_1"})
        self.mock_db.producer_profiles.delete_many.assert_awaited_once_with({"user_id": "user_1"})


if __name__ == "__main__":
    unittest.main()
