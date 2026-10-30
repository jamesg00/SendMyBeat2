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


def req(peer, xff=None, real_ip=None):
    headers = {}
    if xff:
        headers['x-forwarded-for'] = xff
    if real_ip:
        headers['x-real-ip'] = real_ip
    return SimpleNamespace(client=SimpleNamespace(host=peer), headers=headers)


def test_forwarded_headers_from_the_internet_are_ignored():
    # A client talking to us directly can't pick its rate-limit identity.
    assert server._client_ip(req('8.8.8.8', xff='1.2.3.4')) == '8.8.8.8'
    assert server._client_ip(req('8.8.8.8', real_ip='1.2.3.4')) == '8.8.8.8'


def test_behind_our_proxy_the_rightmost_forwarded_address_is_used():
    # The client forged "1.2.3.4"; Caddy appended the real address.
    assert server._client_ip(req('172.18.0.2', xff='1.2.3.4, 203.0.113.9')) == '203.0.113.9'
    assert server._client_ip(req('127.0.0.1', xff='203.0.113.9')) == '203.0.113.9'
    assert server._client_ip(req('172.18.0.2')) == '172.18.0.2'


def test_admin_is_granted_by_id_only():
    with patch.object(server, 'ADMIN_USER_IDS', {'id-1'}), patch.object(server, 'ADMIN_USERNAMES', {'deadat18'}):
        assert server._is_admin_user({'id': 'id-1', 'username': 'someone'})
        assert not server._is_admin_user({'id': 'id-2', 'username': 'deadat18'})
        assert not server._is_admin_user({'id': '', 'username': 'deadat18'})


def credit_db(modified):
    db = MagicMock()
    db.users.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=modified))
    return db


@pytest.mark.asyncio
async def test_free_credit_is_taken_in_one_conditional_update():
    db = credit_db(1)
    status = {'plan': 'free'}
    with patch.object(server, 'db', db), patch.object(server, 'get_user_subscription_status', AsyncMock(return_value=status)):
        assert await server._reserve_ai_credit('u1') is True
    query, update = db.users.update_one.await_args.args
    assert query['id'] == 'u1'
    assert {'daily_usage_count': {'$lt': server.FREE_DAILY_AI_CREDITS}} in query['$or']
    assert update == {'$inc': {'daily_usage_count': 1}}


@pytest.mark.asyncio
async def test_no_credit_left_means_no_reservation_and_a_402():
    db = credit_db(0)  # the conditional update matched nothing: another request took the last one
    with patch.object(server, 'db', db), patch.object(server, 'get_user_subscription_status', AsyncMock(return_value={'plan': 'free'})):
        assert await server._reserve_ai_credit('u1') is False
        with pytest.raises(HTTPException) as err:
            await server.ensure_has_credit('u1', 'generations')
    assert err.value.status_code == 402


@pytest.mark.asyncio
async def test_paid_plans_respect_their_monthly_limit_and_guardrail():
    db = credit_db(1)
    with patch.object(server, 'db', db), patch.object(
        server, 'get_user_subscription_status', AsyncMock(return_value={'plan': 'plus', 'credits_total': 300})
    ):
        assert await server._reserve_ai_credit('u1') is True
    query = db.users.update_one.await_args.args[0]
    assert {'plus_monthly_ai_used': {'$lt': 300}} in query['$or']

    with patch.object(server, 'db', credit_db(1)), patch.object(
        server, 'get_user_subscription_status', AsyncMock(return_value={'plan': 'plus', 'credits_total': 300, 'cost_guardrail_hit': True})
    ):
        assert await server._reserve_ai_credit('u1') is False


@pytest.mark.asyncio
async def test_queueing_failure_refunds_the_credit():
    with patch.object(server, 'ensure_has_credit', AsyncMock()), \
         patch.object(server, '_create_background_job', AsyncMock(side_effect=RuntimeError('db down'))), \
         patch.object(server, 'refund_credit', AsyncMock()) as refund:
        with pytest.raises(RuntimeError):
            await server._queue_paid_job(current_user={'id': 'u1'}, job_type='tag_generation', payload={}, message='m', feature_name='generations')
    refund.assert_awaited_once_with('u1')


@pytest.mark.asyncio
async def test_queued_jobs_are_marked_as_holding_a_credit():
    create = AsyncMock(return_value={'id': 'job-1'})
    with patch.object(server, 'ensure_has_credit', AsyncMock()), patch.object(server, '_create_background_job', create):
        await server._queue_paid_job(current_user={'id': 'u1'}, job_type='tag_join', payload={'q': 1}, message='m', feature_name='generations')
    assert create.await_args.kwargs['payload'] == {'q': 1, 'credit_reserved': True}


@pytest.mark.asyncio
async def test_failed_jobs_give_their_credit_back():
    job = {'id': 'job-1', 'user_id': 'u1', 'payload': {'query': 'x', 'credit_reserved': True}}
    with patch.object(server, '_execute_tag_generation_job', AsyncMock(side_effect=RuntimeError('llm down'))), \
         patch.object(server, '_update_upload_job', AsyncMock()), \
         patch.object(server, 'refund_credit', AsyncMock()) as refund:
        await server._process_tag_generation_job(job)
    refund.assert_awaited_once_with('u1')


@pytest.mark.asyncio
async def test_jobs_queued_before_this_change_are_not_refunded():
    with patch.object(server, 'refund_credit', AsyncMock()) as refund:
        await server._refund_job_credit({'id': 'old', 'user_id': 'u1', 'payload': {}})
    refund.assert_not_awaited()


@pytest.mark.asyncio
async def test_password_hashing_runs_off_the_event_loop():
    calls = []

    async def fake_to_thread(fn, *args):
        calls.append(fn)
        return fn(*args)

    with patch.object(server.asyncio, 'to_thread', fake_to_thread):
        hashed = await server.asyncio.to_thread(server.bcrypt.hash, 'pw')
    assert calls == [server.bcrypt.hash] and server.bcrypt.verify('pw', hashed)


@pytest.mark.asyncio
async def test_racing_signup_for_a_taken_username_is_a_400():
    users = MagicMock()
    users.find_one = AsyncMock(return_value=None)
    users.insert_one = AsyncMock(side_effect=server.DuplicateKeyError('E11000 duplicate key'))
    db = MagicMock(users=users)
    request = SimpleNamespace(client=SimpleNamespace(host='203.0.113.9'), headers={})
    with patch.object(server, 'db', db), patch.object(server, '_check_rate_limit_persistent', AsyncMock()):
        with pytest.raises(HTTPException) as exc:
            await server.register(server.UserRegister(username='racer', password='longpassword'), request)
    assert exc.value.status_code == 400
