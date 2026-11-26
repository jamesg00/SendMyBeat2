"""Google sign-in and the free tag generator's daily runs."""

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


class FakeFreeUses:
    """Enough of free_tag_uses for the daily run counters (conditional updates on `count`)."""

    def __init__(self):
        self.docs = {}

    def find(self, query, projection=None):
        docs = [dict(self.docs[k]) for k in query['key']['$in'] if k in self.docs]
        return SimpleNamespace(to_list=AsyncMock(return_value=docs))

    async def update_one(self, query, update, upsert=False):
        doc = self.docs.get(query['key'])
        if doc is None:
            if upsert and '$setOnInsert' in update:
                self.docs[query['key']] = dict(update['$setOnInsert'])
            return SimpleNamespace(modified_count=0)
        if '$inc' not in update:
            return SimpleNamespace(modified_count=0)
        cond = query.get('count') or {}
        if '$lte' in cond and doc['count'] > cond['$lte']:
            return SimpleNamespace(modified_count=0)
        if '$gte' in cond and doc['count'] < cond['$gte']:
            return SimpleNamespace(modified_count=0)
        doc['count'] += update['$inc']['count']
        return SimpleNamespace(modified_count=1)


def free_db():
    uses = FakeFreeUses()
    return {'free_tag_uses': uses}, uses


@pytest.mark.asyncio
async def test_free_tags_run_three_times_a_day_then_ask_to_come_back_or_sign_up():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    result = SimpleNamespace(query='drake type beat', tags=['drake type beat'], scored_tags=[])
    db, uses = free_db()
    with patch.object(server, 'db', db), \
         patch.object(server, 'FREE_TAG_RUNS_PER_DAY', 3), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock(return_value=result)) as gen:
        outs = [await server.free_tag_generate(body, fake_request()) for _ in range(3)]
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(body, fake_request())
    assert [o['runs_left'] for o in outs] == [2, 1, 0]
    assert gen.await_count == 3
    assert gen.await_args.kwargs['current_user']['_guest'] is True
    # Counted under both the address and the browser id, so clearing storage isn't enough.
    assert sorted(k.split(':')[0] for k in uses.docs) == ['ip', 'site', 'visitor']
    assert err.value.status_code == 402 and err.value.detail['code'] == 'free_tags_used'
    assert 'tomorrow' in err.value.detail['message']


@pytest.mark.asyncio
async def test_a_failed_free_run_does_not_count():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    db, uses = free_db()
    with patch.object(server, 'db', db), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock(side_effect=HTTPException(status_code=500, detail='x'))):
        with pytest.raises(HTTPException):
            await server.free_tag_generate(body, fake_request())
    assert all(doc['count'] == 0 for doc in uses.docs.values())


@pytest.mark.asyncio
async def test_a_new_browser_id_on_the_same_address_shares_the_daily_runs():
    db, uses = free_db()
    result = SimpleNamespace(query='drake type beat', tags=[], scored_tags=[])
    with patch.object(server, 'db', db), \
         patch.object(server, 'FREE_TAG_RUNS_PER_DAY', 3), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server, 'generate_tags', AsyncMock(return_value=result)) as gen:
        for i in range(3):
            body = server.FreeTagRequest(query='drake type beat', visitor_id=f'visitor_12345{i}')
            await server.free_tag_generate(body, fake_request())
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(server.FreeTagRequest(query='drake type beat', visitor_id='fresh_visitor'), fake_request())
    assert err.value.status_code == 402
    assert gen.await_count == 3


@pytest.mark.asyncio
async def test_the_free_page_stops_at_the_daily_cap():
    body = server.FreeTagRequest(query='drake type beat', visitor_id='visitor_123456')
    db, uses = free_db()
    day = server.free_tag_runs_service.quota_day()
    uses.docs[f'site:{day}'] = {'key': f'site:{day}', 'count': server.FREE_TAG_DAILY_CAP}
    with patch.object(server, 'db', db), \
         patch.object(server, '_check_rate_limit_persistent', AsyncMock()):
        with pytest.raises(HTTPException) as err:
            await server.free_tag_generate(body, fake_request())
    assert err.value.status_code == 429


def test_free_tag_runs_use_grok_by_default():
    assert server.FREE_TAG_LLM_PROVIDER == 'grok'
