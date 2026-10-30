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

CONTEXT = {'artist_name': 'future', 'top_video_titles': ['Future - Mask Off'], 'type_beat_search_results': []}


def cache_db(doc):
    db = MagicMock()
    db.artist_context_cache.find_one = AsyncMock(return_value=doc)
    db.artist_context_cache.update_one = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_a_cached_artist_costs_no_quota():
    db = cache_db({'context': CONTEXT, 'fetched_at': datetime.now(timezone.utc)})
    budget = [300]
    with patch.object(server, 'db', db), patch.object(server, '_fetch_artist_context_from_youtube_api') as fetch:
        assert await server._artist_context_with_cache(MagicMock(), 'future', budget) == CONTEXT
    fetch.assert_not_called()
    assert budget == [300]


@pytest.mark.asyncio
async def test_a_new_artist_costs_two_searches_and_is_cached():
    db = cache_db({'context': CONTEXT, 'fetched_at': datetime.now(timezone.utc) - timedelta(days=8)})
    budget = [300]
    with patch.object(server, 'db', db), patch.object(server, '_fetch_artist_context_from_youtube_api', return_value=CONTEXT):
        await server._artist_context_with_cache(MagicMock(), 'future', budget)
    assert budget == [100]
    db.artist_context_cache.update_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_no_budget_left_means_no_artist_search():
    db = cache_db(None)
    with patch.object(server, 'db', db), patch.object(server, '_fetch_artist_context_from_youtube_api') as fetch:
        with pytest.raises(RuntimeError):
            await server._artist_context_with_cache(MagicMock(), 'future', [150])
    fetch.assert_not_called()


def test_artist_context_uses_two_searches_not_three():
    youtube = MagicMock()
    youtube.search.return_value.list.return_value.execute.return_value = {
        'pageInfo': {'totalResults': 1200},
        'items': [{'snippet': {'title': 'Future - Mask Off', 'channelTitle': 'Future'}}],
    }
    context = server._fetch_artist_context_from_youtube_api(youtube, 'future')
    assert youtube.search.return_value.list.call_count == 2
    assert context['channel_title'] == 'Future'
    assert context['type_beat_total_results'] == 1200
