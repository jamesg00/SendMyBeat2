import os
import sys
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



@pytest.mark.asyncio
async def test_an_upload_records_its_tags_and_their_kinds():
    db = MagicMock()
    db.tag_generations.find_one = AsyncMock(return_value={'query': 'future'})
    record = AsyncMock()
    with patch.object(server, 'db', db), patch.object(server.tag_outcomes_service, 'record_upload', record):
        await server._record_upload_outcome(
            user_id='u1', video_id='vid', payload={'tags': ['future type beat', 'dark trap'], 'tags_id': 'r1'}
        )
    kwargs = record.await_args.kwargs
    assert kwargs['video_id'] == 'vid' and kwargs['run_id'] == 'r1'
    assert kwargs['buckets'] == {'future type beat': 'core', 'dark trap': 'sound'}


@pytest.mark.asyncio
async def test_recording_problems_never_fail_the_upload():
    with patch.object(server.tag_outcomes_service, 'record_upload', AsyncMock(side_effect=RuntimeError('db down'))):
        await server._record_upload_outcome(user_id='u1', video_id='vid', payload={'tags': ['x']})
