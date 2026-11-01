"""Security audit fixes: each test is an attack that used to work."""

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
from pydantic import ValidationError


# --- Public producer stats leaked Google emails and private upload file names ---------------

@pytest.mark.asyncio
async def test_public_producer_stats_hide_email_and_private_file_names():
    from services.spotlight_service import SpotlightService

    db = MagicMock()
    db.producer_profiles.find_one = AsyncMock(return_value={'user_id': 'u1', 'username': 'p', 'social_links': {}})
    db.users.find_one = AsyncMock(return_value={'username': 'p', 'created_at': '2026-01-01'})
    db.descriptions.count_documents = AsyncMock(return_value=0)
    db.tag_history.count_documents = AsyncMock(return_value=0)
    db.growth_streaks.find_one = AsyncMock(return_value=None)
    db.youtube_connections.find_one = AsyncMock(return_value={'name': 'P', 'connected_at': 'x'})
    uploads = MagicMock()
    uploads.to_list = AsyncMock(return_value=[{'file_type': 'audio'}])
    db.uploads.find = MagicMock(return_value=uploads)
    svc = SpotlightService.__new__(SpotlightService)
    svc.db = db
    svc.profile_with_role_tag = AsyncMock(return_value=SimpleNamespace(model_dump=lambda: {'user_id': 'u1'}))
    svc.fetch_channel_top_viewed_beats = lambda url, n: ([], {})
    payload = await svc.compute_producer_stats_payload('u1')
    assert 'email' not in payload['channel']
    assert payload['top_beats'] == []  # no "Beat 1: my_private_file.mp3"
    projection = db.youtube_connections.find_one.call_args.args[1]
    assert 'google_email' not in projection


@pytest.mark.asyncio
async def test_stale_cached_stats_with_an_email_are_recomputed():
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={'id': 'u1'})
    db.producer_stats_cache.find_one = AsyncMock(return_value={'payload': {'channel': {'email': 'leak@example.com'}}})
    fresh = {'channel': {'connected': True}}
    request = SimpleNamespace(client=SimpleNamespace(host='203.0.113.9'), headers={})
    with patch.object(server, 'db', db), patch.object(server, '_ensure_producer_youtube_channel_id', AsyncMock()), \
         patch.object(server, '_compute_producer_stats_payload', AsyncMock(return_value=fresh)):
        out = await server.get_producer_stats('u1', request)
    assert out == fresh


# --- Rate limiter read the count, then wrote count + 1, so parallel requests all got through ----

@pytest.mark.asyncio
async def test_persistent_rate_limit_counts_atomically():
    db = MagicMock()
    db.security_rate_limits.update_one = AsyncMock()
    db.security_rate_limits.find_one_and_update = AsyncMock(return_value={'count': 11})
    with patch.object(server, 'db', db), patch.object(server, '_is_production_like', return_value=True), \
         patch.object(server, '_check_rate_limit'), pytest.raises(HTTPException) as err:
        await server._check_rate_limit_persistent('auth:login:1.2.3.4', 10, 300)
    assert err.value.status_code == 429
    update = db.security_rate_limits.find_one_and_update.call_args.args[1]
    assert update['$inc'] == {'count': 1}  # one atomic increment, no separate read


@pytest.mark.asyncio
async def test_login_is_also_limited_per_username():
    calls = []

    async def record(key, limit, window):
        calls.append(key)

    db = MagicMock()
    db.users.find_one = AsyncMock(return_value=None)
    request = SimpleNamespace(client=SimpleNamespace(host='203.0.113.9'), headers={})
    with patch.object(server, 'db', db), patch.object(server, '_check_rate_limit_persistent', record), pytest.raises(HTTPException):
        await server.login(server.UserLogin(username='victim', password='guess'), request)
    assert 'auth:login-user:victim' in calls


# --- YouTube connect trusted any OAuth code, so an attacker could link their channel to you ---

@pytest.mark.asyncio
async def test_youtube_connect_needs_the_state_issued_to_this_user():
    db = MagicMock()
    db.users.find_one_and_update = AsyncMock(return_value=None)  # no matching unexpired state
    with patch.object(server, 'db', db), patch.object(server, '_check_rate_limit_persistent', AsyncMock()), \
         patch.object(server.requests, 'post') as post, pytest.raises(HTTPException) as err:
        await server.connect_youtube(code='attacker-code', state='forged', current_user={'id': 'victim'}, request=None)
    assert err.value.status_code == 400
    post.assert_not_called()  # never exchanged the attacker's code


@pytest.mark.asyncio
async def test_youtube_state_is_random_hashed_and_single_use():
    db = MagicMock()
    db.users.update_one = AsyncMock()
    db.users.find_one_and_update = AsyncMock(return_value={'id': 'u1'})
    with patch.object(server, 'db', db):
        state = await server._new_youtube_oauth_state('u1')
        stored = db.users.update_one.call_args.args[1]['$set']
        assert state != 'u1' and len(state) >= 32 and state not in str(stored)  # only the hash is kept
        assert await server._use_youtube_oauth_state('u1', state) is True
        query, update = db.users.find_one_and_update.call_args.args
        assert query['id'] == 'u1' and '$unset' in update  # cleared after use
        assert await server._use_youtube_oauth_state('u1', '') is False


# --- Stripe pages could send people anywhere after paying (phishing via checkout.stripe.com) ---

def test_stripe_return_urls_stay_on_our_sites():
    with patch.object(server, '_is_production_like', return_value=True):
        assert server._safe_return_url(f'{server.BACKEND_URL}/api/billing/return?to=x', 'F') == f'{server.BACKEND_URL}/api/billing/return?to=x'
        assert server._safe_return_url('https://evil.example/phish', 'F') == 'F'
        assert server._safe_return_url('javascript:alert(1)', 'F') == 'F'
        assert server._safe_return_url('http://localhost:3000/dashboard', 'F') == 'F'
    with patch.object(server, '_is_production_like', return_value=False):
        assert server._safe_return_url('http://localhost:3000/dashboard', 'F') == 'http://localhost:3000/dashboard'


@pytest.mark.asyncio
async def test_a_new_checkout_closes_the_previous_one():
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={'id': 'u1', 'pending_checkout_session_id': 'cs_old'})
    db.users.update_one = AsyncMock()
    db.users.count_documents = AsyncMock(return_value=0)
    db.app_settings.find_one = AsyncMock(return_value={'value': 'price_saved'})
    expire = MagicMock()
    create = MagicMock(return_value=SimpleNamespace(url='https://checkout.stripe.com/x', id='cs_new'))
    req = server.CheckoutSessionRequest(success_url='https://evil.example', cancel_url='https://evil.example', plan='plus')
    with patch.object(server, 'db', db), patch.object(server.stripe.checkout.Session, 'expire', expire), \
         patch.object(server.stripe.checkout.Session, 'create', create):
        await server.create_checkout_session(req, current_user={'id': 'u1'})
    expire.assert_called_once_with('cs_old')
    assert 'evil' not in create.call_args.kwargs['success_url']
    assert db.users.update_one.call_args.args[1] == {'$set': {'pending_checkout_session_id': 'cs_new'}}


# --- One free trial per card, not per account --------------------------------------------------

@pytest.mark.asyncio
async def test_a_card_that_already_had_a_trial_is_billed_now():
    db = MagicMock()
    db.trial_cards.find_one_and_update = AsyncMock(return_value={'user_id': 'someone-else'})
    sub = {'default_payment_method': {'card': {'fingerprint': 'fp_1'}}}
    modify = MagicMock()
    with patch.object(server, 'db', db), patch.object(server.stripe.Subscription, 'retrieve', MagicMock(return_value=sub)), \
         patch.object(server.stripe.Subscription, 'modify', modify):
        assert await server._card_already_trialed('sub_2', 'new-account') is True
    modify.assert_called_once_with('sub_2', trial_end='now')


@pytest.mark.asyncio
async def test_a_first_trial_on_a_card_is_kept():
    db = MagicMock()
    db.trial_cards.find_one_and_update = AsyncMock(return_value=None)  # first time this card is seen
    sub = {'default_payment_method': {'card': {'fingerprint': 'fp_new'}}}
    modify = MagicMock()
    with patch.object(server, 'db', db), patch.object(server.stripe.Subscription, 'retrieve', MagicMock(return_value=sub)), \
         patch.object(server.stripe.Subscription, 'modify', modify):
        assert await server._card_already_trialed('sub_1', 'u1') is False
    modify.assert_not_called()


def test_events_for_an_old_subscription_dont_touch_the_current_plan():
    user = {'stripe_subscription_id': 'sub_current'}
    assert server._is_current_subscription(user, {'id': 'sub_current'}) is True
    assert server._is_current_subscription(user, {'id': 'sub_old'}) is False
    assert server._is_current_subscription({}, {'id': 'sub_any'}) is True


# --- Unbounded input meant unbounded AI and YouTube cost ---------------------------------------

def test_inputs_that_drive_ai_and_youtube_cost_are_capped():
    with pytest.raises(ValidationError):
        server.TagGenerationRequest(query='x' * 5000)
    with pytest.raises(ValidationError):
        server.TagGenerationRequest(query='drake', custom_tags=['t'] * 1000)
    with pytest.raises(ValidationError):
        server.TagJoinRequest(queries=['a', 'b'], candidate_tags=['t'], max_tags=100000)
    with pytest.raises(ValidationError):
        server.DescriptionCreate(title='t', content='x' * 50000)
    with pytest.raises(ValidationError):
        server.ThemeGenerateRequest(prompt='x' * 5000)
    server.TagGenerationRequest(query='drake type beat', custom_tags=['dark trap'])


def test_uploads_are_rate_limited():
    server._action_rate_limit_buckets.pop('file_upload:spammer', None)
    for _ in range(30):
        server._enforce_upload_rate_limit('spammer')
    with pytest.raises(HTTPException) as err:
        server._enforce_upload_rate_limit('spammer')
    assert err.value.status_code == 429
