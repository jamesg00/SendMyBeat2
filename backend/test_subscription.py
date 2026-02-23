import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
import pytest

# Set environment variables required for server import
os.environ['MONGO_URL'] = 'mongodb://mock'
os.environ['JWT_SECRET_KEY'] = 'mock_secret'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '30'
os.environ['STRIPE_PRICE_ID'] = 'mock_price'
os.environ['STRIPE_SECRET_KEY'] = 'mock_stripe_key'

# Add the current directory to sys.path so we can import backend.server
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Now import the module under test
try:
    from backend import server
except ImportError:
    sys.path.append(os.getcwd())
    from backend import server

@pytest.mark.asyncio
class TestSubscriptionStatus:

    async def test_user_not_found(self):
        """Test getting status for a non-existent user."""
        # Patch the entire db object in backend.server
        with patch('backend.server.db') as mock_db:
            # Setup mock for find_one
            mock_db.users.find_one = AsyncMock(return_value=None)

            status = await server.get_user_subscription_status("non_existent_user")

            assert status['is_subscribed'] is False
            assert status['credits_remaining'] == 0

            mock_db.users.find_one.assert_called_once_with({"id": "non_existent_user"})

    async def test_pro_user(self):
        """Test status for a user with active subscription."""
        user_doc = {
            "id": "pro_user",
            "stripe_subscription_id": "sub_123",
            "subscription_status": "active"
        }

        with patch('backend.server.db') as mock_db:
            mock_db.users.find_one = AsyncMock(return_value=user_doc)

            status = await server.get_user_subscription_status("pro_user")

            assert status['is_subscribed'] is True
            assert status['plan'] == 'pro'
            assert status['credits_remaining'] == -1
            assert status['upload_credits_remaining'] == -1

    async def test_free_user_new_day_reset(self):
        """Test free user credits reset on a new day."""
        # Current time: 2024-01-02 12:00:00 UTC
        mock_now = datetime(2024, 1, 2, 12, 0, 0, tzinfo=timezone.utc)

        user_doc = {
            "id": "free_user",
            "daily_usage_date": "2024-01-01", # Yesterday
            "daily_usage_count": 3,
            "daily_upload_count": 3
        }

        with patch('backend.server.db') as mock_db, \
             patch('backend.server.datetime') as mock_datetime:

            mock_db.users.find_one = AsyncMock(return_value=user_doc)
            mock_db.users.update_one = AsyncMock()

            # Configure mock datetime
            mock_datetime.now.return_value = mock_now
            mock_datetime.combine = datetime.combine
            mock_datetime.min = datetime.min
            mock_datetime.fromisoformat = datetime.fromisoformat

            status = await server.get_user_subscription_status("free_user")

            # Verify update was called to reset
            mock_db.users.update_one.assert_called_once()
            args, kwargs = mock_db.users.update_one.call_args
            assert args[0] == {"id": "free_user"}
            assert args[1]["$set"]["daily_usage_count"] == 0
            assert args[1]["$set"]["daily_upload_count"] == 0
            assert args[1]["$set"]["daily_usage_date"] == "2024-01-02"

            # Verify status
            assert status['is_subscribed'] is False
            assert status['plan'] == 'free'
            assert status['credits_remaining'] == 3
            assert status['upload_credits_remaining'] == 3

            # Verify resets_at is correctly calculated for tomorrow
            expected_resets_at = "2024-01-03T00:00:00+00:00"
            assert status['resets_at'] == expected_resets_at

    async def test_free_user_partial_usage_today(self):
        """Test free user with some usage today."""
        # Current time: 2024-01-02 12:00:00 UTC
        mock_now = datetime(2024, 1, 2, 12, 0, 0, tzinfo=timezone.utc)

        user_doc = {
            "id": "free_user",
            "daily_usage_date": "2024-01-02", # Today
            "daily_usage_count": 1,
            "daily_upload_count": 2
        }

        with patch('backend.server.db') as mock_db, \
             patch('backend.server.datetime') as mock_datetime:

            mock_db.users.find_one = AsyncMock(return_value=user_doc)
            mock_db.users.update_one = AsyncMock()

            # Configure mock datetime
            mock_datetime.now.return_value = mock_now
            mock_datetime.combine = datetime.combine
            mock_datetime.min = datetime.min
            mock_datetime.fromisoformat = datetime.fromisoformat

            status = await server.get_user_subscription_status("free_user")

            # Verify update was NOT called (no reset needed)
            mock_db.users.update_one.assert_not_called()

            # Verify status
            assert status['is_subscribed'] is False
            assert status['plan'] == 'free'
            assert status['credits_remaining'] == 2 # 3 - 1
            assert status['upload_credits_remaining'] == 1 # 3 - 2

    async def test_free_user_exhausted_credits(self):
        """Test free user with no credits remaining."""
        # Current time: 2024-01-02 12:00:00 UTC
        mock_now = datetime(2024, 1, 2, 12, 0, 0, tzinfo=timezone.utc)

        user_doc = {
            "id": "free_user",
            "daily_usage_date": "2024-01-02", # Today
            "daily_usage_count": 5, # Over limit
            "daily_upload_count": 5
        }

        with patch('backend.server.db') as mock_db, \
             patch('backend.server.datetime') as mock_datetime:

            mock_db.users.find_one = AsyncMock(return_value=user_doc)
            mock_db.users.update_one = AsyncMock()

            # Configure mock datetime
            mock_datetime.now.return_value = mock_now
            mock_datetime.combine = datetime.combine
            mock_datetime.min = datetime.min
            mock_datetime.fromisoformat = datetime.fromisoformat

            status = await server.get_user_subscription_status("free_user")

            mock_db.users.update_one.assert_not_called()

            assert status['is_subscribed'] is False
            assert status['credits_remaining'] == 0 # Max(0, 3-5)
            assert status['upload_credits_remaining'] == 0
