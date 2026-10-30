import os
import sys
import uuid
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

from services.spotlight_service import spotlight_trending_score


def make_db(*, producer_exists=True, upserted=True, deleted=1, counter=5):
    """A fake db with the collections _set_producer_relation touches."""
    relation = MagicMock()
    relation.update_one = AsyncMock(return_value=SimpleNamespace(upserted_id='new-id' if upserted else None))
    relation.delete_one = AsyncMock(return_value=SimpleNamespace(deleted_count=deleted))

    profiles = MagicMock()
    profiles.find_one = AsyncMock(side_effect=[
        {'user_id': 'producer'} if producer_exists else None,
        {'app_likes': counter, 'followers': counter},
    ])
    profiles.update_one = AsyncMock()

    users = MagicMock()
    users.find_one = AsyncMock(return_value={'id': 'producer'})

    stats_cache = MagicMock()
    stats_cache.delete_many = AsyncMock()

    db = MagicMock()
    db.producer_profiles = profiles
    db.users = users
    db.producer_stats_cache = stats_cache
    db.__getitem__.return_value = relation
    return db, relation, profiles


def actor():
    # A fresh user per test keeps the in-memory rate limiter out of the way.
    return f'user-{uuid.uuid4()}'


@pytest.mark.asyncio
async def test_like_creates_pair_and_increments_counter():
    db, relation, profiles = make_db(upserted=True, counter=6)
    with patch.object(server, 'db', db):
        result = await server._set_producer_relation(kind='like', actor_id=actor(), producer_id='producer', on=True)

    assert result == {'liked': True, 'app_likes': 6}
    relation.update_one.assert_awaited_once()
    profiles.update_one.assert_awaited_once_with({'user_id': 'producer'}, {'$inc': {'app_likes': 1}})


@pytest.mark.asyncio
async def test_liking_twice_does_not_increment_again():
    db, _, profiles = make_db(upserted=False)
    with patch.object(server, 'db', db):
        await server._set_producer_relation(kind='like', actor_id=actor(), producer_id='producer', on=True)

    profiles.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_parallel_double_tap_is_not_a_server_error():
    # The unique index rejects the second upsert of a racing pair; that's an existing like, not a 500.
    db, relation, profiles = make_db(counter=6)
    relation.update_one = AsyncMock(side_effect=server.DuplicateKeyError('E11000 duplicate key'))
    with patch.object(server, 'db', db):
        result = await server._set_producer_relation(kind='like', actor_id=actor(), producer_id='producer', on=True)

    assert result == {'liked': True, 'app_likes': 6}
    profiles.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_unfollow_decrements_only_when_a_pair_was_removed():
    db, relation, profiles = make_db(deleted=1, counter=2)
    with patch.object(server, 'db', db):
        result = await server._set_producer_relation(kind='follow', actor_id=actor(), producer_id='producer', on=False)

    assert result == {'following': False, 'followers': 2}
    relation.delete_one.assert_awaited_once()
    profiles.update_one.assert_awaited_once_with(
        {'user_id': 'producer', 'followers': {'$gt': 0}}, {'$inc': {'followers': -1}}
    )

    db, _, profiles = make_db(deleted=0)
    with patch.object(server, 'db', db):
        await server._set_producer_relation(kind='follow', actor_id=actor(), producer_id='producer', on=False)
    profiles.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_cannot_like_yourself():
    db, _, _ = make_db()
    me = actor()
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server._set_producer_relation(kind='like', actor_id=me, producer_id=me, on=True)
    assert err.value.status_code == 400


@pytest.mark.asyncio
async def test_unknown_producer_is_404():
    db, relation, _ = make_db(producer_exists=False)
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server._set_producer_relation(kind='follow', actor_id=actor(), producer_id='producer', on=True)
    assert err.value.status_code == 404
    relation.update_one.assert_not_awaited()


def test_hearts_and_follows_raise_spotlight_rank():
    base = {'likes': 10, 'views': 100}
    growth = {'current_streak': 2, 'total_days_completed': 5}
    plain = spotlight_trending_score(base, growth)
    assert spotlight_trending_score({**base, 'app_likes': 3}, growth) == plain + 12
    assert spotlight_trending_score({**base, 'followers': 2}, growth) == plain + 12
