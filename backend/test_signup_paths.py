"""Google sign-in and the one-try free tag generator."""

import os
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://mock-mongo:27017/testdb')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '60')
os.environ.setdefault('STRIPE_SECRET_KEY', 'sk_test_mock')
os.environ.setdefault('STRIPE_PRICE_ID', 'price_mock')

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

with patch('motor.motor_asyncio.AsyncIOMotorClient'):
    import server

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError


def fake_request(ip='203.0.113.7'):
    return SimpleNamespace(client=SimpleNamespace(host=ip), headers={})


def test_google_usernames_fit_the_signup_format():
    assert server._username_base_from_google({'name': 'DJ Smooth B!'}) == 'djsmoothb'
    assert server._username_base_from_google({'name': '', 'email': 'ab@x.com'}) == 'producerab'
    base = server._username_base_from_google({'name': 'Ñandú Beats ' * 5})
    assert 3 <= len(base) <= 32 and all(c in 'abcdefghijklmnopqrstuvwxyz0123456789_.-' for c in base)


@pytest.mark.asyncio
async def test_signin_state_must_have_the_prefix_and_be_issued_here():
    db = MagicMock()
    db.oauth_states.find_one_and_delete = AsyncMock(return_value=None)
    with patch.object(server, 'db', db):
        assert await server._use_google_signin_state('not-a-signin-state') is False
        assert await server._use_google_signin_state('signin.unknown') is False
    db.oauth_states.find_one_and_delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_a_returning_google_user_signs_into_the_same_account():
    existing = {'id': 'u1', 'username': 'beats', 'google_sub': 'g-1'}
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=existing)
    db.users.insert_one = AsyncMock()
    with patch.object(server, 'db', db):
        user = await server._find_or_create_google_user({'id': 'g-1', 'email': 'a@b.com'})
    assert user['id'] == 'u1'
    db.users.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_a_new_google_user_gets_an_account():
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=None)
    db.users.insert_one = AsyncMock()
    db.youtube_connections.find = MagicMock(return_value=SimpleNamespace(to_list=AsyncMock(return_value=[])))
    with patch.object(server, 'db', db):
        user = await server._find_or_create_google_user({'id': 'g-2', 'email': 'New@B.com', 'name': 'New Prod'})
    assert user['auth_provider'] == 'google' and user['google_sub'] == 'g-2' and user['email'] == 'new@b.com'
    assert user['username'] == 'newprod'
    db.users.insert_one.assert_awaited_once()


def free_db(existing=None, today_count=0):
    db = MagicMock()
    db.free_tag_uses.find_one = AsyncMock(return_value=existing)
    db.free_tag_uses.count_documents = AsyncMock(return_value=today_count)
    db.free_tag_uses.insert_one = AsyncMock()
    db.free_tag_uses.delete_many = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_free_tags_run_once_then_ask_for_signup():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    result = SimpleNamespace(query='drake type beat', tags=['drake type beat'], scored_tags=[])
    db = free_db()
    with patch.object(server, 'db', db), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock(return_value=result)) as gen:
        out = await server.free_tag_generate(body, fake_request())
    assert out['tags'] == ['drake type beat']
    assert db.free_tag_uses.insert_one.await_count == 2  # the address and the browser id
    assert gen.await_args.kwargs['current_user']['_guest'] is True

    with patch.object(server, 'db', free_db(existing={'key': 'ip:x'})), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()):
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(body, fake_request())
    assert err.value.status_code == 402 and err.value.detail['code'] == 'free_tags_used'


@pytest.mark.asyncio
async def test_a_failed_free_run_does_not_count():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    db = free_db()
    with patch.object(server, 'db', db), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock(side_effect=HTTPException(status_code=500, detail='x'))):
        with pytest.raises(HTTPException):
            await server.free_tag_generate(body, fake_request())
    db.free_tag_uses.delete_many.assert_awaited_once()


@pytest.mark.asyncio
async def test_two_tabs_cannot_both_get_the_free_run():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    db = free_db()
    db.free_tag_uses.insert_one = AsyncMock(side_effect=[None, DuplicateKeyError('dup')])
    with patch.object(server, 'db', db), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock()) as gen:
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(body, fake_request())
    assert err.value.status_code == 402
    gen.assert_not_awaited()
    db.free_tag_uses.delete_many.assert_awaited_once()


@pytest.mark.asyncio
async def test_the_free_page_stops_at_the_daily_cap():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    with patch.object(server, 'db', free_db(today_count=server.FREE_TAG_DAILY_CAP)), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()):
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(body, fake_request())
    assert err.value.status_code == 429
