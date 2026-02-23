import unittest
from unittest.mock import patch, MagicMock
import sys
import os
import importlib
from datetime import datetime
import uuid
from pydantic import ValidationError

class TestUserModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Setup mocks and environment variables
        # We use patch.dict to ensure these changes are temporary and reversible
        cls.env_patcher = patch.dict(os.environ, {
            'MONGO_URL': 'mongodb://localhost:27017',
            'JWT_SECRET_KEY': 'test_secret',
            'JWT_ALGORITHM': 'HS256',
            'JWT_EXPIRATION_MINUTES': '60',
            'STRIPE_SECRET_KEY': 'sk_test_123',
            'GOOGLE_CLIENT_ID': 'test_client_id',
            'GOOGLE_CLIENT_SECRET': 'test_client_secret',
            'STRIPE_PRICE_ID': 'price_123',
            'STRIPE_WEBHOOK_SECRET': 'whsec_123',
            'FRONTEND_URL': 'http://localhost:3000',
            'GROK_API_KEY': 'grok_key_123'
        })
        cls.env_patcher.start()

        # Mock external dependencies to prevent side effects during import
        # We mock motor (DB) and stripe
        cls.modules_patcher = patch.dict(sys.modules, {
            'motor': MagicMock(),
            'motor.motor_asyncio': MagicMock(),
            'stripe': MagicMock()
        })
        cls.modules_patcher.start()

        # Add backend directory to path if needed
        cls.backend_dir = os.path.dirname(os.path.abspath(__file__))
        cls.path_inserted = False
        if cls.backend_dir not in sys.path:
            sys.path.insert(0, cls.backend_dir)
            cls.path_inserted = True

        # Import server module
        # We perform the import here so it happens within the mocked context
        try:
            import server
            # Reload to ensure it picks up our mocks/env vars if it was already loaded
            importlib.reload(server)
            cls.User = server.User
            cls.module_name = 'server'
        except ImportError:
            import backend.server
            importlib.reload(backend.server)
            cls.User = backend.server.User
            cls.module_name = 'backend.server'

    @classmethod
    def tearDownClass(cls):
        # Stop patches
        cls.env_patcher.stop()
        cls.modules_patcher.stop()

        # Restore sys.path
        if cls.path_inserted:
            sys.path.remove(cls.backend_dir)

        # Clean up sys.modules to avoid polluting other tests with our mocked module version
        # This forces the next test that imports server to reload it (hopefully with correct env/mocks for that test)
        if hasattr(cls, 'module_name') and cls.module_name in sys.modules:
            del sys.modules[cls.module_name]

    def test_user_defaults(self):
        """Test that a new User has correct default values."""
        # Check ID is a valid UUID
        user = self.User(username="testuser")

        try:
            uuid.UUID(user.id)
        except ValueError:
            self.fail("User ID is not a valid UUID")

        # Check created_at is a datetime
        self.assertIsInstance(user.created_at, datetime)

        # Check reminder defaults (these fields exist in the actual server.py User model)
        self.assertFalse(user.reminder_email_enabled)
        self.assertFalse(user.reminder_sms_enabled)
        self.assertEqual(user.reminder_time, "12:00")
        self.assertEqual(user.reminder_tz, "America/Los_Angeles")
        self.assertIsNone(user.reminder_last_sent)

    def test_user_required_fields(self):
        """Test that username is required."""
        with self.assertRaises(ValidationError):
            self.User() # Missing username

    def test_user_optional_fields(self):
        """Test setting optional fields."""
        email = "test@example.com"
        phone = "+1234567890"
        user = self.User(username="testuser", email=email, phone=phone)

        self.assertEqual(user.email, email)
        self.assertEqual(user.phone, phone)

    def test_extra_ignore(self):
        """Test that extra fields are ignored."""
        user = self.User(username="testuser", extra_field="should_be_ignored")
        self.assertFalse(hasattr(user, "extra_field"))

if __name__ == '__main__':
    unittest.main()
