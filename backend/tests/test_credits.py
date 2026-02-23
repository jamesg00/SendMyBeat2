import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock, patch

# Set required environment variables before importing server
# These must be set because server.py reads them at module level
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['JWT_SECRET_KEY'] = 'test_secret'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_EXPIRATION_MINUTES'] = '30'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_123'
os.environ['STRIPE_PRICE_ID'] = 'price_123'
os.environ['GOOGLE_CLIENT_ID'] = 'client_id'
os.environ['GOOGLE_CLIENT_SECRET'] = 'client_secret'
os.environ['DB_NAME'] = 'test_db'

# Try importing backend.server
try:
    from backend.server import check_and_use_credit
except ImportError:
    # Adjust python path if needed (e.g. running from root)
    # Add root directory to path for 'backend' package import
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    # Add backend directory to path for internal imports (like models_spotlight)
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from backend.server import check_and_use_credit

class TestCheckAndUseCredit(unittest.IsolatedAsyncioTestCase):

    @patch('backend.server.get_user_subscription_status')
    @patch('backend.server.db')
    async def test_pro_user_always_allowed(self, mock_db, mock_get_status):
        """Test that pro users are always allowed and consume no credits."""
        # Setup mock for pro user
        mock_get_status.return_value = {
            "is_subscribed": True,
            "plan": "pro",
            "credits_remaining": -1,
            "credits_total": -1
        }

        # Call function
        user_id = "user123"
        result = await check_and_use_credit(user_id, consume=True)

        # Assertions
        self.assertTrue(result)
        mock_get_status.assert_called_once_with(user_id)
        # Database should NOT be updated for pro users
        mock_db.users.update_one.assert_not_called()

    @patch('backend.server.get_user_subscription_status')
    @patch('backend.server.db')
    async def test_free_user_with_credits_allowed(self, mock_db, mock_get_status):
        """Test that free users with credits are allowed and credit is consumed."""
        # Setup mock for free user with credits
        mock_get_status.return_value = {
            "is_subscribed": False,
            "plan": "free",
            "credits_remaining": 1,
            "credits_total": 3
        }

        # Configure update_one to be awaitable
        mock_db.users.update_one = AsyncMock()

        # Call function
        user_id = "user123"
        result = await check_and_use_credit(user_id, consume=True)

        # Assertions
        self.assertTrue(result)
        mock_get_status.assert_called_once_with(user_id)
        # Database should be updated to consume credit
        mock_db.users.update_one.assert_called_once_with(
            {"id": user_id},
            {"$inc": {"daily_usage_count": 1}}
        )

    @patch('backend.server.get_user_subscription_status')
    @patch('backend.server.db')
    async def test_free_user_no_credits_denied(self, mock_db, mock_get_status):
        """Test that free users with no credits are denied."""
        # Setup mock for free user with NO credits
        mock_get_status.return_value = {
            "is_subscribed": False,
            "plan": "free",
            "credits_remaining": 0,
            "credits_total": 3
        }

        # Call function
        user_id = "user123"
        result = await check_and_use_credit(user_id, consume=True)

        # Assertions
        self.assertFalse(result)
        mock_get_status.assert_called_once_with(user_id)
        # Database should NOT be updated
        mock_db.users.update_one.assert_not_called()

    @patch('backend.server.get_user_subscription_status')
    @patch('backend.server.db')
    async def test_consume_false_does_not_use_credit(self, mock_db, mock_get_status):
        """Test that consume=False checks credits but does not use them."""
        # Setup mock for free user with credits
        mock_get_status.return_value = {
            "is_subscribed": False,
            "plan": "free",
            "credits_remaining": 1,
            "credits_total": 3
        }

        # Call function with consume=False
        user_id = "user123"
        result = await check_and_use_credit(user_id, consume=False)

        # Assertions
        self.assertTrue(result)
        mock_get_status.assert_called_once_with(user_id)
        # Database should NOT be updated
        mock_db.users.update_one.assert_not_called()

if __name__ == '__main__':
    unittest.main()
