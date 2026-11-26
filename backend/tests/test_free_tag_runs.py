"""The free (no-account) tag generator: a few runs per visitor per day, inside the site-wide cap."""
import asyncio
import os
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

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException  # noqa: E402

from backend import server  # noqa: E402
from backend.services import free_tag_runs  # noqa: E402

NOON_PT = datetime(2026, 11, 25, 20, 0, tzinfo=timezone.utc)
DAY = free_tag_runs.quota_day(NOON_PT)
KEYS = ["ip:aaa", "visitor:bbb"]


class _Cursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=None):
        return list(self.docs)


class _FakeUses:
    """Enough of the free_tag_uses collection: counter docs with conditional updates."""

    def __init__(self, fail_on=None, old_docs=None):
        self.docs = {}
        self.fail_on = fail_on or set()
        for doc in old_docs or []:  # docs from the one-run-ever days
            self.docs[doc["key"]] = dict(doc)

    def find(self, query, projection=None):
        keys = query["key"]["$in"]
        return _Cursor([dict(self.docs[k]) for k in keys if k in self.docs])

    async def update_one(self, query, update, upsert=False):
        key = query["key"]
        if key in self.fail_on and "$inc" in update:
            raise RuntimeError("db down")
        doc = self.docs.get(key)
        if doc is None:
            if upsert and "$setOnInsert" in update:
                self.docs[key] = dict(update["$setOnInsert"])
            return SimpleNamespace(modified_count=0)
        if "$setOnInsert" in update and "$inc" not in update:
            return SimpleNamespace(modified_count=0)
        cond = query.get("count") or {}
        count = doc.get("count", 0)
        if "$lte" in cond and count > cond["$lte"]:
            return SimpleNamespace(modified_count=0)
        if "$gte" in cond and count < cond["$gte"]:
            return SimpleNamespace(modified_count=0)
        doc["count"] = count + update["$inc"]["count"]
        return SimpleNamespace(modified_count=1)


def _db(**kwargs):
    uses = _FakeUses(**kwargs)
    return {free_tag_runs.COLLECTION: uses}, uses


def _count(uses, key):
    return (uses.docs.get(key) or {}).get("count", 0)


def _reserve(db, keys=KEYS, now=NOON_PT, per_day=3, site_cap=150):
    return free_tag_runs.try_reserve_run(db, keys, now, per_day=per_day, site_cap=site_cap)


# ---- the counters -------------------------------------------------------------------------------


def test_three_runs_a_day_then_used_up():
    db, uses = _db()

    async def run():
        return [(await _reserve(db))[0] for _ in range(4)]

    assert asyncio.run(run()) == ["reserved"] * 3 + ["used_up"]
    assert _count(uses, f"ip:aaa:{DAY}") == 3
    assert _count(uses, f"visitor:bbb:{DAY}") == 3
    assert _count(uses, f"site:{DAY}") == 3
    assert asyncio.run(free_tag_runs.runs_used_today(db, KEYS, NOON_PT)) == 3


def test_runs_come_back_on_the_next_pacific_day():
    db, _ = _db()
    tomorrow = NOON_PT + timedelta(days=1)

    async def run():
        for _ in range(3):
            await _reserve(db)
        today = (await _reserve(db))[0]
        result, day = await _reserve(db, now=tomorrow)
        return today, result, day

    today, result, day = asyncio.run(run())
    assert (today, result) == ("used_up", "reserved")
    assert day == "2026-11-26"


def test_clearing_storage_does_not_reset_the_count():
    """A new visitor id from the same address still sees the address's count, and the reverse."""
    db, uses = _db()

    async def run():
        for _ in range(3):
            await _reserve(db)
        new_id_same_ip = (await _reserve(db, keys=["ip:aaa", "visitor:new"]))[0]
        same_id_new_ip = (await _reserve(db, keys=["ip:new", "visitor:bbb"]))[0]
        return new_id_same_ip, same_id_new_ip

    assert asyncio.run(run()) == ("used_up", "used_up")
    # A refused run gives back what it took.
    assert _count(uses, f"visitor:new:{DAY}") == 0
    assert _count(uses, f"ip:new:{DAY}") == 0
    assert _count(uses, f"site:{DAY}") == 3


def test_concurrent_tabs_never_pass_the_daily_runs():
    db, uses = _db()

    async def run():
        return await asyncio.gather(*[_reserve(db) for _ in range(10)])

    results = [r for r, _ in asyncio.run(run())]
    assert results.count("reserved") == 3
    assert _count(uses, f"ip:aaa:{DAY}") == 3


def test_site_cap_refuses_and_gives_the_visitor_counts_back():
    db, uses = _db()

    async def run():
        first = (await _reserve(db, keys=["ip:1", "visitor:1"], site_cap=1))[0]
        second = (await _reserve(db, keys=["ip:2", "visitor:2"], site_cap=1))[0]
        return first, second

    assert asyncio.run(run()) == ("reserved", "busy")
    assert _count(uses, f"ip:2:{DAY}") == 0
    assert _count(uses, f"visitor:2:{DAY}") == 0
    assert _count(uses, f"site:{DAY}") == 1


def test_release_gives_a_failed_run_back_and_never_goes_below_zero():
    db, uses = _db()

    async def run():
        for _ in range(3):
            await _reserve(db)
        await free_tag_runs.release_run(db, KEYS, DAY)
        again = (await _reserve(db))[0]
        for _ in range(6):
            await free_tag_runs.release_run(db, KEYS, DAY)
        return again

    assert asyncio.run(run()) == "reserved"
    assert _count(uses, f"ip:aaa:{DAY}") == 0
    assert _count(uses, f"site:{DAY}") == 0


def test_database_error_refuses_the_run_and_gives_counts_back():
    db, uses = _db(fail_on={f"site:{DAY}"})
    assert asyncio.run(_reserve(db))[0] == "error"
    assert _count(uses, f"ip:aaa:{DAY}") == 0
    assert _count(uses, f"visitor:bbb:{DAY}") == 0


def test_old_one_run_ever_docs_do_not_block_the_new_counts():
    old = [{"key": "ip:aaa", "kind": "ip", "created_at": "2026-10-01T00:00:00+00:00"},
           {"key": "visitor:bbb", "kind": "visitor", "created_at": "2026-10-01T00:00:00+00:00"}]
    db, uses = _db(old_docs=old)
    assert asyncio.run(_reserve(db))[0] == "reserved"
    assert "count" not in uses.docs["ip:aaa"]  # left untouched
    new_doc = uses.docs[f"ip:aaa:{DAY}"]
    assert new_doc["kind"] == "ip" and isinstance(new_doc["expires_at"], datetime)


# ---- the endpoints -----------------------------------------------------------------------------


def _request(ip="203.0.113.7"):
    return SimpleNamespace(client=SimpleNamespace(host=ip), headers={})


def _body(visitor="visitor_123456"):
    return server.FreeTagRequest(query="drake type beat", visitor_id=visitor)


def _result():
    return SimpleNamespace(query="drake type beat", tags=["drake type beat"], scored_tags=[])


def _patched(db, generate=None):
    return (
        patch.object(server, "db", db),
        patch.object(server, "_check_rate_limit_persistent", AsyncMock()),
        patch.object(server, "generate_tags", generate or AsyncMock(return_value=_result())),
        patch.object(server, "FREE_TAG_RUNS_PER_DAY", 3),
    )


def _run_with(db, coro_factory, generate=None):
    a, b, c, d = _patched(db, generate)
    with a, b, c as gen, d:
        return asyncio.run(coro_factory()), gen


def test_status_reports_runs_left_and_keeps_used():
    db, _ = _db()
    status, _ = _run_with(db, lambda: server.free_tag_status(_request(), visitor_id="visitor_123456"))
    assert status["used"] is False
    assert status["runs_left"] == 3 and status["runs_per_day"] == 3
    assert datetime.fromisoformat(status["resets_at"]) > datetime.now(timezone.utc)

    async def three_runs():
        outs = [await server.free_tag_generate(_body(), _request()) for _ in range(3)]
        return outs, await server.free_tag_status(_request(), visitor_id="visitor_123456")

    (outs, status), gen = _run_with(db, three_runs)
    assert [o["runs_left"] for o in outs] == [2, 1, 0]
    assert outs[0]["tags"] == ["drake type beat"] and outs[0]["runs_per_day"] == 3
    assert gen.await_args.kwargs["current_user"]["_guest"] is True
    assert status["used"] is True and status["runs_left"] == 0


def test_status_without_visitor_id_uses_the_address_only():
    db, _ = _db()

    async def run():
        await server.free_tag_generate(_body(), _request())
        return await server.free_tag_status(_request(), visitor_id="")

    status, _ = _run_with(db, run)
    assert status["runs_left"] == 2


def test_used_up_error_says_come_back_tomorrow_or_sign_up():
    db, _ = _db()

    async def run():
        for _ in range(3):
            await server.free_tag_generate(_body(), _request())
        try:
            await server.free_tag_generate(_body("another_visitor_id"), _request())
        except HTTPException as exc:
            return exc
        return None

    err, gen = _run_with(db, run)
    assert err is not None and err.status_code == 402
    assert err.detail["code"] == "free_tags_used"
    assert "tomorrow" in err.detail["message"] and "sign up" in err.detail["message"].lower()
    assert err.detail["runs_left"] == 0 and err.detail["runs_per_day"] == 3
    assert gen.await_count == 3


def test_a_failed_free_run_does_not_count():
    db, uses = _db()
    boom = AsyncMock(side_effect=HTTPException(status_code=500, detail="x"))

    async def run():
        try:
            await server.free_tag_generate(_body(), _request())
        except HTTPException as exc:
            return exc

    err, _ = _run_with(db, run, generate=boom)
    assert err.status_code == 500
    assert all(doc.get("count", 0) == 0 for doc in uses.docs.values())


def test_the_free_page_stops_at_the_site_wide_daily_cap():
    db, uses = _db()
    day = free_tag_runs.quota_day()
    uses.docs[f"site:{day}"] = {"key": f"site:{day}", "count": server.FREE_TAG_DAILY_CAP}

    async def run():
        try:
            await server.free_tag_generate(_body(), _request())
        except HTTPException as exc:
            return exc

    err, gen = _run_with(db, run)
    assert err.status_code == 429 and err.detail["code"] == "free_tags_busy"
    gen.assert_not_awaited()


def test_database_trouble_refuses_the_free_run():
    db, _ = _db()
    with patch.object(free_tag_runs, "try_reserve_run", AsyncMock(return_value=("error", DAY))):
        async def run():
            try:
                await server.free_tag_generate(_body(), _request())
            except HTTPException as exc:
                return exc

        err, gen = _run_with(db, run)
    assert err.status_code == 503
    gen.assert_not_awaited()


def test_next_reset_is_midnight_pacific():
    assert server._next_pacific_midnight_iso(NOON_PT) == "2026-11-26T08:00:00+00:00"
    # Summer time: midnight Pacific is 07:00 UTC.
    assert server._next_pacific_midnight_iso(datetime(2026, 7, 1, 20, 0, tzinfo=timezone.utc)) == "2026-07-02T07:00:00+00:00"
