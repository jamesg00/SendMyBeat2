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
    assert len(pros.PROS) == 10
    assert len(pros.BY_ID) == len(pros.PROS)
    # Every channel is pinned, and no two pros share one.
    assert len({pro['channel_id'] for pro in pros.PROS}) == len(pros.PROS)
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


def cache_db(existing=None, override=None):
    coll = MagicMock()
    coll.find_one = AsyncMock(return_value=existing)
    coll.update_one = AsyncMock()
    overrides = MagicMock()
    overrides.find_one = AsyncMock(return_value=override)
    return {pros.CHANNEL_CACHE: coll, pros.OVERRIDES: overrides}, coll


# Every pro's channel is pinned now; these tests check the lookup for one that isn't.
UNPINNED = [{k: v for k, v in pro.items() if k != 'channel_id'} for pro in pros.PROS]


@pytest.mark.asyncio
async def test_channels_are_found_by_handle_and_cached_with_photo_and_uploads():
    db, coll = cache_db()
    with patch.object(pros, 'PROS', UNPINNED):
        stats = await pros.refresh_channels(db, youtube_fake(), now=NOW)
    assert stats['refreshed'] == len(pros.PROS)
    saved = coll.update_one.await_args_list[0].args[1]['$set']
    assert saved['photo'] == 'https://yt/photo.jpg' and saved['banner'] == 'https://yt/banner'
    assert saved['subscribers'] == 1000 and saved['uploads'][0]['views'] == 321
    assert saved['channel_url'] == 'https://www.youtube.com/channel/UC123'


@pytest.mark.asyncio
async def test_a_wrong_handle_falls_back_to_one_search():
    db, coll = cache_db()
    yt = youtube_fake(handle_hits=False)
    with patch.object(pros, 'PROS', UNPINNED):
        stats = await pros.refresh_channels(db, yt, now=NOW)
    assert yt.search.return_value.list.call_count == len(pros.PROS)
    assert stats['units'] >= 100 * len(pros.PROS)
    assert coll.update_one.await_args_list[0].args[1]['$set']['channel_id'] == 'UCsearch'


@pytest.mark.asyncio
async def test_fresh_channels_are_not_fetched_again_and_no_key_means_no_calls():
    # No channel_id in the cache, so no pinned channel looks re-pinned; only freshness decides.
    db, coll = cache_db({'pro_id': 'x', 'fetched_at': NOW - timedelta(hours=2)})
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
    assert c['photo'] == 'https://cdn/press.jpg' and c['photo_credit'] == 'Photo: Jane Doe' and c['photo_source'] == 'press'
    c = pros.card(pros.PROS[0], {'photo': 'https://yt/photo.jpg'})
    assert c['photo'] == 'https://yt/photo.jpg' and c['photo_credit'] is None and c['photo_source'] == 'youtube'
    c = pros.card(pros.PROS[0], {'photo': 'https://yt/photo.jpg'}, {'photo': 'https://cdn/admin.jpg', 'photo_credit': 'Photo: Sam'})
    assert c['photo'] == 'https://cdn/admin.jpg' and c['photo_credit'] == 'Photo: Sam'


def test_with_no_channel_picture_the_top_upload_still_is_used():
    uploads = [{'video_id': 'a', 'views': 10}, {'video_id': 'b', 'views': 900}]
    c = pros.card(pros.PROS[0], {'uploads': uploads})
    assert c['photo'] == 'https://i.ytimg.com/vi/b/hqdefault.jpg' and c['photo_source'] == 'video'
    assert c['cover'] == 'https://i.ytimg.com/vi/b/hqdefault.jpg'
    assert pros.card(pros.PROS[0], None)['photo'] is None


def test_breakdown_finds_the_uploads_that_carried_the_channel():
    uploads = [{'video_id': f'v{i}', 'title': f't{i}', 'views': v, 'published_at': (NOW - timedelta(days=10 - i)).isoformat()}
               for i, v in enumerate([100, 100, 5000, 100, 100, 3000, 100, 2000, 100, 100])]
    b = pros.breakdown(uploads)
    assert b['views'][2] == 5000 and b['breakout_index'] == [2, 5, 7]
    assert b['top_share_pct'] == round(100 * 10000 / 10700) and b['median_views'] == 100
    assert b['breakouts'][0] == {'video_id': 'v2', 'title': 't2', 'views': 5000, 'times_median': 50.0}
    assert pros.breakdown([])['top_share_pct'] is None


def test_heatmap_counts_uploads_by_day_and_part_of_day():
    monday_evening = datetime(2026, 10, 26, 20, tzinfo=timezone.utc)
    p = pros.title_patterns([{'title': 'x', 'published_at': monday_evening.isoformat()}])
    assert p['heatmap'][0] == [0, 0, 0, 1]


def test_style_match_scores_you_against_them_and_names_the_gaps():
    cash = pros.BY_ID['cashmoneyap']
    them = {'uploads': 50, 'per_week': 7.0, 'lead_artist_pct': 100, 'pair_pct': 60, 'quotes_pct': 90}
    same = pros.style_match(cash, them, them)
    assert same['match'] == 100 and same['gaps'] == []
    you = {'uploads': 4, 'per_week': 1.0, 'lead_artist_pct': 100, 'pair_pct': 0, 'quotes_pct': 90}
    r = pros.style_match(cash, them, you)
    assert 0 < r['match'] < 100
    assert [g['trait'] for g in r['gaps']] == ['per_week', 'pair']
    assert r['gaps'][0]['move_id'] == 'steady' and r['gaps'][1]['move_id'] == 'rising-artists'
    assert pros.style_match(cash, them, {'uploads': 0, 'per_week': None})['match'] is None


@pytest.mark.asyncio
async def test_an_admin_pinned_channel_wins_over_the_cached_one():
    db, coll = cache_db({'pro_id': 'x', 'channel_id': 'UCold', 'fetched_at': NOW - timedelta(days=2)}, {'channel_id': 'UCadmin'})
    yt = youtube_fake()
    with patch.object(pros, 'PROS', [pros.PROS[0]]):
        await pros.refresh_channels(db, yt, now=NOW)
    ids = [c.kwargs.get('id') for c in yt.channels.return_value.list.call_args_list]
    assert ids == ['UCadmin']


@pytest.mark.asyncio
async def test_only_admins_can_set_a_producer_photo_and_links_must_be_https():
    with patch.object(server, '_is_admin_user', return_value=False), pytest.raises(HTTPException) as err:
        await server.update_pro_override('cashmoneyap', server.ProOverrideUpdate(photo='https://x/y.jpg'), current_user={'id': 'u1'})
    assert err.value.status_code == 403
    with patch.object(server, '_is_admin_user', return_value=True):
        for bad in (server.ProOverrideUpdate(photo='http://x/y.jpg'), server.ProOverrideUpdate(photo='javascript:alert(1)'),
                    server.ProOverrideUpdate(channel_id='not-a-channel')):
            with pytest.raises(HTTPException) as err:
                await server.update_pro_override('cashmoneyap', bad, current_user={'id': 'a1'})
            assert err.value.status_code == 400


def test_every_pro_says_why_they_blew_up():
    assert all(pros.detail(p, None)['why'] for p in pros.PROS)


def test_each_move_says_how_many_uploads_it_asks_for_in_two_weeks():
    moves = {m['id']: m for m in pros.detail(pros.BY_ID['cashmoneyap'], None)['moves']}
    assert moves['steady']['uploads'] == 6 and moves['name-the-rapper']['uploads'] == 3 and moves['low-entry']['uploads'] == 0
