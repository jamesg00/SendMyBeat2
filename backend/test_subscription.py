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
            mock_db.users.update_one = AsyncMock()

            status = await server.get_user_subscription_status("pro_user")

            assert status['is_subscribed'] is True
            assert status['plan'] == 'plus'
            assert status['credits_remaining'] == server._get_paid_plan_limits('plus')['ai_credits']
            assert status['upload_credits_remaining'] == server._get_paid_plan_limits('plus')['upload_credits']

    @patch('backend.server.FREE_STARTER_AI_CREDITS', 3)
    @patch('backend.server.FREE_STARTER_UPLOAD_CREDITS', 3)
    async def test_free_user_starter_credits_never_reset(self):
        """Free accounts get a one-time starter allowance: no daily reset, no resets_at."""
        user_doc = {
            "id": "free_user",
            "daily_usage_date": "2024-01-01",  # an old day: must not trigger a reset
            "free_ai_used": 1,
            "free_upload_used": 2,
        }
        with patch('backend.server.db') as mock_db, \
             patch.object(server, '_get_user_monthly_llm_cost', AsyncMock(return_value=0.0)):
            mock_db.users.find_one = AsyncMock(return_value=user_doc)
            mock_db.users.update_one = AsyncMock()

            status = await server.get_user_subscription_status("free_user")

            mock_db.users.update_one.assert_not_called()
            assert status['is_subscribed'] is False
            assert status['plan'] == 'free'
            assert status['counter'] == 'starter'
            assert status['credits_remaining'] == 2
            assert status['upload_credits_remaining'] == 1
            assert status['resets_at'] is None
            assert server._usage_fields(status) == ('free_ai_used', 'free_upload_used')

    @patch('backend.server.FREE_STARTER_AI_CREDITS', 3)
    @patch('backend.server.FREE_STARTER_UPLOAD_CREDITS', 3)
    async def test_free_user_exhausted_credits(self):
        """Once the starter credits are used, nothing comes back the next day."""
        user_doc = {
            "id": "free_user",
            "daily_usage_date": "2024-01-01",
            "daily_usage_count": 0,
            "free_ai_used": 3,
            "free_upload_used": 5,
        }
        with patch('backend.server.db') as mock_db, \
             patch.object(server, '_get_user_monthly_llm_cost', AsyncMock(return_value=0.0)):
            mock_db.users.find_one = AsyncMock(return_value=user_doc)
            mock_db.users.update_one = AsyncMock()

            status = await server.get_user_subscription_status("free_user")

            mock_db.users.update_one.assert_not_called()
            assert status['is_subscribed'] is False
            assert status['credits_remaining'] == 0
            assert status['upload_credits_remaining'] == 0
            detail = server._paywall_detail(status, 'generations')
            assert detail['code'] == 'needs_plan' and 'used your free generations' in detail['message']
