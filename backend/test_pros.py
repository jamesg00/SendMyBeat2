"""Pros: title patterns, plans that tick themselves off, and channel data from YouTube."""

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

from fastapi import HTTPException

from services import pros

NOW = datetime(2026, 11, 1, 12, tzinfo=timezone.utc)


def up(title, days_ago):
    return {'title': title, 'published_at': (NOW - timedelta(days=days_ago)).isoformat()}


def test_every_pro_has_the_profile_template_filled():
    assert len(pros.PROS) == 5
    for pro in pros.PROS:
        for field in ('id', 'name', 'tagline', 'story', 'notable', 'moves', 'sources', 'handles', 'search'):
            assert pro[field], (pro['id'], field)
        for move in pro['moves']:
            assert move['steps'] and all(s['kind'] in ('manual', 'uploads', 'title_formula', 'title_pair') for s in move['steps'])


def test_title_reading():
    assert pros.leads_with_artist('Future Type Beat - "MOONWALK"')
    assert not pros.leads_with_artist('MOONWALK (prod. me)')
    assert pros.pairs_artists('Meek Mill x Ace Hood Type Beat - "Maniac"')
    assert not pros.pairs_artists('Future Type Beat')


def test_title_patterns():
    uploads = [up('Future Type Beat - "A" 2026', 0), up('Gunna x Future Type Beat', 3), up('just a beat', 7)]
    p = pros.title_patterns(uploads)
    assert p['uploads'] == 3 and p['lead_artist_pct'] == 67 and p['pair_pct'] == 33 and p['year_pct'] == 33
    assert p['per_week'] == 3.0
    assert sum(p['weekdays']) == 3
    assert pros.title_patterns([])['lead_artist_pct'] is None


def test_plans_are_built_from_the_moves_you_pick():
    plan = pros.build_plan('mjnichols', ['artist-titles', 'rhythm'], user_id='u1', now=NOW)
    assert [s['id'] for s in plan['steps']] == ['artist-titles-0', 'rhythm-0']
    assert pros.build_plan('mjnichols', ['nope'], user_id='u1')['steps']  # falls back to the first move


def test_upload_steps_tick_themselves_from_uploads_since_the_plan_started():
    plan = pros.build_plan('mjnichols', ['artist-titles', 'rhythm', 'store-link'], user_id='u1', now=NOW - timedelta(days=10))
    uploads = [up('Future Type Beat - "A"', 1), up('Drake Type Beat', 2), up('untitled', 3), up('Old Type Beat', 30)]
    p = pros.plan_progress(plan, uploads, now=NOW)
    by_id = {s['id']: s for s in p['steps']}
    assert by_id['artist-titles-0']['count'] == 2 and not by_id['artist-titles-0']['done']  # the 30-day-old one is before the plan
    assert by_id['rhythm-0']['count'] == 3 and not by_id['rhythm-0']['done']
    assert p['next']['id'] == 'artist-titles-0' and p['total'] == 3


def youtube_fake(handle_hits=True):
    yt = MagicMock()
    yt.channels.return_value.list.side_effect = lambda **kw: MagicMock(execute=MagicMock(return_value=(
        {'items': [{'id': 'UC123'}]} if 'forHandle' in kw and handle_hits else
        {'items': []} if 'forHandle' in kw else
        {'items': [{'id': 'UC123', 'snippet': {'title': 'Chan', 'thumbnails': {'high': {'url': 'https://yt/photo.jpg'}}},
                    'statistics': {'subscriberCount': '1000', 'viewCount': '50000', 'videoCount': '20'},
                    'brandingSettings': {'image': {'bannerExternalUrl': 'https://yt/banner'}},
                    'contentDetails': {'relatedPlaylists': {'uploads': 'UU123'}}}]})))
    yt.playlistItems.return_value.list.return_value.execute.return_value = {
        'items': [{'snippet': {'title': 'Future Type Beat - "A"', 'thumbnails': {}}, 'contentDetails': {'videoId': 'v1', 'videoPublishedAt': NOW.isoformat()}}]}
    yt.videos.return_value.list.return_value.execute.return_value = {'items': [{'id': 'v1', 'statistics': {'viewCount': '321'}}]}
    yt.search.return_value.list.return_value.execute.return_value = {'items': [{'id': {'channelId': 'UCsearch'}}]}
    return yt


def cache_db(existing=None):
    coll = MagicMock()
    coll.find_one = AsyncMock(return_value=existing)
    coll.update_one = AsyncMock()
    return {pros.CHANNEL_CACHE: coll}, coll


@pytest.mark.asyncio
async def test_channels_are_found_by_handle_and_cached_with_photo_and_uploads():
    db, coll = cache_db()
    stats = await pros.refresh_channels(db, youtube_fake(), now=NOW)
    assert stats['refreshed'] == 5
    saved = coll.update_one.await_args_list[0].args[1]['$set']
    assert saved['photo'] == 'https://yt/photo.jpg' and saved['banner'] == 'https://yt/banner'
    assert saved['subscribers'] == 1000 and saved['uploads'][0]['views'] == 321
    assert saved['channel_url'] == 'https://www.youtube.com/channel/UC123'


@pytest.mark.asyncio
async def test_a_wrong_handle_falls_back_to_one_search():
    db, coll = cache_db()
    yt = youtube_fake(handle_hits=False)
    stats = await pros.refresh_channels(db, yt, now=NOW)
    assert yt.search.return_value.list.call_count == 4  # CashMoneyAP's channel is pinned, so no search for it
    assert stats['units'] >= 400
    assert coll.update_one.await_args_list[0].args[1]['$set']['channel_id'] == 'UCsearch'


@pytest.mark.asyncio
async def test_fresh_channels_are_not_fetched_again_and_no_key_means_no_calls():
    db, coll = cache_db({'pro_id': 'x', 'channel_id': 'UC1', 'fetched_at': NOW - timedelta(hours=2)})
    yt = youtube_fake()
    assert (await pros.refresh_channels(db, yt, now=NOW))['refreshed'] == 0
    yt.channels.assert_not_called()
    assert (await pros.refresh_channels(db, None))['refreshed'] == 0


@pytest.mark.asyncio
async def test_only_manual_steps_can_be_ticked_by_hand():
    db = MagicMock()
    db.__getitem__ = lambda self, name: getattr(db, name)
    db.style_plans.update_one = AsyncMock(return_value=MagicMock(matched_count=0))
    with patch.object(server, 'db', db), pytest.raises(HTTPException) as err:
        await server.update_style_plan_step('rhythm-0', server.StylePlanStepUpdate(done=True), current_user={'id': 'u1'})
    assert err.value.status_code == 404
    query = db.style_plans.update_one.await_args.args[0]
    assert query['steps'] == {'$elemMatch': {'id': 'rhythm-0', 'kind': 'manual'}}


@pytest.mark.asyncio
async def test_unknown_producers_404():
    with pytest.raises(HTTPException) as err:
        await server.create_style_plan('nobody', server.StylePlanRequest(moves=[]), current_user={'id': 'u1'})
    assert err.value.status_code == 404


@pytest.mark.asyncio
async def test_a_pinned_channel_skips_handle_lookup_and_search():
    pinned = next(p for p in pros.PROS if p['id'] == 'cashmoneyap')
    db, coll = cache_db()
    yt = youtube_fake(handle_hits=False)
    with patch.object(pros, 'PROS', [pinned]):
        await pros.refresh_channels(db, yt, now=NOW)
    yt.search.assert_not_called()
    assert not any('forHandle' in c.kwargs for c in yt.channels.return_value.list.call_args_list)
    assert coll.update_one.await_args_list[0].args[1]['$set']['channel_id'] == 'UCsVTRE0hRlbo6Obo-qkYxaw'


def test_a_press_photo_wins_over_the_channel_picture_and_carries_its_credit():
    pro = {**pros.PROS[0], 'photo': 'https://cdn/press.jpg', 'photo_credit': 'Photo: Jane Doe'}
    c = pros.card(pro, {'photo': 'https://yt/photo.jpg'})
    assert c['photo'] == 'https://cdn/press.jpg' and c['photo_credit'] == 'Photo: Jane Doe'
    c = pros.card(pros.PROS[0], {'photo': 'https://yt/photo.jpg'})
    assert c['photo'] == 'https://yt/photo.jpg' and c['photo_credit'] is None


def test_every_pro_says_why_they_blew_up():
    assert all(pros.detail(p, None)['why'] for p in pros.PROS)
