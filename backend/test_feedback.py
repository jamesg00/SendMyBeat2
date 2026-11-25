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


@pytest.mark.asyncio
async def test_admin_feedback_can_be_filtered_by_kind():
    cursor = MagicMock()
    cursor.sort.return_value.to_list = AsyncMock(return_value=[])
    db = MagicMock()
    db.feedback.find = MagicMock(return_value=cursor)
    with patch.object(server, 'ADMIN_USER_IDS', {'admin'}), patch.object(server, 'db', db):
        await server.list_feedback(status='all', kind='bug', current_user={'id': 'admin'})
        assert db.feedback.find.call_args.args[0] == {'kind': 'bug'}
        await server.list_feedback(status='new', kind='nonsense', current_user={'id': 'admin'})
        assert db.feedback.find.call_args.args[0] == {'status': 'new'}


@pytest.mark.asyncio
async def test_inbox_summary_is_admin_only_and_counts_waiting_items():
    db = MagicMock()
    db.feedback.count_documents = AsyncMock(side_effect=[2, 3, 1, 4])
    db.producer_profiles.count_documents = AsyncMock(return_value=5)
    with patch.object(server, 'ADMIN_USER_IDS', {'admin'}), patch.object(server, 'db', db):
        with pytest.raises(HTTPException) as err:
            await server.admin_inbox_summary(current_user={'id': 'someone'})
        assert err.value.status_code == 403
        res = await server.admin_inbox_summary(current_user={'id': 'admin'})
    assert res == {'bugs': {'new': 2, 'open': 3}, 'ideas': {'new': 1, 'open': 4}, 'verification': {'pending': 5}}


@pytest.mark.asyncio
async def test_admin_verification_list_by_status():
    cursor = MagicMock()
    cursor.sort.return_value.to_list = AsyncMock(return_value=[{'user_id': 'u1', 'verification_status': 'approved', 'verification_application': {'pro_id': None}}])
    db = MagicMock()
    db.producer_profiles.find = MagicMock(return_value=cursor)
    with patch.object(server, 'ADMIN_USER_IDS', {'admin'}), patch.object(server, 'db', db):
        with pytest.raises(HTTPException) as err:
            await server.admin_list_verification(status='all', current_user={'id': 'someone'})
        assert err.value.status_code == 403
        with pytest.raises(HTTPException) as err:
            await server.admin_list_verification(status='weird', current_user={'id': 'admin'})
        assert err.value.status_code == 400

        res = await server.admin_list_verification(status='approved', current_user={'id': 'admin'})
        assert res['applications'][0]['user_id'] == 'u1'
        query = db.producer_profiles.find.call_args.args[0]
        assert query == {'verification_status': 'approved', 'verification_application': {'$exists': True}}
        assert cursor.sort.call_args.args == ('verification_applied_at', -1)

        # The old pending route still returns the same shape for the phone app.
        res = await server.list_verification_applications(current_user={'id': 'admin'})
        assert db.producer_profiles.find.call_args.args[0] == {'verification_status': 'pending'}
        assert cursor.sort.call_args.args == ('verification_applied_at', 1)
        assert 'applications' in res
