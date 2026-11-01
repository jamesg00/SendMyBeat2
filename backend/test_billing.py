"""Plans and the paywall: free accounts browse, the 3-day trial, Plus $5 / Pro $10, founding
members, tips, and Pro-only features."""

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


def users_db(user_doc):
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=user_doc)
    db.users.update_one = AsyncMock(return_value=SimpleNamespace(modified_count=1))
    db.users.count_documents = AsyncMock(return_value=0)
    return db


async def status_for(user_doc):
    with patch.object(server, 'db', users_db(user_doc)), \
         patch.object(server, '_get_user_monthly_llm_cost', AsyncMock(return_value=0.0)):
        return await server.get_user_subscription_status(user_doc['id'] if user_doc else 'x')


def paid(plan, *, version=2, status='active', **extra):
    return {
        'id': 'u1', 'subscription_plan': plan, 'subscription_status': status, 'stripe_subscription_id': 'sub_1',
        'plan_version': version, 'plus_usage_month': server._current_month_key(), **extra,
    }


@pytest.mark.asyncio
async def test_free_accounts_get_no_credits_and_are_offered_the_trial():
    status = await status_for({'id': 'u1', 'daily_usage_date': '2999-01-01'})
    assert status['plan'] == 'free' and status['credits_remaining'] == 0 and status['upload_credits_remaining'] == 0
    assert status['trial_available'] is True and status['pro_access'] is False
    detail = server._paywall_detail(status, 'generations')
    assert detail['code'] == 'needs_plan' and 'free trial' in detail['message']


@pytest.mark.asyncio
async def test_the_trial_gives_three_a_day_on_plus():
    status = await status_for(paid('plus', status='trialing', trial_ends_at='2026-11-02T00:00:00+00:00', daily_usage_date='2999-01-01'))
    assert status['trial'] is True and status['counter'] == 'daily'
    assert status['credits_total'] == 3 and status['upload_credits_total'] == 3
    assert status['pro_access'] is False and status['trial_ends_at']
    assert server._usage_fields(status) == ('daily_usage_count', 'daily_upload_count')


@pytest.mark.asyncio
async def test_plus_is_50_and_pro_is_100_a_month_and_only_pro_unlocks_pro_features():
    plus = await status_for(paid('plus'))
    assert (plus['credits_total'], plus['upload_credits_total'], plus['pro_access']) == (50, 50, False)
    pro = await status_for(paid('max'))
    assert (pro['credits_total'], pro['upload_credits_total'], pro['pro_access']) == (100, 100, True)
    assert server._paywall_detail({**plus, 'credits_remaining': 0}, 'generations')['code'] == 'needs_pro'


@pytest.mark.asyncio
async def test_people_on_the_old_plans_keep_their_limits_and_features():
    legacy = await status_for(paid('plus', version=1))
    assert legacy['credits_total'] == server.PLUS_MONTHLY_AI_CREDITS
    assert legacy['pro_access'] is True


def checkout_mocks(user_doc):
    db = users_db(user_doc)
    db.app_settings.find_one = AsyncMock(return_value={'value': 'price_saved'})
    create = MagicMock(return_value=SimpleNamespace(url='https://checkout.stripe.com/x'))
    return db, create


def request(**kw):
    return server.CheckoutSessionRequest(success_url='https://a', cancel_url='https://b', **kw)


@pytest.mark.asyncio
async def test_the_trial_is_offered_once():
    for user_doc, expect_trial in (({'id': 'u1'}, True), ({'id': 'u1', 'trial_used': True}, False)):
        db, create = checkout_mocks(user_doc)
        with patch.object(server, 'db', db), patch.object(server.stripe.checkout.Session, 'create', create):
            res = await server.create_checkout_session(request(plan='plus', trial=True), current_user={'id': 'u1', 'email': 'a@b.c'})
        assert res['checkout_url']
        sub_data = create.call_args.kwargs['subscription_data']
        assert ('trial_period_days' in sub_data) is expect_trial
        assert sub_data['metadata']['plan_version'] == str(server.PLAN_VERSION)
        assert create.call_args.kwargs['line_items'][0]['price'] == 'price_saved'


@pytest.mark.asyncio
async def test_founding_spots_run_out():
    db, create = checkout_mocks({'id': 'u1'})
    db.users.count_documents = AsyncMock(return_value=server.FOUNDING_MEMBER_LIMIT)
    with patch.object(server, 'db', db), patch.object(server.stripe.checkout.Session, 'create', create), \
         pytest.raises(HTTPException) as err:
        await server.create_checkout_session(request(plan='founding'), current_user={'id': 'u1'})
    assert err.value.status_code == 409
    create.assert_not_called()


@pytest.mark.asyncio
async def test_a_subscriber_switches_plans_instead_of_buying_a_second_one():
    db, create = checkout_mocks(paid('plus', status='trialing'))
    sub = {'status': 'trialing', 'items': {'data': [{'id': 'si_1'}]}}
    modify = MagicMock(return_value={'status': 'active', 'metadata': {'plan': 'max', 'plan_version': '2'}})
    with patch.object(server, 'db', db), patch.object(server.stripe.Subscription, 'retrieve', MagicMock(return_value=sub)), \
         patch.object(server.stripe.Subscription, 'modify', modify), patch.object(server.stripe.checkout.Session, 'create', create):
        res = await server.create_checkout_session(request(plan='max'), current_user={'id': 'u1'})
    assert res == {'switched': True}
    create.assert_not_called()
    kwargs = modify.call_args.kwargs
    assert kwargs['items'] == [{'id': 'si_1', 'price': 'price_saved'}] and kwargs['trial_end'] == 'now'


class FakeRequest:
    headers = {'stripe-signature': 'sig'}

    async def body(self):
        return b'{}'


@pytest.mark.asyncio
async def test_a_tip_is_recorded_and_never_changes_a_plan():
    event = {'type': 'checkout.session.completed', 'data': {'object': {
        'mode': 'payment', 'id': 'cs_1', 'amount_total': 500, 'client_reference_id': 'u1', 'metadata': {'kind': 'tip'}}}}
    db = users_db({'id': 'u1'})
    db.tips.insert_one = AsyncMock()
    with patch.object(server, 'db', db), patch.object(server.stripe.Webhook, 'construct_event', MagicMock(return_value=event)), \
         patch.object(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test'):
        await server.stripe_webhook(FakeRequest())
    db.tips.insert_one.assert_awaited_once()
    db.users.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_a_founding_checkout_makes_a_pro_founding_member():
    event = {'type': 'checkout.session.completed', 'data': {'object': {
        'mode': 'subscription', 'customer': 'cus_1', 'subscription': 'sub_1', 'client_reference_id': 'u1',
        'metadata': {'plan': 'founding', 'plan_version': '2', 'trial': '0'}}}}
    db = users_db({'id': 'u1'})
    with patch.object(server, 'db', db), patch.object(server.stripe.Webhook, 'construct_event', MagicMock(return_value=event)), \
         patch.object(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test'):
        await server.stripe_webhook(FakeRequest())
    fields = db.users.update_one.await_args.args[1]['$set']
    assert fields['subscription_plan'] == 'max' and fields['founding_member'] is True and fields['plan_version'] == 2


@pytest.mark.asyncio
async def test_checkout_returns_only_into_the_app():
    ok = await server.billing_return(to='sendmybeat://billing', status='success')
    assert ok.headers['location'] == 'sendmybeat://billing?status=success'
    bad = await server.billing_return(to='https://evil.example', status='success')
    assert 'evil' not in bad.headers['location']


@pytest.mark.asyncio
async def test_pro_breakdowns_and_copying_style_are_pro_only():
    with patch.object(server, 'get_user_subscription_status', AsyncMock(return_value={'pro_access': False})), \
         patch.object(server, '_pro_channels', AsyncMock(return_value={})), \
         patch.object(server, 'db', MagicMock(**{'__getitem__.return_value.find_one': AsyncMock(return_value=None)})):
        detail = await server.get_pro('taz-taylor', current_user={'id': 'u1'})
        assert detail['locked'] is True and detail['patterns'] is None and detail['story']
        with pytest.raises(HTTPException) as err:
            await server.create_style_plan('taz-taylor', server.StylePlanRequest(moves=[]), current_user={'id': 'u1'})
    assert err.value.status_code == 402 and err.value.detail['code'] == 'needs_pro'


@pytest.mark.asyncio
async def test_only_pro_gets_the_job_queue():
    db = MagicMock()
    db.upload_jobs.count_documents = AsyncMock(return_value=1)
    with patch.object(server, 'db', db), \
         patch.object(server, '_get_ops_controls', AsyncMock(return_value={})), \
         patch.object(server, '_get_background_job_stats', AsyncMock(return_value={})), \
         patch.object(server, 'get_user_subscription_status', AsyncMock(return_value={'pro_access': False})), \
         pytest.raises(HTTPException) as err:
        await server._guard_heavy_feature(current_user={'id': 'u1'}, feature_key='tags', job_type='tags')
    assert err.value.status_code == 429 and err.value.detail['code'] == 'needs_pro'
