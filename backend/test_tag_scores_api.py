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
async def test_saving_keeps_existing_scores_and_scores_new_tags_on_demand():
    existing = [{'tag': 'future type beat', 'score': 91, 'breakdown': {}, 'signals': {'demand': 'high', 'competition': 'low'}}]

    async def demand(db, tags):
        return {'future mask off type beat': (80.0, {'found': True})}, {}

    db = MagicMock()
    db.tag_keyword_cache.find_one = AsyncMock(return_value=None)
    db.__getitem__ = lambda self, name: getattr(db, name)
    with patch.object(server, 'db', db), patch.object(server.tag_autocomplete_service, 'autocomplete_demand', demand):
        scored = await server._rescore_tags(
            tags=['future mask off type beat', 'future type beat'],
            query='future',
            existing_scored=existing,
        )
    assert [entry['tag'] for entry in scored] == ['future mask off type beat', 'future type beat']
    assert scored[1] is existing[0]
    assert scored[0]['signals']['demand'] == 'high'
    assert scored[0]['breakdown']['demand_source'] == 'autocomplete'


@pytest.mark.asyncio
async def test_rescoring_falls_back_to_relevance_when_scoring_fails():
    with patch.object(server.tag_metrics_service, 'score_tags_with_youtube_proxy', AsyncMock(side_effect=RuntimeError('down'))):
        scored = await server._rescore_tags(tags=['dark trap type beat'], query='dark trap')
    assert scored[0]['tag'] == 'dark trap type beat'


def test_old_runs_get_labels_when_read():
    doc = {'scored_tags': [{'tag': 'x', 'breakdown': {'demand_source': 'views', 'demand': 70}}], 'debug': {'a': 1}}
    out = server._sanitize_tag_generation_doc(doc, {'id': 'u1'})
    assert out['scored_tags'][0]['signals'] == {'demand': 'unknown', 'competition': 'unknown'}
    assert out['debug'] is None


@pytest.mark.asyncio
async def test_title_ideas_come_from_your_own_run():
    db = MagicMock()
    db.tag_generations.find_one = AsyncMock(return_value={'query': 'future type beat', 'scored_tags': [{'tag': 'future type beat', 'score': 90}]})
    with patch.object(server, 'db', db):
        res = await server.suggest_titles_for_run('r1', beat_name='moonwalk', current_user={'id': 'u1'})
    assert db.tag_generations.find_one.await_args.args[0] == {'id': 'r1', 'user_id': 'u1'}
    assert res['titles'][0]['title'] == 'Future Type Beat - "MOONWALK"'
