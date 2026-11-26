"""Trending type beat artists (GET /api/seo/trending): snapshots of autocomplete demand, compared
week over week, served from storage and refreshed in the background."""
import asyncio
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_123456")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRATION_MINUTES", "60")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_123")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test_client_id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test_client_secret")
os.environ.setdefault("DB_NAME", "test_db")

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(REPO)
sys.path.append(os.path.join(REPO, "backend"))

from backend import server  # noqa: E402
from backend.services import seo_trending, tag_autocomplete  # noqa: E402
from backend.services.trending_artists import TRENDING_ARTISTS, type_beat_query  # noqa: E402

NOW = datetime(2026, 11, 26, 18, 0, tzinfo=timezone.utc)


# ---- a small in-memory Mongo --------------------------------------------------------------------


def _get(doc, field):
    return doc.get(field)


def _matches(doc, query):
    for field, cond in query.items():
        value = _get(doc, field)
        if isinstance(cond, dict):
            for op, arg in cond.items():
                if op == "$in" and value not in arg:
                    return False
                if op == "$gte" and (value is None or value < arg):
                    return False
                if op == "$lte" and (value is None or value > arg):
                    return False
                if op == "$lt" and (value is None or value >= arg):
                    return False
        elif value != cond:
            return False
    return True


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=None):
        return [dict(d) for d in self.docs][: length or None]


class _Collection:
    def __init__(self):
        self.docs = []

    def find(self, query=None, projection=None):
        return _Cursor([d for d in self.docs if _matches(d, query or {})])

    async def find_one(self, query=None, projection=None, sort=None):
        docs = [d for d in self.docs if _matches(d, query or {})]
        if sort:
            field, direction = sort[0]
            docs.sort(key=lambda d: d.get(field) or "", reverse=direction < 0)
        return dict(docs[0]) if docs else None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query):
                doc.update(update.get("$set", {}))
                return SimpleNamespace(modified_count=1)
        if upsert:
            self.docs.append({**update.get("$setOnInsert", {}), **update.get("$set", {})})
        return SimpleNamespace(modified_count=0)

    async def delete_many(self, query):
        self.docs = [d for d in self.docs if not _matches(d, query)]


class _DB:
    def __init__(self):
        self.collections = {}

    def __getitem__(self, name):
        return self.collections.setdefault(name, _Collection())

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]


# ---- a fake YouTube autocomplete ----------------------------------------------------------------

BOOSTED = {"ken carson", "yeat"}  # suggested "<artist> type beat" after one more word


def _fake_autocomplete(calls=None, boosted=BOOSTED):
    def fetch(prefix):
        if calls is not None:
            calls.append(prefix)
        if prefix.endswith(" type beat"):
            artist = prefix[: -len(" type beat")]
            variants = 8 if artist in boosted else 2
            return [prefix] + [f"{prefix} v{i}" for i in range(variants)]
        if prefix.endswith(" type"):
            return [f"{prefix} beat"]
        if prefix in boosted:
            return [prefix, f"{prefix} type beat"]
        return [prefix]

    return fetch


def _snapshot(db, **kwargs):
    kwargs.setdefault("fetcher", _fake_autocomplete())
    kwargs.setdefault("fetch_budget", 2000)
    return asyncio.run(seo_trending.compute_snapshot(db, kwargs.pop("now", NOW), **kwargs))


def _by_slug(payload):
    return {row["slug"]: row for row in payload["artists"]}


# ---- the artist list ----------------------------------------------------------------------------


def test_artist_slugs_match_the_frontend_tag_pages():
    slugs = [slug for slug, _ in TRENDING_ARTISTS]
    assert len(slugs) == len(set(slugs)) >= 100
    path = os.path.join(REPO, "frontend", "src", "lib", "seoModel.js")
    if not os.path.exists(path):
        return
    text = open(path, encoding="utf-8").read()
    block = text[text.index("export const ARTISTS"): text.index("export const STYLES")]
    frontend = set(re.findall(r'^\s*"?([a-z0-9-]+)"?: \{ name:', block, re.M))
    assert set(slugs) <= frontend, sorted(set(slugs) - frontend)


def test_queries_are_what_people_type():
    names = dict(TRENDING_ARTISTS)
    assert type_beat_query("j-cole", names["j-cole"]) == "j cole type beat"
    assert type_beat_query("asap-rocky", names["asap-rocky"]) == "asap rocky type beat"
    assert type_beat_query("suicideboys", names["suicideboys"]) == "suicideboys type beat"
    for slug, name in TRENDING_ARTISTS:
        assert tag_autocomplete.normalize_search_phrase(type_beat_query(slug, name)) == type_beat_query(slug, name)


# ---- scoring and ranking ------------------------------------------------------------------------


def test_first_week_ranks_by_current_demand_with_no_change():
    db = _DB()
    doc = _snapshot(db)
    payload = doc["payload"]
    assert payload["ranked_by"] == "demand" and payload["compared_to"] is None
    assert payload["window_days"] == 7 and payload["updated_at"] == NOW.isoformat()
    assert len(payload["artists"]) == 30
    top = [row["slug"] for row in payload["artists"][:2]]
    assert set(top) == {"ken-carson", "yeat"}
    row = payload["artists"][0]
    assert set(row) == {"name", "slug", "query", "score", "change", "searches", "producer_runs", "producer_runs_prev"}
    assert all(r["change"] is None and r["searches"] is None for r in payload["artists"])
    scores = [r["score"] for r in payload["artists"]]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)
    # Stored for next week's comparison.
    assert len(db[seo_trending.SNAPSHOT_COLLECTION].docs) == 1
    assert doc["artists"]["drake"]["score"] is not None


def test_a_week_later_ranks_by_change():
    db = _DB()
    _snapshot(db, now=NOW - timedelta(days=7))
    # A week on, the cached suggestions have gone stale and are looked up again: this week Drake
    # starts being suggested early and Ken Carson drops back.
    db.collections.pop(tag_autocomplete.AUTOCOMPLETE_CACHE_COLLECTION)
    later = _snapshot(db, now=NOW, fetcher=_fake_autocomplete(boosted={"drake", "yeat"}))
    payload = later["payload"]
    rows = _by_slug(payload)
    assert payload["ranked_by"] == "change"
    assert payload["compared_to"] == (NOW - timedelta(days=7)).isoformat()
    assert payload["artists"][0]["slug"] == "drake" and rows["drake"]["change"] > 0
    assert rows["yeat"]["change"] == 0
    assert all(r["change"] is not None for r in payload["artists"])
    changes = [r["change"] for r in payload["artists"]]
    assert changes == sorted(changes, reverse=True)
    assert "ken-carson" not in rows or rows["ken-carson"]["change"] < 0


def test_a_snapshot_from_yesterday_is_not_a_week_ago():
    db = _DB()
    _snapshot(db, now=NOW - timedelta(days=1))
    assert _snapshot(db, now=NOW)["payload"]["ranked_by"] == "demand"


def test_artists_without_autocomplete_data_are_left_out_not_guessed():
    db = _DB()
    payload = _snapshot(db, fetcher=lambda prefix: None)["payload"]
    assert payload["artists"] == []


def test_fetch_budget_is_respected_and_fresh_cache_is_reused():
    db = _DB()
    calls = []
    doc = _snapshot(db, fetcher=_fake_autocomplete(calls), fetch_budget=12)
    assert len(calls) <= 12
    scored = [slug for slug, a in doc["artists"].items() if a["score"] is not None]
    assert 0 < len(scored) < len(TRENDING_ARTISTS)  # the rest wait for the next refresh

    calls.clear()
    _snapshot(db, fetcher=_fake_autocomplete(calls), fetch_budget=2000)
    full = len(calls)
    calls.clear()
    doc = _snapshot(db, fetcher=_fake_autocomplete(calls), fetch_budget=2000)
    assert full > 0 and calls == []  # everything now comes from the shared cache
    assert all(a["score"] is not None for a in doc["artists"].values())


def test_producer_runs_count_this_week_and_last_week():
    db = _DB()
    gens = db.tag_generations
    for days, query in [
        (1, "Ken Carson type beat"),
        (2, "ken carson x destroy lonely type beat"),
        (3, "kencarsontype beat"),  # not the artist as whole words
        (9, "Ken Carson Type Beat"),
        (20, "ken carson type beat"),  # older than two weeks
        (1, "ken carson"),  # not a type beat query
        (1, "A$AP Rocky type beat"),
    ]:
        gens.docs.append({"query": query, "created_at": (NOW - timedelta(days=days)).isoformat()})
    doc = _snapshot(db)
    assert (doc["artists"]["ken-carson"]["runs"], doc["artists"]["ken-carson"]["runs_prev"]) == (2, 1)
    assert doc["artists"]["destroy-lonely"]["runs"] == 1
    assert doc["artists"]["asap-rocky"]["runs"] == 1
    row = _by_slug(doc["payload"])["ken-carson"]
    assert (row["producer_runs"], row["producer_runs_prev"]) == (2, 1)


def test_old_snapshots_are_dropped():
    db = _DB()
    db[seo_trending.SNAPSHOT_COLLECTION].docs.append({"computed_at": (NOW - timedelta(days=90)).isoformat(), "artists": {}})
    _snapshot(db)
    assert [d["computed_at"] for d in db[seo_trending.SNAPSHOT_COLLECTION].docs] == [NOW.isoformat()]


# ---- serving ------------------------------------------------------------------------------------


def test_refresh_only_when_stale():
    seo_trending._reset_for_tests()
    db = _DB()
    calls = []
    kwargs = dict(fetcher=_fake_autocomplete(calls), fetch_budget=2000)
    assert asyncio.run(seo_trending.refresh_if_stale(db, NOW, **kwargs)) is True
    assert asyncio.run(seo_trending.refresh_if_stale(db, NOW + timedelta(hours=1), **kwargs)) is False
    assert asyncio.run(seo_trending.refresh_if_stale(db, NOW + timedelta(hours=13), **kwargs)) is True
    assert len(db[seo_trending.SNAPSHOT_COLLECTION].docs) == 2


def test_serving_never_fetches_and_nudges_a_background_refresh():
    seo_trending._reset_for_tests()
    db = _DB()

    async def run():
        with patch.object(seo_trending, "schedule_refresh") as nudge:
            empty = await seo_trending.current_payload(db, NOW)
        return empty, nudge

    empty, nudge = asyncio.run(run())
    assert empty == seo_trending.empty_payload()
    nudge.assert_called_once()

    stored = _snapshot(db)
    seo_trending._reset_for_tests()

    async def run_fresh():
        with patch.object(seo_trending, "schedule_refresh") as nudge:
            payload = await seo_trending.current_payload(db, NOW + timedelta(hours=1))
        return payload, nudge

    payload, nudge = asyncio.run(run_fresh())
    assert payload == stored["payload"]
    nudge.assert_not_called()


def test_endpoint_returns_the_stored_payload_with_cache_headers():
    seo_trending._reset_for_tests()
    payload = {"updated_at": NOW.isoformat(), "window_days": 7, "ranked_by": "demand", "compared_to": None,
               "artists": [{"name": "Ken Carson", "slug": "ken-carson", "query": "ken carson type beat", "score": 80.0,
                            "change": None, "searches": None, "producer_runs": 0, "producer_runs_prev": 0}]}
    request = SimpleNamespace(client=SimpleNamespace(host="203.0.113.7"), headers={})
    response = SimpleNamespace(headers={})
    limiter = AsyncMock()
    with patch.object(server, "_check_rate_limit_persistent", limiter), \
         patch.object(seo_trending, "current_payload", AsyncMock(return_value=payload)):
        out = asyncio.run(server.seo_trending(request, response))
    assert out == payload
    assert response.headers["Cache-Control"] == "public, max-age=1800"
    assert limiter.await_args.args[0].startswith("seo-trending:")

    response = SimpleNamespace(headers={})
    with patch.object(server, "_check_rate_limit_persistent", AsyncMock()), \
         patch.object(seo_trending, "current_payload", AsyncMock(side_effect=RuntimeError("db down"))):
        out = asyncio.run(server.seo_trending(request, response))
    assert out["artists"] == [] and response.headers["Cache-Control"] == "no-store"
