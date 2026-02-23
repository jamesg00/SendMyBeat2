import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

# Mock environment variables needed for server import
with patch.dict('os.environ', {
    'JWT_SECRET_KEY': 'test_secret',
    'JWT_ALGORITHM': 'HS256',
    'JWT_EXPIRATION_MINUTES': '60',
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'test_db',
    'STRIPE_SECRET_KEY': 'sk_test_123',
    'SENDGRID_API_KEY': 'SG.123',
    'TEXTBELT_API_KEY': 'txt_123',
}):
    # Also mock motor.motor_asyncio.AsyncIOMotorClient to avoid connection error on import
    with patch('motor.motor_asyncio.AsyncIOMotorClient', MagicMock()):
        from backend.server import ensure_has_credit, check_and_use_credit, get_user_subscription_status

@pytest.mark.asyncio
async def test_ensure_has_credit_success():
    """Test that ensure_has_credit passes when user has credit"""
    with patch('backend.server.check_and_use_credit', new_callable=AsyncMock) as mock_check:
        mock_check.return_value = True

        # Should not raise exception
        await ensure_has_credit('user123', 'generations')

        mock_check.assert_called_once_with('user123', consume=False)

@pytest.mark.asyncio
async def test_ensure_has_credit_failure_generations():
    """Test that ensure_has_credit raises 402 when user has no credit for generations"""
    with patch('backend.server.check_and_use_credit', new_callable=AsyncMock) as mock_check:
        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_status:
            mock_check.return_value = False
            mock_status.return_value = {'resets_at': '2024-01-01T00:00:00Z'}

            with pytest.raises(HTTPException) as excinfo:
                await ensure_has_credit('user123', 'generations')

            assert excinfo.value.status_code == 402
            assert excinfo.value.detail['message'] == "Daily limit reached. Upgrade to Pro for unlimited generations!"
            assert excinfo.value.detail['resets_at'] == '2024-01-01T00:00:00Z'

@pytest.mark.asyncio
async def test_ensure_has_credit_failure_analytics():
    """Test that ensure_has_credit raises 402 when user has no credit for analytics"""
    with patch('backend.server.check_and_use_credit', new_callable=AsyncMock) as mock_check:
        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_status:
            mock_check.return_value = False
            mock_status.return_value = {'resets_at': '2024-01-01T00:00:00Z'}

            with pytest.raises(HTTPException) as excinfo:
                await ensure_has_credit('user123', 'analytics')

            assert excinfo.value.status_code == 402
            assert excinfo.value.detail['message'] == "Daily limit reached. Upgrade to Pro for unlimited analytics!"

@pytest.mark.asyncio
async def test_ensure_has_credit_failure_thumbnail_checks():
    """Test that ensure_has_credit raises 402 when user has no credit for thumbnail checks"""
    with patch('backend.server.check_and_use_credit', new_callable=AsyncMock) as mock_check:
        with patch('backend.server.get_user_subscription_status', new_callable=AsyncMock) as mock_status:
            mock_check.return_value = False
            mock_status.return_value = {'resets_at': '2024-01-01T00:00:00Z'}

            with pytest.raises(HTTPException) as excinfo:
                await ensure_has_credit('user123', 'thumbnail checks')

            assert excinfo.value.status_code == 402
            assert excinfo.value.detail['message'] == "Daily limit reached. Upgrade to Pro for unlimited thumbnail checks!"
