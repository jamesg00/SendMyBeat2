import os
import sys
from datetime import datetime, timedelta, timezone
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
from pydantic import ValidationError

from models_spotlight import ProducerProfileUpdate


@pytest.mark.parametrize('url', [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'youtube.com/live/dQw4w9WgXcQ',
])
def test_youtube_video_links_are_recognised(url):
    assert server._youtube_video_id(url) == 'dQw4w9WgXcQ'


@pytest.mark.parametrize('url', ['https://www.youtube.com/@someproducer', 'https://beatstars.com/x', 'not a link'])
def test_non_video_links_are_rejected(url):
    assert server._youtube_video_id(url) is None


def test_byte_range_parsing():
    assert server._parse_byte_range(None, 100) is None
    assert server._parse_byte_range('bytes=0-1', 100) == (0, 1)
    assert server._parse_byte_range('bytes=90-', 100) == (90, 99)
    assert server._parse_byte_range('bytes=-10', 100) == (90, 99)
    assert server._parse_byte_range('bytes=200-', 100) == 'invalid'


async def body_of(response):
    return b''.join([chunk async for chunk in response.body_iterator])


@pytest.mark.asyncio
async def test_audio_ranges_are_answered_in_full(tmp_path):
    path = tmp_path / 'beat.mp3'
    # Bigger than one read chunk, so streaming has to stitch several together.
    data = bytes(range(256)) * 4096
    path.write_bytes(data)

    probe = await server._audio_file_response(path, 'audio/mpeg', 'bytes=0-1')
    assert probe.status_code == 206 and await body_of(probe) == data[:2]
    assert probe.headers['content-range'] == f'bytes 0-1/{len(data)}'
    assert probe.headers['content-length'] == '2'

    # iPhone players ask for "the rest" after probing; a short answer stalls them forever.
    rest = await server._audio_file_response(path, 'audio/mpeg', 'bytes=0-')
    assert await body_of(rest) == data
    assert rest.headers['content-range'] == f'bytes 0-{len(data) - 1}/{len(data)}'

    middle = await server._audio_file_response(path, 'audio/mpeg', 'bytes=300000-700000')
    assert await body_of(middle) == data[300000:700001]

    full = await server._audio_file_response(path, 'audio/mpeg', None)
    assert full.status_code == 200 and full.headers['accept-ranges'] == 'bytes'
    assert await body_of(full) == data

    head = await server._audio_file_response(path, 'audio/mpeg', None, head=True)
    assert head.status_code == 200 and head.headers['content-length'] == str(len(data)) and head.body == b''

    past_end = await server._audio_file_response(path, 'audio/mpeg', 'bytes=99999999-')
    assert past_end.status_code == 416


def swap_db(previous):
    db = MagicMock()
    db.producer_profiles.find_one_and_update = AsyncMock(return_value={'top_beat': previous} if previous else None)
    db.producer_profiles.find_one = AsyncMock(return_value={})
    db.producer_stats_cache.delete_many = AsyncMock()
    db.uploads.find_one = AsyncMock(return_value={'id': 'old-file'})
    db.uploads.delete_one = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_setting_a_youtube_top_beat_saves_link_and_thumbnail():
    db = swap_db(None)
    with patch.object(server, 'db', db):
        res = await server.set_top_beat_link(
            server.TopBeatLinkRequest(url='https://youtu.be/dQw4w9WgXcQ', title='My best one'),
            current_user={'id': 'u-yt'},
        )

    top = res['top_beat']
    assert top['kind'] == 'youtube' and top['title'] == 'My best one'
    assert top['url'] == 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    assert top['thumbnail'].endswith('/dQw4w9WgXcQ/hqdefault.jpg')
    saved = db.producer_profiles.find_one_and_update.await_args.args[1]['$set']
    assert saved['top_beat_url'] == top['url']


@pytest.mark.asyncio
async def test_replacing_an_uploaded_beat_deletes_exactly_the_old_file():
    db = swap_db({'kind': 'audio', 'file_id': 'old-file', 'url': 'x'})
    storage = MagicMock()
    with patch.object(server, 'db', db), patch.object(server, 'media_storage', storage):
        await server._swap_top_beat('u1', {'kind': 'audio', 'file_id': 'new-file', 'url': 'y'})

    db.uploads.find_one.assert_awaited_once_with({'id': 'old-file', 'user_id': 'u1', 'file_type': 'top_beat'})
    storage.delete.assert_called_once()
    db.uploads.delete_one.assert_awaited_once_with({'id': 'old-file'})


@pytest.mark.asyncio
async def test_swapping_from_a_youtube_beat_deletes_nothing():
    db = swap_db({'kind': 'youtube', 'url': 'x'})
    storage = MagicMock()
    with patch.object(server, 'db', db), patch.object(server, 'media_storage', storage):
        await server._swap_top_beat('u1', None)
    storage.delete.assert_not_called()


@pytest.mark.asyncio
async def test_setting_a_non_video_link_is_rejected():
    with pytest.raises(HTTPException) as err:
        await server.set_top_beat_link(server.TopBeatLinkRequest(url='https://beatstars.com/me'), current_user={'id': 'u-bad'})
    assert err.value.status_code == 400


@pytest.mark.asyncio
async def test_link_setting_is_rate_limited():
    db = swap_db(None)
    with patch.object(server, 'db', db):
        for _ in range(10):
            await server.set_top_beat_link(server.TopBeatLinkRequest(url='https://youtu.be/dQw4w9WgXcQ', title='t'), current_user={'id': 'u-rate'})
        with pytest.raises(HTTPException) as err:
            await server.set_top_beat_link(server.TopBeatLinkRequest(url='https://youtu.be/dQw4w9WgXcQ', title='t'), current_user={'id': 'u-rate'})
    assert err.value.status_code == 429


@pytest.mark.asyncio
async def test_profile_form_resending_the_current_link_changes_nothing():
    db = swap_db(None)
    db.producer_profiles.find_one = AsyncMock(return_value={'top_beat': {'kind': 'audio', 'url': 'https://api.x/beat'}})
    with patch.object(server, 'db', db):
        await server._apply_top_beat_url_from_profile_form('u1', 'https://api.x/beat')
    db.producer_profiles.find_one_and_update.assert_not_awaited()


@pytest.mark.asyncio
async def test_profile_form_link_to_another_site_becomes_a_link_beat():
    db = swap_db(None)
    with patch.object(server, 'db', db):
        await server._apply_top_beat_url_from_profile_form('u1', 'https://www.beatstars.com/beat/123')
    saved = db.producer_profiles.find_one_and_update.await_args.args[1]['$set']['top_beat']
    assert saved['kind'] == 'link' and saved['url'] == 'https://www.beatstars.com/beat/123'


@pytest.mark.asyncio
async def test_streaming_without_an_uploaded_top_beat_is_404():
    db = MagicMock()
    db.producer_profiles.find_one = AsyncMock(return_value={'top_beat': {'kind': 'youtube', 'url': 'x'}})
    request = SimpleNamespace(headers={}, client=SimpleNamespace(host='203.0.113.5'))
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.stream_top_beat_audio('u1', request)
    assert err.value.status_code == 404


@pytest.mark.asyncio
async def test_channel_lookup_is_not_retried_within_a_day():
    db = MagicMock()
    db.producer_profiles.find_one = AsyncMock(return_value={'youtube_channel_lookup_at': datetime.now(timezone.utc) - timedelta(hours=2)})
    db.youtube_connections.find_one = AsyncMock()
    with patch.object(server, 'db', db), patch.object(server, 'refresh_youtube_token', AsyncMock()) as refresh:
        await server._ensure_producer_youtube_channel_id('u1')
    refresh.assert_not_awaited()
    db.youtube_connections.find_one.assert_not_awaited()


def test_channel_handle_lookup_avoids_search(monkeypatch):
    calls = []

    def fake_get(url, params=None, timeout=None):
        calls.append(url)
        return SimpleNamespace(status_code=200, json=lambda: {'items': [{'id': 'UC123'}]})

    monkeypatch.setattr(server.requests, 'get', fake_get)
    assert server._youtube_get_channel_id_from_hints({'handle': 'someproducer'}, 'key') == 'UC123'
    assert all('/search' not in c for c in calls)


@pytest.mark.parametrize('links', [
    {'youtube': 'intent://open#Intent;end'},
    {'instagram': 'tel:5551234'},
    {'website': 'javascript:alert(1)'},
    {'unknown_site': 'https://example.com'},
    {'youtube': 42},
])
def test_profile_links_must_be_known_https_links(links):
    with pytest.raises(ValidationError):
        ProducerProfileUpdate(social_links=links)


def test_profile_links_are_normalised():
    update = ProducerProfileUpdate(social_links={'YouTube': 'youtube.com/@me', 'instagram': 'http://instagram.com/me', 'tiktok': ''})
    assert update.social_links == {
        'youtube': 'https://youtube.com/@me',
        'instagram': 'https://instagram.com/me',
        'tiktok': '',
    }


def test_profile_text_limits():
    with pytest.raises(ValidationError):
        ProducerProfileUpdate(bio='x' * 501)
    with pytest.raises(ValidationError):
        ProducerProfileUpdate(tags=['t'] * 16)
    with pytest.raises(ValidationError):
        ProducerProfileUpdate(top_beat_url='sms:123')
    assert ProducerProfileUpdate(avatar_url='data:image/png;base64,iVBORw0KGgo=').avatar_url
    assert ProducerProfileUpdate(avatar_url='data:image/svg+xml;utf8,%3Csvg%3E').avatar_url
    with pytest.raises(ValidationError):
        ProducerProfileUpdate(avatar_url='data:text/html;base64,PGgxPg==')
