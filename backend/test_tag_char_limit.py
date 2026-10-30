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

from fastapi import HTTPException

from services import tag_metrics


def test_char_count_matches_youtube():
    # "trap" = 4, '"type beat"' = 11, two commas
    assert tag_metrics.youtube_tags_char_count(['trap', 'type beat', 'drill']) == 4 + 11 + 5 + 2
    assert tag_metrics.youtube_tags_char_count([]) == 0
    assert tag_metrics.youtube_tags_char_count(['', '  ']) == 0


def test_long_tag_lists_are_cut_to_500_keeping_the_best_first():
    # Like the "future codeine crazy" run: 50 long tags, about 1,600 characters.
    tags = [f'future codeine crazy type beat {i}' for i in range(50)]
    fitted = tag_metrics.fit_tags_to_char_limit(tags)
    assert tag_metrics.youtube_tags_char_count(fitted) <= 500
    assert fitted == tags[: len(fitted)]
    assert len(fitted) >= 10


def test_a_tag_that_does_not_fit_is_skipped_but_shorter_ones_still_fill_the_space():
    tags = ['a' * 490, 'b' * 20, 'cc']
    assert tag_metrics.fit_tags_to_char_limit(tags) == ['a' * 490, 'cc']


def test_fitting_never_exceeds_the_limit():
    tags = [f'tag {i} ' + 'x' * (i % 17) for i in range(200)]
    for limit in (1, 10, 100, 500):
        assert tag_metrics.youtube_tags_char_count(tag_metrics.fit_tags_to_char_limit(tags, limit)) <= limit


@pytest.mark.asyncio
async def test_saving_an_edited_list_over_the_limit_is_refused():
    db = MagicMock()
    db.tag_generations.find_one = AsyncMock(return_value={'id': 't1', 'user_id': 'u1', 'tags': ['old tag']})
    db.tag_generations.update_one = AsyncMock()
    request = server.TagHistoryUpdateRequest(tags=[f'long {chr(97 + i) * 3} tag type beat' for i in range(26)])
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.update_tag_history('t1', request, current_user={'id': 'u1'})
    assert err.value.status_code == 400
    assert '500' in err.value.detail
    db.tag_generations.update_one.assert_not_awaited()


def _entries(pairs):
    return [{'tag': tag, 'score': score} for tag, score in pairs]


def test_buckets():
    b = tag_metrics.tag_bucket
    assert b('future type beat', 'future') == 'core'
    assert b('future x young thug type beat', 'future') == 'crossover'
    assert b('young thug type beat', 'future') == 'crossover'
    assert b('dark trap', 'future') == 'sound'
    assert b('future codeine crazy type beat dark', 'future') == 'long_tail'


def test_selection_fits_keeps_the_best_and_is_sorted():
    pool = _entries([(f'future song{i} type beat', 90 - i) for i in range(40)])
    picked = tag_metrics.select_tag_set(pool, artist_name='future')
    assert tag_metrics.youtube_tags_char_count(picked) <= 500
    assert picked[0] == 'future song0 type beat'
    scores = {e['tag']: e['score'] for e in pool}
    assert [scores[t] for t in picked] == sorted((scores[t] for t in picked), reverse=True)


def test_selection_mixes_kinds_instead_of_only_core_tags():
    core = [(f'future song{i} type beat', 85 - i * 0.1) for i in range(30)]
    other = [('young thug type beat', 70), ('future x gunna type beat', 70), ('dark trap', 68), ('melodic drill', 66)]
    picked = tag_metrics.select_tag_set(_entries(core + other), artist_name='future')
    kinds = {tag_metrics.tag_bucket(t, 'future') for t in picked}
    assert {'crossover', 'sound'} <= kinds
    # Plain top-score order leaves most of the other kinds out.
    plain = tag_metrics.fit_tags_to_char_limit([t for t, _ in sorted(core + other, key=lambda x: -x[1])])
    non_core = lambda tags: sum(tag_metrics.tag_bucket(t, 'future') != 'core' for t in tags)
    assert non_core(picked) > non_core(plain)


def test_near_repeats_lose_to_something_new():
    pool = _entries([
        ('future type beat', 90), ('future type beat hard', 80), ('future type beat dark', 80),
        ('future type beat sad', 80), ('nardo wick type beat', 76),
    ])
    picked = tag_metrics.select_tag_set(pool, artist_name='future', limit=80)
    assert 'nardo wick type beat' in picked


def test_selection_never_exceeds_the_limit():
    pool = _entries([(f'tag {i} ' + 'x' * (i % 23), 100 - i % 50) for i in range(120)])
    for limit in (20, 100, 500):
        assert tag_metrics.youtube_tags_char_count(tag_metrics.select_tag_set(pool, limit=limit)) <= limit
