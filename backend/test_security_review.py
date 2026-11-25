"""Security review, Nov 2026: each test is a gap that used to be open."""

import os
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://mock-mongo:27017/testdb')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-long-enough')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '60')
os.environ.setdefault('STRIPE_SECRET_KEY', 'sk_test_mock')

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

with patch('motor.motor_asyncio.AsyncIOMotorClient'):
    import server

from fastapi import HTTPException


# --- The public health check showed the raw database error and the job queue to anyone ---

_FAILING_SNAPSHOT = {
    "status": "unhealthy",
    "ready": False,
    "timestamp": "2026-11-24T00:00:00+00:00",
    "db": {"ok": False, "error": "ServerSelectionTimeoutError: mongo-internal.example:27017"},
    "jobs": {"queued": 3, "processing": 1},
    "controls": {"max_processing_jobs": 8},
    "warnings": ["Database ping failed."],
}


@pytest.mark.asyncio
async def test_public_health_hides_database_error_and_ops_details():
    with patch.object(server, '_build_health_snapshot', AsyncMock(return_value=dict(_FAILING_SNAPSHOT))):
        body = await server.get_health()
    assert body["db"] == {"ok": False}
    assert "jobs" not in body and "controls" not in body
    assert "mongo-internal" not in str(body)


@pytest.mark.asyncio
async def test_failed_readiness_check_does_not_leak_the_database_error():
    with patch.object(server, '_build_health_snapshot', AsyncMock(return_value=dict(_FAILING_SNAPSHOT))):
        with pytest.raises(HTTPException) as exc:
            await server.get_health_ready()
    assert exc.value.status_code == 503
    assert "mongo-internal" not in str(exc.value.detail)


# --- An account with no password crashed login with a 500 instead of a clean 401 ---

@pytest.mark.asyncio
async def test_login_to_an_account_without_a_password_is_a_401():
    async def allow(*_args, **_kwargs):
        return None

    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={"id": "u1", "username": "googleonly", "created_at": "2026-01-01"})
    request = SimpleNamespace(client=SimpleNamespace(host='203.0.113.9'), headers={})
    with patch.object(server, 'db', db), patch.object(server, '_check_rate_limit_persistent', allow):
        with pytest.raises(HTTPException) as exc:
            await server.login(server.UserLogin(username='googleonly', password='anything'), request)
    assert exc.value.status_code == 401
