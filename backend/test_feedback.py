"""Bug reports and feature ideas."""

import os
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://mock-mongo:27017/testdb')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key-long-enough')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '60')

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

with patch('motor.motor_asyncio.AsyncIOMotorClient'):
    import server

from fastapi import HTTPException
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_feedback_is_saved_with_who_sent_it():
    server._action_rate_limit_buckets.pop('feedback:u1', None)
    db = MagicMock()
    db.feedback.insert_one = AsyncMock()
    req = server.FeedbackRequest(kind='bug', message='The upload stops at 90%', screen='Upload Studio', platform='ios')
    with patch.object(server, 'db', db):
        res = await server.send_feedback(req, current_user={'id': 'u1', 'username': 'james'})
    saved = db.feedback.insert_one.await_args.args[0]
    assert res['ok'] and saved['user_id'] == 'u1' and saved['kind'] == 'bug' and saved['status'] == 'new'
    assert saved['screen'] == 'Upload Studio'


def test_feedback_input_is_checked():
    with pytest.raises(ValidationError):
        server.FeedbackRequest(kind='spam', message='hello there')
    with pytest.raises(ValidationError):
        server.FeedbackRequest(kind='idea', message='hi')
    with pytest.raises(ValidationError):
        server.FeedbackRequest(kind='idea', message='x' * 5000)


@pytest.mark.asyncio
async def test_feedback_is_rate_limited():
    server._action_rate_limit_buckets.pop('feedback:spammer', None)
    db = MagicMock()
    db.feedback.insert_one = AsyncMock()
    req = server.FeedbackRequest(kind='idea', message='Add a dark mode please')
    with patch.object(server, 'db', db):
        for _ in range(10):
            await server.send_feedback(req, current_user={'id': 'spammer'})
        with pytest.raises(HTTPException) as err:
            await server.send_feedback(req, current_user={'id': 'spammer'})
    assert err.value.status_code == 429


@pytest.mark.asyncio
async def test_only_admins_read_and_update_feedback():
    with patch.object(server, 'ADMIN_USER_IDS', {'admin'}):
        with pytest.raises(HTTPException) as err:
            await server.list_feedback(current_user={'id': 'someone'})
        assert err.value.status_code == 403
        with pytest.raises(HTTPException):
            await server.update_feedback('f1', server.FeedbackUpdateRequest(status='fixed'), current_user={'id': 'someone'})

        cursor = MagicMock()
        cursor.sort.return_value.to_list = AsyncMock(return_value=[{'id': 'f1'}])
        db = MagicMock()
        db.feedback.find = MagicMock(return_value=cursor)
        db.feedback.update_one = AsyncMock(return_value=SimpleNamespace(matched_count=1))
        with patch.object(server, 'db', db):
            assert (await server.list_feedback(current_user={'id': 'admin'}))['items'] == [{'id': 'f1'}]
            assert db.feedback.find.call_args.args[0] == {'status': {'$in': ['new', 'planned']}}
            await server.update_feedback('f1', server.FeedbackUpdateRequest(status='fixed'), current_user={'id': 'admin'})
        assert db.feedback.update_one.await_args.args[1]['$set']['status'] == 'fixed'


@pytest.mark.asyncio
async def test_you_only_see_your_own_feedback():
    cursor = MagicMock()
    cursor.sort.return_value.to_list = AsyncMock(return_value=[])
    db = MagicMock()
    db.feedback.find = MagicMock(return_value=cursor)
    with patch.object(server, 'db', db):
        await server.my_feedback(current_user={'id': 'u1'})
    assert db.feedback.find.call_args.args[0] == {'user_id': 'u1'}
