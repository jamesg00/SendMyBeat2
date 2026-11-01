"""Phone notifications when a background job finishes."""

import os
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault('MONGO_URL', 'mongodb://mock-mongo:27017/testdb')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_MINUTES', '60')

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

with patch('motor.motor_asyncio.AsyncIOMotorClient'):
    import server


class Cursor:
    def __init__(self, docs):
        self.docs = docs

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


def push_db(tokens):
    db = MagicMock()
    db.push_tokens.find = MagicMock(return_value=Cursor([{'token': t} for t in tokens]))
    db.push_tokens.delete_one = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_a_finished_job_notifies_every_device_and_forgets_dead_ones():
    job = {'id': 'j1', 'user_id': 'u1', 'type': 'youtube_upload'}
    db = push_db(['ExponentPushToken[a]', 'ExponentPushToken[b]'])
    response = SimpleNamespace(json=lambda: {'data': [{'status': 'ok'}, {'status': 'error', 'details': {'error': 'DeviceNotRegistered'}}]})
    post = MagicMock(return_value=response)
    with patch.object(server, 'db', db), patch.object(server, '_get_background_job', AsyncMock(return_value=job)), \
         patch.object(server.requests, 'post', post):
        await server._notify_job_finished('j1', 'succeeded')
    messages = post.call_args.kwargs['json']
    assert [m['to'] for m in messages] == ['ExponentPushToken[a]', 'ExponentPushToken[b]']
    assert messages[0]['title'] == 'Your beat is on YouTube' and messages[0]['data']['job_id'] == 'j1'
    db.push_tokens.delete_one.assert_awaited_once_with({'token': 'ExponentPushToken[b]'})


@pytest.mark.asyncio
async def test_no_devices_means_no_push_and_failures_hide_error_details():
    post = MagicMock()
    with patch.object(server, 'db', push_db([])), \
         patch.object(server, '_get_background_job', AsyncMock(return_value={'user_id': 'u1', 'type': 'tag_generation'})), \
         patch.object(server.requests, 'post', post):
        await server._notify_job_finished('j1', 'failed')
    post.assert_not_called()
    title, body = server._job_notification({'type': 'tag_generation', 'error': 'YouTube quota hit'}, 'failed')
    # Error text can mention internals and shows on a lock screen, so it stays in the app.
    assert title == 'Tag generation failed' and body == 'Tap to see what happened.'


@pytest.mark.asyncio
async def test_only_finished_jobs_notify():
    notify = AsyncMock()
    with patch.object(server.background_job_service, 'update_job', AsyncMock()), \
         patch.object(server, '_notify_job_finished', notify):
        await server._update_upload_job('j1', status='processing', progress=40)
        await server._update_upload_job('j1', status='succeeded', progress=100)
        await server.asyncio.sleep(0)
    notify.assert_awaited_once_with('j1', 'succeeded')


def test_push_tokens_must_look_like_expo_tokens():
    server.PushTokenRequest(token='ExponentPushToken[abc123]')
    with pytest.raises(Exception):
        server.PushTokenRequest(token='https://evil.example/hook')
