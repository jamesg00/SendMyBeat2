import sys
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta

# Mock jwt before importing auth_utils
mock_jwt = MagicMock()
sys.modules["jwt"] = mock_jwt

from backend.auth_utils import create_access_token_internal

def test_create_access_token_internal_success():
    """Test that create_access_token_internal correctly encodes the expected payload."""
    user_id = "123"
    username = "testuser"
    secret = "test_secret"
    algorithm = "HS256"
    expiration = 60

    fixed_now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    with patch('backend.auth_utils.datetime') as mock_datetime:
        mock_datetime.now.return_value = fixed_now
        mock_datetime.timezone = timezone
        mock_datetime.timedelta = timedelta

        # Reset mock
        mock_jwt.encode.reset_mock()
        mock_jwt.encode.return_value = "mocked_token"

        # Call the function
        token = create_access_token_internal(user_id, username, secret, algorithm, expiration)

        # Expected expiration
        expected_expire = fixed_now + timedelta(minutes=expiration)

        # Verify jwt.encode was called with correct arguments
        mock_jwt.encode.assert_called_once_with(
            {"sub": user_id, "username": username, "exp": expected_expire},
            secret,
            algorithm=algorithm
        )

        # Verify the return value
        assert token == "mocked_token"

def test_create_access_token_internal_expiration():
    """Test that expiration is correctly calculated."""
    user_id = "789"
    username = "expuser"
    secret = "secret"
    algorithm = "HS256"
    expiration = 30

    fixed_now = datetime(2024, 3, 1, 15, 0, 0, tzinfo=timezone.utc)

    with patch('backend.auth_utils.datetime') as mock_datetime:
        mock_datetime.now.return_value = fixed_now
        mock_datetime.timezone = timezone
        mock_datetime.timedelta = timedelta

        mock_jwt.encode.reset_mock()

        create_access_token_internal(user_id, username, secret, algorithm, expiration)

        expected_expire = fixed_now + timedelta(minutes=expiration)

        args, _ = mock_jwt.encode.call_args
        assert args[0]["exp"] == expected_expire
