"""The public "what buyers search this week" lookup behind GET /api/seo/searches."""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services import tag_autocomplete  # noqa: E402


def _db(doc=None):
    collection = MagicMock()
    collection.find_one = AsyncMock(return_value=doc)
    collection.update_one = AsyncMock()
    return {tag_autocomplete.AUTOCOMPLETE_CACHE_COLLECTION: collection}, collection


def _ago(**delta):
    return (datetime.now(timezone.utc) - timedelta(**delta)).isoformat()


def _never_fetch(prefix):
    raise AssertionError(f"should not fetch {prefix!r}")


def test_phrases_are_normalized():
    assert tag_autocomplete.normalize_search_phrase("  Drake   Type Beat ") == "drake type beat"
    assert tag_autocomplete.normalize_search_phrase("Tyler, the Creator".replace(",", "")) == "tyler the creator"
    assert tag_autocomplete.normalize_search_phrase("A$AP".replace("$", "s")) == "asap"
    assert tag_autocomplete.normalize_search_phrase("r&b type beat") == "r&b type beat"
    assert tag_autocomplete.normalize_search_phrase("lil uzi vert's 2026 type-beat.") == "lil uzi vert's 2026 type-beat."


def test_bad_phrases_are_rejected():
    for bad in ["", "a", " a ", "x" * 61, "drake?", "<script>", "drake/type", "日本", "---", 123, None]:
        assert tag_autocomplete.normalize_search_phrase(bad) is None, bad
    # Any whitespace collapses to one space.
    assert tag_autocomplete.normalize_search_phrase("drake\ntype") == "drake type"


def test_fresh_cache_is_returned_without_fetching():
    db, collection = _db({"prefix": "drake type beat", "suggestions": ["Drake Type Beat", "drake type beat 2026"] + [f"s{i}" for i in range(12)], "fetched_at": _ago(days=2)})
    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "Drake Type Beat", fetcher=_never_fetch))
    assert result["query"] == "drake type beat"
    assert result["suggestions"][:2] == ["drake type beat", "drake type beat 2026"]
    assert len(result["suggestions"]) == 10
    assert result["cached"] is True
    collection.update_one.assert_not_called()


def test_missing_cache_fetches_once_and_stores():
    db, collection = _db(None)
    calls = []

    def fetcher(prefix):
        calls.append(prefix)
        return ["drake type beat", "drake type beat 2026"]

    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "drake type beat", fetcher=fetcher))
    assert calls == ["drake type beat"]
    assert result["suggestions"] == ["drake type beat", "drake type beat 2026"]
    assert result["updated_at"]
    collection.update_one.assert_awaited_once()


def test_stale_cache_is_kept_when_the_fetch_fails():
    stale = {"prefix": "drake type beat", "suggestions": ["drake type beat"], "fetched_at": _ago(days=30)}
    db, collection = _db(stale)
    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "drake type beat", fetcher=lambda p: None))
    assert result["suggestions"] == ["drake type beat"]
    assert result["updated_at"] == stale["fetched_at"]
    collection.update_one.assert_not_called()


def test_upstream_failure_without_cache_is_an_empty_list():
    db, _ = _db(None)

    def boom(prefix):
        raise RuntimeError("blocked")

    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "drake type beat", fetcher=boom))
    assert result["suggestions"] == [] and result["updated_at"] is None


def test_no_fetch_when_the_daily_budget_is_spent():
    db, _ = _db(None)

    async def spent():
        return False

    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "drake type beat", fetcher=_never_fetch, may_fetch=spent))
    assert result["suggestions"] == []


def test_cache_read_failure_still_answers():
    db, collection = _db(None)
    collection.find_one = AsyncMock(side_effect=RuntimeError("mongo down"))
    result = asyncio.run(tag_autocomplete.cached_suggestions(db, "drake type beat", fetcher=lambda p: ["drake type beat"]))
    assert result["suggestions"] == ["drake type beat"]
