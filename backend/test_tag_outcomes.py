"""Upload outcomes: recording, view checkpoints and track records that feed tag scores."""

import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.append(str(Path(__file__).parent))

from services import tag_metrics, tag_outcomes

NOW = datetime(2026, 11, 30, tzinfo=timezone.utc)


def outcome(video_id, user, views, tags, day=28):
    return {'video_id': video_id, 'user_id': user, 'tags': tags, 'checkpoints': {f'd{day}': {'views': views}}}


def test_videos_are_compared_with_their_own_channel():
    docs = [outcome('a1', 'big', 100_000, []), outcome('a2', 'big', 100_000, []), outcome('a3', 'big', 200_000, []),
            outcome('b1', 'small', 100, []), outcome('b2', 'small', 100, []), outcome('b3', 'small', 400, [])]
    rel = tag_outcomes.relative_performance(docs)
    # Each channel's best video doubles / quadruples its own normal, whatever the channel's size.
    assert rel['a3'] == pytest.approx(math.log2(200_001 / 100_001))
    assert rel['b3'] == pytest.approx(math.log2(401 / 101))
    assert rel['a1'] == pytest.approx(0)


def test_new_producers_use_everyone_as_their_baseline_and_too_little_data_scores_nothing():
    docs = [outcome('a1', 'x', 100, []), outcome('a2', 'x', 100, []), outcome('b1', 'new', 400, [])]
    assert tag_outcomes.relative_performance(docs)['b1'] == pytest.approx(math.log2(401 / 101))
    assert tag_outcomes.relative_performance(docs[:2]) == {}


def test_boost_needs_enough_videos_and_is_capped():
    assert tag_outcomes.boost_for(None) == 0
    assert tag_outcomes.boost_for({'videos': 2, 'mean_log_rel': 3}) == 0
    assert tag_outcomes.boost_for({'videos': 3, 'mean_log_rel': 1}) == pytest.approx(6)
    assert tag_outcomes.boost_for({'videos': 9, 'mean_log_rel': 5}) == tag_outcomes.MAX_BOOST
    assert tag_outcomes.boost_for({'videos': 9, 'mean_log_rel': -5}) == -tag_outcomes.MAX_BOOST


def collection():
    c = MagicMock()
    c.update_one = AsyncMock()
    return c


@pytest.mark.asyncio
async def test_uploads_are_recorded_once_with_normalized_tags():
    db = {tag_outcomes.OUTCOMES: collection()}
    await tag_outcomes.record_upload(db, user_id='u1', video_id='v1', tags=['Future  Type Beat', 'future type beat', 'dark trap'], run_id='r1', now=NOW)
    query, update = db[tag_outcomes.OUTCOMES].update_one.await_args.args
    assert query == {'video_id': 'v1'}
    assert update['$setOnInsert']['tags'] == ['future type beat', 'dark trap']
    assert db[tag_outcomes.OUTCOMES].update_one.await_args.kwargs['upsert'] is True


@pytest.mark.asyncio
async def test_checkpoints_read_views_in_one_call_and_mark_deleted_videos():
    outcomes = collection()
    due = MagicMock()
    due.to_list = AsyncMock(side_effect=[[{'video_id': 'v1'}, {'video_id': 'gone'}], [], [], []])
    outcomes.find.return_value = due
    youtube = MagicMock()
    youtube.videos.return_value.list.return_value.execute.return_value = {'items': [{'id': 'v1', 'statistics': {'viewCount': '1200'}}]}

    stats = await tag_outcomes.collect_checkpoints({tag_outcomes.OUTCOMES: outcomes}, youtube, now=NOW)

    assert stats == {'checked': 1, 'missing': 1, 'api_calls': 1}
    assert youtube.videos.return_value.list.call_args.kwargs['id'] == 'v1,gone'
    saved = {call.args[0]['video_id']: call.args[1]['$set'] for call in outcomes.update_one.await_args_list}
    assert saved['v1']['checkpoints.d7']['views'] == 1200
    assert saved['gone']['checkpoints.d7']['missing'] is True
    # Only uploads at least 7 days old are asked about.
    assert outcomes.find.call_args_list[0].args[0]['uploaded_at'] == {'$lte': NOW - timedelta(days=7)}


@pytest.mark.asyncio
async def test_track_records_are_rebuilt_per_tag():
    docs = [outcome('a1', 'x', 100, ['future type beat']), outcome('a2', 'x', 100, ['dark trap']),
            outcome('a3', 'x', 400, ['future type beat', 'dark trap'])]
    outcomes = MagicMock()
    outcomes.find.return_value.to_list = AsyncMock(return_value=docs)
    performance = collection()
    stats = await tag_outcomes.rebuild_performance({tag_outcomes.OUTCOMES: outcomes, tag_outcomes.PERFORMANCE: performance}, now=NOW)
    assert stats == {'videos': 3, 'tags': 2}
    saved = {call.args[0]['tag_key']: call.args[1]['$set'] for call in performance.update_one.await_args_list}
    assert saved['future type beat']['videos'] == 2
    assert saved['future type beat']['mean_log_rel'] == pytest.approx((0 + math.log2(401 / 101)) / 2)


@pytest.mark.asyncio
async def test_a_proven_tag_gains_points_and_says_so():
    db = {tag_metrics.TAG_KEYWORD_CACHE_COLLECTION: MagicMock(find_one=AsyncMock(return_value=None))}

    async def demand(db, tags):
        return {t: (60.0, {'found': True}) for t in tags}, {}

    def relevance(**kwargs):
        return {'score': 70, 'reason': '', 'breakdown': {}}

    common = dict(youtube=None, db=db, tags_with_sources=[('proven tag', 'llm'), ('plain tag', 'llm')], query='q',
                  artist_name='a', beat_tokens=set(), relevance_scorer=relevance, demand_lookup=demand)
    scored, _ = await tag_metrics.score_tags_with_youtube_proxy(**common, track_record={'proven tag': {'videos': 4, 'mean_log_rel': 1.0}})
    by_tag = {e['tag']: e for e in scored}
    assert by_tag['proven tag']['score'] == by_tag['plain tag']['score'] + 6
    assert by_tag['proven tag']['signals']['record'] == 'proven'
    assert by_tag['proven tag']['signals']['record_videos'] == 4
    assert 'record' not in by_tag['plain tag']['signals']
