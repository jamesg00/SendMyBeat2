"""Autocomplete demand and the per-generation YouTube quota budget."""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.append(str(Path(__file__).parent))

from services import tag_autocomplete, tag_metrics


def test_prefixes_are_the_tag_typed_one_word_at_a_time():
    assert tag_autocomplete.prefixes_for("Future  Type Beat") == ["future", "future type", "future type beat"]


def test_suggested_early_and_high_beats_suggested_late():
    early, evidence = tag_autocomplete.demand_from_suggestions(
        "future type beat", {"future": ["future", "future type beat", "future songs"]}
    )
    late, _ = tag_autocomplete.demand_from_suggestions(
        "future codeine crazy type beat",
        {
            "future": ["future"],
            "future codeine": ["future codeine crazy"],
            "future codeine crazy": ["future codeine crazy"],
            "future codeine crazy type": ["future codeine crazy type beat"],
        },
    )
    assert evidence == {"found": True, "words_typed": 1, "words": 3, "position": 1}
    assert early > late >= 55


def test_only_suggested_once_fully_typed_is_small_demand():
    demand, _ = tag_autocomplete.demand_from_suggestions(
        "dark piano trap", {"dark": ["dark"], "dark piano": ["dark piano"], "dark piano trap": ["dark piano trap"]}
    )
    assert 20 <= demand < 40


def test_never_suggested_is_low_and_unlooked_up_is_unknown():
    never, _ = tag_autocomplete.demand_from_suggestions("zzq beat", {"zzq": [], "zzq beat": ["other"]})
    unknown, _ = tag_autocomplete.demand_from_suggestions("zzq beat", {"zzq": []})
    assert never == tag_autocomplete.NOT_SUGGESTED_DEMAND
    assert unknown is None


def _cache_db(docs=None):
    collection = MagicMock()
    collection.find.return_value.to_list = AsyncMock(return_value=docs or [])
    collection.update_one = AsyncMock()
    return {tag_autocomplete.AUTOCOMPLETE_CACHE_COLLECTION: collection}, collection


@pytest.mark.asyncio
async def test_shared_prefixes_are_fetched_once_and_cached():
    db, collection = _cache_db()
    calls = []

    def fetcher(prefix):
        calls.append(prefix)
        return {"future": ["future type beat"], "future type": ["future type beat"]}.get(prefix, [prefix])

    demand, stats = await tag_autocomplete.autocomplete_demand(
        db, ["future type beat", "future type beat 2026"], fetcher=fetcher
    )
    assert sorted(calls) == sorted(set(calls))  # no prefix asked twice
    assert "future" in calls and "future type" in calls
    assert demand["future type beat"][0] > 55
    assert stats["fetched"] == len(calls)
    assert collection.update_one.await_count == len(calls)


@pytest.mark.asyncio
async def test_cached_prefixes_are_not_fetched_again():
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    db, _ = _cache_db([{"prefix": "drill", "suggestions": ["drill"], "fetched_at": now}])
    fetcher = MagicMock(return_value=[])
    _, stats = await tag_autocomplete.autocomplete_demand(db, ["drill"], fetcher=fetcher)
    fetcher.assert_not_called()
    assert stats["cache_hits"] == 1


@pytest.mark.asyncio
async def test_stops_asking_after_repeated_failures():
    db, _ = _cache_db()
    fetcher = MagicMock(return_value=None)
    tags = [f"artist{i} type beat" for i in range(20)]
    demand, stats = await tag_autocomplete.autocomplete_demand(db, tags, fetcher=fetcher)
    assert fetcher.call_count < 60
    assert all(value is None for value, _ in demand.values())


def _metrics_db():
    collection = MagicMock()
    collection.find_one = AsyncMock(return_value=None)
    collection.update_one = AsyncMock()
    return {tag_metrics.TAG_KEYWORD_CACHE_COLLECTION: collection}


def _relevance(**kwargs):
    return {"score": 80, "reason": "relevant", "breakdown": {}}


def _youtube():
    youtube = MagicMock()
    youtube.search.return_value.list.return_value.execute.return_value = {
        "pageInfo": {"totalResults": 5000},
        "items": [{"id": {"videoId": "v1"}, "snippet": {"title": "x"}}],
    }
    return youtube


@pytest.mark.asyncio
async def test_scoring_never_spends_more_than_the_budget():
    youtube = _youtube()
    budget = [300]
    tags = [(f"artist type beat {i}", "youtube") for i in range(30)]
    scored, stats = await tag_metrics.score_tags_with_youtube_proxy(
        youtube=youtube,
        db=_metrics_db(),
        tags_with_sources=tags,
        query="artist",
        artist_name="artist",
        beat_tokens=set(),
        relevance_scorer=_relevance,
        quota_budget=budget,
    )
    assert youtube.search.return_value.list.call_count == 3
    youtube.videos.assert_not_called()  # view stats are skipped to save units
    assert budget[0] == 0 and stats["api_calls"] == 3
    assert len(scored) == 30


@pytest.mark.asyncio
async def test_budget_already_spent_on_the_artist_lookup_leaves_one_search():
    youtube = _youtube()
    budget = [100]
    await tag_metrics.score_tags_with_youtube_proxy(
        youtube=youtube,
        db=_metrics_db(),
        tags_with_sources=[(f"tag {i}", "youtube") for i in range(5)],
        query="q",
        artist_name="a",
        beat_tokens=set(),
        relevance_scorer=_relevance,
        quota_budget=budget,
    )
    assert youtube.search.return_value.list.call_count == 1


@pytest.mark.asyncio
async def test_autocomplete_demand_ranks_searched_phrases_above_unsearched_ones():
    async def demand_lookup(db, tags):
        return {"popular type beat": (85.0, {"found": True}), "nobody searches this": (10.0, {"found": False})}, {}

    scored, _ = await tag_metrics.score_tags_with_youtube_proxy(
        youtube=None,
        db=_metrics_db(),
        tags_with_sources=[("nobody searches this", "llm"), ("popular type beat", "llm")],
        query="q",
        artist_name="a",
        beat_tokens=set(),
        relevance_scorer=_relevance,
        demand_lookup=demand_lookup,
    )
    assert [entry["tag"] for entry in scored] == ["popular type beat", "nobody searches this"]
    assert scored[0]["score"] >= tag_metrics.TAG_MIN_PUBLISH_SCORE > scored[1]["score"]
    assert scored[0]["breakdown"]["demand_source"] == "autocomplete"


@pytest.mark.asyncio
async def test_autocomplete_outage_falls_back_to_neutral_demand():
    async def broken(db, tags):
        raise RuntimeError("blocked")

    scored, stats = await tag_metrics.score_tags_with_youtube_proxy(
        youtube=None,
        db=_metrics_db(),
        tags_with_sources=[("some tag", "llm")],
        query="q",
        artist_name="a",
        beat_tokens=set(),
        relevance_scorer=_relevance,
        demand_lookup=broken,
    )
    assert scored[0]["breakdown"]["demand_source"] == "unknown"
    assert "error" in stats["autocomplete"]
