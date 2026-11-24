"""Phase 0 guardrails: the shared daily search count, run budgets in calls, artist misspellings."""

import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.append(str(Path(__file__).parent))

from services import tag_metrics, youtube_quota  # noqa: E402


class _FakeSettings:
    """Enough of a Mongo collection for the daily search counter."""

    def __init__(self, used=0):
        self.docs = {}
        self.preset = used

    async def find_one(self, query, projection=None):
        return self.docs.get(query["key"])

    async def update_one(self, query, update, upsert=False):
        key = query["key"]
        doc = self.docs.get(key)
        if doc is None:
            if upsert:
                self.docs[key] = {"key": key, "search_calls": self.preset}
            return MagicMock(modified_count=0)
        cap = (query.get("search_calls") or {}).get("$lte")
        if cap is not None and doc["search_calls"] > cap:
            return MagicMock(modified_count=0)
        if "$inc" in update:
            doc["search_calls"] += update["$inc"]["search_calls"]
            return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)


class _FakeDb(dict):
    def __init__(self, used=0):
        cache = MagicMock()

        async def nothing(*args, **kwargs):
            return None

        cache.find_one = nothing
        cache.update_one = nothing
        super().__init__({
            youtube_quota.SETTINGS_COLLECTION: _FakeSettings(used),
            tag_metrics.TAG_KEYWORD_CACHE_COLLECTION: cache,
        })


def _searching_youtube():
    youtube = MagicMock()
    youtube.search.return_value.list.return_value.execute.return_value = {
        "pageInfo": {"totalResults": 5000},
        "items": [{"id": {"videoId": "v1"}, "snippet": {"title": "x"}}],
    }
    return youtube


def _relevant(**kwargs):
    return {"score": 80, "reason": "relevant", "breakdown": {}}


@pytest.mark.asyncio
async def test_tag_runs_switch_to_autocomplete_only_at_the_daily_cap():
    limit = youtube_quota.tag_run_limit()
    db = _FakeDb(used=limit)  # every tag-run search for today is already used
    youtube = _searching_youtube()
    budget = [3]
    scored, stats = await tag_metrics.score_tags_with_youtube_proxy(
        youtube=youtube,
        db=db,
        tags_with_sources=[(f"artist type beat {i}", "youtube") for i in range(10)],
        query="artist",
        artist_name="artist",
        beat_tokens=set(),
        relevance_scorer=_relevant,
        quota_budget=budget,
    )
    youtube.search.assert_not_called()
    assert stats["daily_search_cap_reached"] is True
    assert stats["api_calls"] == 0 and budget == [3]
    assert len(scored) == 10  # still scored, from demand and relevance


@pytest.mark.asyncio
async def test_searches_stop_exactly_at_the_cap():
    limit = youtube_quota.tag_run_limit()
    db = _FakeDb(used=limit - 2)  # two searches left today
    youtube = _searching_youtube()
    _, stats = await tag_metrics.score_tags_with_youtube_proxy(
        youtube=youtube,
        db=db,
        tags_with_sources=[(f"tag {i}", "youtube") for i in range(10)],
        query="q",
        artist_name="a",
        beat_tokens=set(),
        relevance_scorer=_relevant,
        quota_budget=[3],
    )
    assert youtube.search.return_value.list.call_count == 2
    assert stats["daily_search_cap_reached"] is True
    assert await youtube_quota.searches_used(db) == limit


@pytest.mark.asyncio
async def test_two_searches_cannot_both_take_the_last_one():
    limit = youtube_quota.tag_run_limit()
    db = _FakeDb(used=limit - 1)
    assert await youtube_quota.try_use_searches(db) is True
    assert await youtube_quota.try_use_searches(db) is False
    assert await youtube_quota.tag_searches_left(db) == 0


@pytest.mark.asyncio
async def test_a_counter_that_cannot_be_written_still_allows_the_search():
    broken = MagicMock()
    broken.__getitem__.side_effect = RuntimeError("database down")
    assert await youtube_quota.try_use_searches(broken) is True


def test_run_budget_is_counted_in_search_calls():
    assert tag_metrics.SEARCH_CALL == 1
    assert tag_metrics.TAG_SEARCH_CALL_BUDGET == tag_metrics.TAG_QUOTA_BUDGET_UNITS // tag_metrics.YOUTUBE_SEARCH_COST


def test_quota_day_resets_at_midnight_pacific():
    # 07:30 UTC is still the previous day in California.
    assert youtube_quota.quota_day(datetime(2026, 11, 24, 7, 30, tzinfo=timezone.utc)) == "2026-11-23"
    assert youtube_quota.quota_day(datetime(2026, 11, 24, 9, 30, tzinfo=timezone.utc)) == "2026-11-24"


def test_artist_misspellings_are_real_typos_never_the_name():
    assert "kencarson" in tag_metrics.artist_misspellings("Ken Carson")
    assert "travis scot" in tag_metrics.artist_misspellings("travis scott")
    assert "playboy carti" in tag_metrics.artist_misspellings("playboi carti")
    for name in ("future", "ken carson", "travis scott"):
        assert name not in tag_metrics.artist_misspellings(name)
    assert tag_metrics.artist_misspellings("") == []
    assert tag_metrics.misspelling_tags("ken carson")[0] == "kencarson type beat"


def _full_pack():
    # Enough strong regular tags to fill all 500 characters on their own.
    return [{"tag": f"ken carson type beat number {i}", "score": 95 - i} for i in range(30)]


def test_misspelling_slots_fit_within_500_characters():
    misspellings = [
        {"tag": "kencarson type beat", "score": 60},
        {"tag": "ken carsen type beat", "score": 55},
        {"tag": "ken karson type beat", "score": 50},
        {"tag": "kenn carson type beat", "score": 45},
        {"tag": "ken carso type beat", "score": 40},
    ]
    picked = tag_metrics.select_tag_set(_full_pack(), artist_name="ken carson", misspellings=misspellings)
    chosen = [tag for tag in picked if tag in {m["tag"] for m in misspellings}]
    assert 2 <= len(chosen) <= 4
    assert tag_metrics.youtube_tags_char_count(picked) <= 500
    assert picked[0] == "ken carson type beat number 0"  # the best tag is never dropped for a typo


def test_room_to_spare_takes_up_to_four_misspellings():
    regular = [{"tag": "ken carson type beat", "score": 90}, {"tag": "opium type beat", "score": 80}]
    misspellings = [{"tag": f"kencarson type beat {i}", "score": 50} for i in range(6)]
    picked = tag_metrics.select_tag_set(regular, artist_name="ken carson", misspellings=misspellings)
    assert sum(tag.startswith("kencarson") for tag in picked) == 4
    assert {"ken carson type beat", "opium type beat"} <= set(picked)


def test_no_misspellings_leaves_the_set_unchanged():
    entries = _full_pack()
    assert tag_metrics.select_tag_set(entries, artist_name="ken carson") == tag_metrics.select_tag_set(
        entries, artist_name="ken carson", misspellings=[]
    )
