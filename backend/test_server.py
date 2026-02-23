import os
import sys
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

# --- Setup Environment & Path ---
# Mock environment variables required by server.py at module level
os.environ['MONGO_URL'] = 'mongodb://mock-mongo:27017/testdb'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '60'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_mock'
os.environ['STRIPE_PRICE_ID'] = 'price_mock'

# Add the backend directory to sys.path so that 'server' can import its siblings
# (e.g. models_spotlight) as if it were running from within backend/
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Mock AsyncIOMotorClient to prevent actual connection attempts during import
# We use patch on 'motor.motor_asyncio.AsyncIOMotorClient'
with patch('motor.motor_asyncio.AsyncIOMotorClient') as MockClient:
    # Now import the module under test
    # Because 'server' is in the same directory and added to sys.path, we can import it directly
    import server

# --- Tests ---

@pytest.mark.asyncio
async def test_check_and_use_upload_credit_pro_user():
    """
    Test that a Pro user always gets access (True) and no credits are consumed.
    """
    user_id = "pro-user-123"

    # Mock subscription status to be PRO
    pro_status = {
        "is_subscribed": True,
        "plan": "pro",
        "credits_remaining": -1,
        "credits_total": -1,
        "upload_credits_remaining": -1,
        "upload_credits_total": -1,
        "resets_at": None
    }

    with patch('server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_status, \
         patch.object(server.db.users, 'update_one', new_callable=AsyncMock) as mock_update_one:

        mock_get_status.return_value = pro_status

        result = await server.check_and_use_upload_credit(user_id)

        assert result is True
        mock_get_status.assert_awaited_once_with(user_id)
        mock_update_one.assert_not_called()

@pytest.mark.asyncio
async def test_check_and_use_upload_credit_free_user_with_credits():
    """
    Test that a Free user with credits gets access (True) and a credit is consumed.
    """
    user_id = "free-user-with-credits"

    # Mock subscription status to be FREE with credits
    free_status_ok = {
        "is_subscribed": False,
        "plan": "free",
        "credits_remaining": 3,
        "credits_total": 3,
        "upload_credits_remaining": 2, # Has credits
        "upload_credits_total": 3,
        "resets_at": "tomorrow"
    }

    with patch('server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_status, \
         patch.object(server.db.users, 'update_one', new_callable=AsyncMock) as mock_update_one:

        mock_get_status.return_value = free_status_ok

        result = await server.check_and_use_upload_credit(user_id)

        assert result is True
        mock_get_status.assert_awaited_once_with(user_id)

        # Verify usage increment
        mock_update_one.assert_awaited_once_with(
            {"id": user_id},
            {"$inc": {"daily_upload_count": 1}}
        )

@pytest.mark.asyncio
async def test_check_and_use_upload_credit_free_user_no_credits():
    """
    Test that a Free user with NO credits is denied access (False) and no credit is consumed.
    """
    user_id = "free-user-no-credits"

    # Mock subscription status to be FREE with NO credits
    free_status_empty = {
        "is_subscribed": False,
        "plan": "free",
        "credits_remaining": 3,
        "credits_total": 3,
        "upload_credits_remaining": 0, # No credits
        "upload_credits_total": 3,
        "resets_at": "tomorrow"
    }

    with patch('server.get_user_subscription_status', new_callable=AsyncMock) as mock_get_status, \
         patch.object(server.db.users, 'update_one', new_callable=AsyncMock) as mock_update_one:

        mock_get_status.return_value = free_status_empty

        result = await server.check_and_use_upload_credit(user_id)

        assert result is False
        mock_get_status.assert_awaited_once_with(user_id)
        mock_update_one.assert_not_called()
