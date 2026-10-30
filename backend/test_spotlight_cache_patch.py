import os
import sys
from datetime import datetime, timedelta, timezone
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

from models_spotlight import ProducerProfileUpdate


def entry(user_id, **extra):
    return {'user_id': user_id, 'username': user_id, 'avatar_url': 'https://old/a.png', 'bio': 'old', **extra}


def cache_db(payload, profile):
    db = MagicMock()
    db.spotlight_cache.find_one = AsyncMock(return_value={'payload': payload} if payload is not None else None)
    db.spotlight_cache.update_one = AsyncMock()
    db.spotlight_cache.delete_many = AsyncMock()
    db.producer_profiles.find_one = AsyncMock(return_value=profile)
    return db


@pytest.mark.asyncio
async def test_edit_rewrites_the_producer_in_every_list_it_appears_in():
    payload = {
        'featured_producers': [entry('u1')],
        'trending_producers': [entry('u2'), entry('u1')],
        'new_producers': [entry('u2')],
        'all_producers': [entry('u1'), entry('u2')],
    }
    edited = datetime(2026, 10, 30, tzinfo=timezone.utc)
    profile = {
        'user_id': 'u1',
        'username': 'nova',
        'avatar_url': 'data:image/webp;base64,new',
        'banner_url': 'data:image/webp;base64,banner',
        'bio': 'new bio',
        'tags': ['trap'],
        'top_beat': {'kind': 'youtube', 'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},
        'updated_at': edited,
    }
    db = cache_db(payload, profile)
    with patch.object(server, 'db', db):
        await server._patch_spotlight_cache_profile('u1')

    db.producer_profiles.find_one.assert_awaited_once_with({'user_id': 'u1'}, server.SPOTLIGHT_PROFILE_PROJECTION)
    query, update = db.spotlight_cache.update_one.await_args.args
    assert query == {'key': 'global'}
    assert db.spotlight_cache.update_one.await_args.kwargs['array_filters'] == [{'p.user_id': 'u1'}]
    sets = update['$set']
    for section in ('featured_producers', 'trending_producers', 'all_producers'):
        assert sets[f'payload.{section}.$[p].bio'] == 'new bio'
        assert sets[f'payload.{section}.$[p].banner_url'] == 'data:image/webp;base64,banner'
        assert sets[f'payload.{section}.$[p].top_beat'] == profile['top_beat']
        assert sets[f'payload.{section}.$[p].updated_at'] == edited.isoformat()
    # u1 isn't in new_producers, and the array filter keeps other producers untouched.
    assert not any(key.startswith('payload.new_producers') for key in sets)
    assert not any(key.endswith('.user_id') for key in sets)
    db.spotlight_cache.delete_many.assert_not_awaited()


@pytest.mark.asyncio
async def test_patch_normalises_avatar_and_keeps_cached_name_when_profile_has_none():
    db = cache_db({'all_producers': [entry('u1')]}, {'user_id': 'u1', 'username': '', 'avatar_url': 'https://api.dicebear.com/x.svg'})
    with patch.object(server, 'db', db):
        await server._patch_spotlight_cache_profile('u1')

    sets = db.spotlight_cache.update_one.await_args.args[1]['$set']
    assert sets['payload.all_producers.$[p].avatar_url'] == server.DEFAULT_SPOTLIGHT_AVATAR_URL
    assert sets['payload.all_producers.$[p].verification_status'] == 'none'
    assert 'payload.all_producers.$[p].username' not in sets


@pytest.mark.asyncio
@pytest.mark.parametrize('payload', [None, {'all_producers': [entry('someone-else')]}])
async def test_producers_not_in_spotlight_leave_the_cache_alone(payload):
    db = cache_db(payload, {'user_id': 'u1', 'bio': 'x'})
    with patch.object(server, 'db', db):
        await server._patch_spotlight_cache_profile('u1')
    db.spotlight_cache.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_cache_errors_never_fail_the_edit():
    db = cache_db({'all_producers': [entry('u1')]}, {'user_id': 'u1', 'bio': 'x'})
    db.spotlight_cache.update_one = AsyncMock(side_effect=RuntimeError('mongo down'))
    with patch.object(server, 'db', db):
        await server._patch_spotlight_cache_profile('u1')


@pytest.mark.asyncio
async def test_saving_the_profile_patches_spotlight():
    db = MagicMock()
    db.producer_profiles.update_one = AsyncMock()
    db.producer_profiles.find_one = AsyncMock(return_value={'user_id': 'u1', 'bio': 'hi'})
    db.producer_stats_cache.delete_many = AsyncMock()
    with patch.object(server, 'db', db), \
            patch.object(server, '_patch_spotlight_cache_profile', AsyncMock()) as patch_cache, \
            patch.object(server, '_profile_with_role_tag', AsyncMock(return_value='profile')):
        await server.update_my_producer_profile(ProducerProfileUpdate(bio='hi'), current_user={'id': 'u1'})
    patch_cache.assert_awaited_once_with('u1')
    db.producer_stats_cache.delete_many.assert_awaited_once_with({'user_id': 'u1'})


@pytest.mark.asyncio
async def test_changing_the_top_beat_patches_spotlight():
    db = MagicMock()
    db.producer_profiles.find_one_and_update = AsyncMock(return_value=None)
    db.producer_stats_cache.delete_many = AsyncMock()
    with patch.object(server, 'db', db), patch.object(server, '_patch_spotlight_cache_profile', AsyncMock()) as patch_cache:
        await server._swap_top_beat('u1', None)
    patch_cache.assert_awaited_once_with('u1')


@pytest.mark.asyncio
async def test_spotlight_response_is_not_cached_by_clients():
    db = MagicMock()
    db.spotlight_cache.find_one = AsyncMock(return_value={'payload': EMPTY_PAYLOAD, 'payload_built_at': datetime.now(timezone.utc)})
    response = server.Response()
    with patch.object(server, 'db', db):
        await server.get_producer_spotlight(response)
    assert response.headers['cache-control'] == 'no-store'


EMPTY_PAYLOAD = {'featured_producers': [], 'trending_producers': [], 'new_producers': [], 'all_producers': []}


@pytest.mark.asyncio
async def test_a_fresh_list_is_served_from_the_cache():
    db = MagicMock()
    db.spotlight_cache.find_one = AsyncMock(return_value={'payload': EMPTY_PAYLOAD, 'updated_at': datetime.now(timezone.utc).isoformat()})
    db.spotlight_cache.update_one = AsyncMock()
    with patch.object(server, 'db', db), patch.object(server, '_compute_spotlight_payload', AsyncMock()) as compute:
        await server.get_producer_spotlight(server.Response())
    compute.assert_not_awaited()
    db.spotlight_cache.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_an_older_list_is_rebuilt_from_the_database_without_youtube_calls():
    stale = datetime.now(timezone.utc) - timedelta(minutes=5)
    db = MagicMock()
    db.spotlight_cache.find_one = AsyncMock(return_value={'payload': EMPTY_PAYLOAD, 'payload_built_at': stale})
    db.spotlight_cache.update_one = AsyncMock()
    with patch.object(server, 'db', db), \
            patch.object(server, '_compute_spotlight_payload', AsyncMock(return_value=EMPTY_PAYLOAD)) as compute, \
            patch.object(server, '_refresh_spotlight_metrics_for_profiles', AsyncMock()) as metrics:
        await server.get_producer_spotlight(server.Response())
    compute.assert_awaited_once()
    metrics.assert_not_awaited()
    saved = db.spotlight_cache.update_one.await_args.args[1]['$set']
    assert 'payload_built_at' in saved and 'refreshed_at' not in saved
