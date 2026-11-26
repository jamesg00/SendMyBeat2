"""Security watchdog: flags requests that look like attacks and blocks addresses the admin picks.

What it flags (each one becomes an event the admin dashboard lists):
- Payloads in the path, query string, small JSON/form bodies or the User-Agent that look like
  SQL injection, NoSQL operator injection, script injection (XSS), path traversal or shell
  command injection (including Log4Shell-style "${jndi:" strings).
- Probing for files and apps this server doesn't have (.env, .git, wp-login.php, phpMyAdmin ...).
- Known attack tools by User-Agent (sqlmap, nikto, nuclei ...).
- Behaviour: repeated failed logins from one address, bursts of 401/403 answers, non-admins
  calling /api/admin, requests that hit rate limits (429) and request floods.

It only flags. Blocking is the admin's call: the dashboard puts an address or range on the
blocklist, and from then on the middleware answers that address with 403 before the app runs.

Keeping it cheap: the request path never touches the database. Detection is a few precompiled
regexes on short strings, flagged events are folded into an in-memory batch, and a background loop
writes the batch to Mongo every few seconds and reloads the blocklist. The server runs a single
worker (see the Dockerfile), so the in-memory blocklist is the live one; Mongo keeps it across
restarts.

Not locking the admin out:
- A request that carries a valid admin login token is never blocked, whatever its address.
- The block endpoint refuses the admin's own current address, addresses an admin account used
  recently, private/loopback addresses (that's the reverse proxy; blocking it would block
  everyone), addresses in WATCHDOG_ALLOW_IPS and ranges wider than /16 (IPv4) or /48 (IPv6).
- WATCHDOG_BLOCKING_ENABLED=false in backend/.env (then restart) stops enforcing every block,
  and WATCHDOG_ENABLED=false switches the whole watchdog off.

Collections:
- security_events: one doc per (address, rule, method, path), with a hit count, first/last seen
  and the latest sample. Dropped by a TTL index WATCHDOG_KEEP_DAYS after it was last seen.
- security_blocklist: one doc per blocked address or range.
- security_blocked_hours: blocked-request counts per hour, for the 24h total. TTL'd.
- security_watchdog_state: one doc with when the admin last looked and admin addresses.
"""

from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Optional
from urllib.parse import unquote_plus

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool) -> bool:
    raw = (os.environ.get(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.environ.get(name, default)))
    except (TypeError, ValueError):
        return default


EVENTS = "security_events"
BLOCKLIST = "security_blocklist"
BLOCKED_HOURS = "security_blocked_hours"
STATE = "security_watchdog_state"
STATE_ID = "state"

# Rule id -> (label shown on the dashboard, severity)
RULES: dict[str, tuple[str, str]] = {
    "sql_injection": ("SQL injection", "high"),
    "nosql_injection": ("NoSQL injection", "high"),
    "xss": ("Script injection (XSS)", "high"),
    "path_traversal": ("Path traversal", "high"),
    "command_injection": ("Command injection", "high"),
    "brute_force": ("Password guessing", "high"),
    "probe": ("Probing for secret files", "medium"),
    "scanner": ("Attack tool", "medium"),
    "admin_probe": ("Tried admin pages", "medium"),
    "auth_failures": ("Many failed sign-in checks", "medium"),
    "rate_flood": ("Request flood", "medium"),
    "rate_limited": ("Hit rate limits", "low"),
}
SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3}

# ---------------------------------------------------------------------------------------------
# Payload detection
# ---------------------------------------------------------------------------------------------

_I = re.IGNORECASE
PAYLOAD_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("sql_injection", re.compile(
        r"\bunion\b[\s(/*+]+(?:all[\s(/*+]+)?select\b"
        r"|['\"`]\s*(?:or|and)\s+['\"]?(\w+)['\"]?\s*(?:=|like)\s*['\"]?\1\b"
        r"|['\"`]\s*(?:or|and)\s+(?:true|false|null)\b"
        r"|['\"`]\s*(?:or|and)\s+\d+\s*[=<>]"
        r"|;\s*(?:drop|truncate|alter|delete|insert|update|create)\s+(?:table|database|from|into|\w+\s+set)\b"
        r"|\b(?:sleep|pg_sleep|benchmark)\s*\(\s*\d"
        r"|\bwaitfor\s+delay\s+'"
        r"|\binformation_schema\b|\bsysobjects\b|\bxp_cmdshell\b"
        r"|\bload_file\s*\(|\binto\s+(?:out|dump)file\b"
        r"|['\"]\s*;?\s*--\s*$|'\s*#\s*$"
        r"|\bselect\b.{1,80}\bfrom\b.{1,80}\bwhere\b.{0,40}\b\d+\s*=\s*\d+",
        _I,
    )),
    ("nosql_injection", re.compile(
        r"\[\s*\$(?:ne|gt|gte|lt|lte|regex|where|exists|in|nin|or|and|expr)\s*\]"
        r"|[\"']\$(?:where|ne|gt|gte|lt|regex|expr|function|accumulator)[\"']\s*:"
        r"|\$where\b",
        _I,
    )),
    ("xss", re.compile(
        r"<\s*/?\s*(?:script|iframe|object|embed|svg|img|body|math|base|meta|link|frameset)\b[^>]*"
        r"(?:>|\bon\w+\s*=|\bsrc\s*=)"
        r"|<\s*script\b"
        r"|\bjavascript\s*:"
        r"|\bvbscript\s*:"
        r"|\bon(?:error|load|mouseover|focus|click|toggle|animationstart|pointerover)\s*=\s*['\"]?[\w(]"
        r"|\bdocument\s*\.\s*(?:cookie|domain|write)\b"
        r"|\beval\s*\(\s*(?:atob|string\.fromcharcode|unescape)\b"
        r"|\balert\s*\(\s*(?:document|1|'xss'|\"xss\")",
        _I,
    )),
    ("path_traversal", re.compile(
        r"(?:^|[/\\=\s'\"])\.\.[/\\]"
        r"|/etc/(?:passwd|shadow|hosts|group)\b"
        r"|\bwin\.ini\b|\bboot\.ini\b"
        r"|/proc/self/"
        r"|%00|\x00",
        _I,
    )),
    ("command_injection", re.compile(
        r"\$\{\s*jndi\s*:"
        r"|\$\{\s*(?:env|sys|java|lower|upper|::-)[:}]"
        r"|(?:^|[;&|`]|\$\()\s*(?:cat|wget|curl|nc|ncat|bash|sh|zsh|python3?|perl|php|powershell|whoami|uname|id|ping|nslookup|rm)\s+(?:-|/|https?:|\$|[a-z0-9.]+\.(?:sh|py|pl)\b)"
        r"|\$\(\s*(?:whoami|id|uname|curl|wget|cat|sleep)\b"
        r"|`\s*(?:whoami|id|uname|curl|wget|cat|sleep)\b",
        _I,
    )),
]

PROBE_PATH = re.compile(
    r"/\.(?:env|git|svn|hg|aws|ssh|docker|htaccess|htpasswd|ds_store|vscode|idea|npmrc|bash_history)\b"
    r"|\.env(?:\.\w+)?$"
    r"|/wp-(?:login|admin|content|includes|config|json)\b|/xmlrpc\.php"
    r"|\.(?:php\d?|phtml|asp|aspx|jsp|cgi|pl)$|\.php\d?/"
    r"|/(?:phpmyadmin|pma|myadmin|adminer|mysql|sqladmin|dbadmin)\b"
    r"|/(?:cgi-bin|actuator|server-status|server-info|solr|jmx-console|manager/html|hnap1|boaform|owa|autodiscover|telescope|_ignition|vendor/phpunit|setup\.cgi)\b"
    r"|/config\.(?:json|ya?ml|php|js)$|/(?:credentials|secrets?)(?:\.\w+)?$"
    r"|\.(?:sql|bak|old|swp|backup|tar|tgz|zip|rar|7z|pem|key)$"
    r"|/(?:id_rsa|id_dsa|web\.config|composer\.(?:json|lock)|package\.json|docker-compose\.ya?ml|dockerfile)$",
    _I,
)

SCANNER_UA = re.compile(
    r"sqlmap|nikto|nmap|masscan|acunetix|nuclei|wpscan|dirbuster|dirb/|gobuster|ffuf|feroxbuster|"
    r"zgrab|hydra|nessus|openvas|w3af|havij|jaeles|whatweb|netsparker|appscan|burpcollaborator|"
    r"commix|xsstrike|arachni|skipfish|wfuzz|zmeu|morfeus|fimap|joomscan|droopescan",
    _I,
)

# Body keys never scanned or stored (a password that happens to contain "<script" is not an attack
# signal, and it must never land in the event log).
SENSITIVE_KEYS = re.compile(r"pass(word)?|secret|token|card|cvc|cvv|otp|code_verifier|authorization", _I)

MAX_SCAN_CHARS = 4000
MAX_BODY_BYTES = 64 * 1024
SAMPLE_CHARS = 240


def _decode(text: str) -> str:
    """URL-decode up to twice (attackers double-encode), lower nothing: patterns are case-insensitive."""
    out = text
    for _ in range(2):
        try:
            decoded = unquote_plus(out)
        except Exception:
            break
        if decoded == out:
            break
        out = decoded
    return out


def _snippet(text: str, match: re.Match) -> str:
    start = max(0, match.start() - 60)
    end = min(len(text), match.end() + 60)
    piece = text[start:end]
    if start > 0:
        piece = "…" + piece
    if end < len(text):
        piece = piece + "…"
    return piece[:SAMPLE_CHARS]


def scan_text(text: str) -> Optional[tuple[str, str]]:
    """Return (rule, sample) for the first payload rule that matches, else None."""
    if not text:
        return None
    text = text[:MAX_SCAN_CHARS]
    for rule, pattern in PAYLOAD_PATTERNS:
        match = pattern.search(text)
        if match:
            return rule, _snippet(text, match)
    return None


def _walk_json(value: Any, keys_out: list[str], strings_out: list[str], depth: int = 0) -> None:
    if depth > 8 or len(strings_out) > 400:
        return
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key)
            keys_out.append(key_text)
            if SENSITIVE_KEYS.search(key_text):
                continue
            _walk_json(item, keys_out, strings_out, depth + 1)
    elif isinstance(value, list):
        for item in value[:200]:
            _walk_json(item, keys_out, strings_out, depth + 1)
    elif isinstance(value, str):
        strings_out.append(value)


def scan_body(body: bytes, content_type: str) -> Optional[tuple[str, str]]:
    """Scan a small JSON or form body. Sensitive fields (passwords, tokens, cards) are skipped."""
    if not body:
        return None
    text = body[:MAX_BODY_BYTES].decode("utf-8", errors="replace")
    keys: list[str] = []
    strings: list[str] = []
    if "json" in content_type:
        try:
            parsed = json.loads(text)
        except ValueError:
            return scan_text(text)
        _walk_json(parsed, keys, strings)
        for key in keys:
            if key.startswith("$"):
                return "nosql_injection", f'"{key[:60]}": …'
        for value in strings:
            hit = scan_text(value)
            if hit:
                return hit
        return None
    # application/x-www-form-urlencoded
    for pair in text.split("&")[:200]:
        name, _, raw_value = pair.partition("=")
        name = _decode(name)
        if SENSITIVE_KEYS.search(name):
            continue
        hit = scan_text(f"{name}={_decode(raw_value)}")
        if hit:
            return hit
    return None


def scan_request(path: str, query: str, user_agent: str) -> Optional[tuple[str, str, str]]:
    """Return (rule, location, sample) for the request line and User-Agent, else None."""
    raw_path = path or "/"
    decoded_path = _decode(raw_path)
    hit = scan_text(decoded_path)
    if hit:
        return hit[0], "path", hit[1]
    if query:
        hit = scan_text(_decode(query))
        if hit:
            return hit[0], "query", hit[1]
    probe = PROBE_PATH.search(decoded_path)
    if probe and not decoded_path.startswith("/api/"):
        return "probe", "path", decoded_path[:SAMPLE_CHARS]
    if probe and decoded_path.startswith("/api/") and re.search(r"/\.(?:env|git|aws|ssh)\b|\.php\d?$|/wp-", decoded_path, _I):
        return "probe", "path", decoded_path[:SAMPLE_CHARS]
    if user_agent:
        if SCANNER_UA.search(user_agent):
            return "scanner", "header", user_agent[:SAMPLE_CHARS]
        hit = scan_text(user_agent)
        if hit:
            return hit[0], "header", hit[1]
    return None


# ---------------------------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------------------------


def client_ip_from(peer: str, headers: dict[str, str]) -> str:
    """Same rule as server._client_ip: forwarding headers only count when the connection comes
    from our reverse proxy (private/loopback peer), and then only the rightmost hop."""
    try:
        addr = ipaddress.ip_address(peer)
        from_proxy = addr.is_private or addr.is_loopback
    except ValueError:
        from_proxy = False
    if from_proxy:
        hops = [h.strip() for h in headers.get("x-forwarded-for", "").split(",") if h.strip()]
        if hops:
            return hops[-1]
        real_ip = headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip
    return peer or "unknown"


def parse_target(value: str) -> ipaddress._BaseNetwork:
    """An address or CIDR range as a network. Raises ValueError with a plain message."""
    text = str(value or "").strip()
    if not text:
        raise ValueError("Enter an address to block.")
    try:
        return ipaddress.ip_network(text, strict=False)
    except ValueError:
        raise ValueError(f"{text[:60]} isn't a valid address or range.")


def network_label(network: ipaddress._BaseNetwork) -> str:
    """1.2.3.4 for a single address, 1.2.3.0/24 for a range."""
    if network.num_addresses == 1:
        return str(network.network_address)
    return str(network)


def _parse_allowlist(raw: str) -> list[ipaddress._BaseNetwork]:
    out = []
    for item in (raw or "").split(","):
        item = item.strip()
        if not item:
            continue
        try:
            out.append(ipaddress.ip_network(item, strict=False))
        except ValueError:
            logger.warning("WATCHDOG_ALLOW_IPS: ignoring %s", item)
    return out


def _addr(ip: str) -> Optional[ipaddress._BaseAddress]:
    try:
        return ipaddress.ip_address(ip)
    except ValueError:
        return None


# ---------------------------------------------------------------------------------------------
# The watchdog
# ---------------------------------------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


class Watchdog:
    FLUSH_SECONDS = 3
    BLOCKLIST_RELOAD_SECONDS = 30
    MAX_PENDING = 5000

    def __init__(
        self,
        *,
        is_admin_token: Optional[Callable[[str], bool]] = None,
        identify_token: Optional[Callable[[str], Optional[tuple[str, str]]]] = None,
    ) -> None:
        self.enabled = _env_flag("WATCHDOG_ENABLED", True)
        self.blocking_enabled = _env_flag("WATCHDOG_BLOCKING_ENABLED", True)
        self.allowlist = _parse_allowlist(os.environ.get("WATCHDOG_ALLOW_IPS", ""))
        self.flood_per_minute = _env_int("WATCHDOG_FLOOD_PER_MINUTE", 600)
        self.login_fail_limit = _env_int("WATCHDOG_LOGIN_FAILS", 8)  # per 10 minutes
        self.auth_fail_limit = _env_int("WATCHDOG_AUTH_FAILS", 30)  # per 5 minutes
        self.keep_days = _env_int("WATCHDOG_KEEP_DAYS", 30)
        self.is_admin_token = is_admin_token or (lambda _token: False)
        self.identify_token = identify_token or (lambda _token: None)

        self.db = None
        self._task: Optional[asyncio.Task] = None
        # Blocklist: exact addresses and ranges -> expires_at (None = forever)
        self._blocked_exact: dict[str, Optional[datetime]] = {}
        self._blocked_ranges: list[tuple[ipaddress._BaseNetwork, Optional[datetime]]] = []
        self._block_hits: dict[str, int] = {}  # blocklist label -> hits not yet saved
        self._block_hit_last: dict[str, datetime] = {}
        self._blocked_since_flush = 0
        # Pending events: key -> doc fields + count
        self._pending: dict[str, dict[str, Any]] = {}
        self.dropped = 0
        # Behaviour windows: (kind, ip) -> [window_start, count, flagged]
        self._windows: dict[tuple[str, str], list] = {}
        self._windows_pruned_at = time.monotonic()

    # ---- lifecycle -------------------------------------------------------------------------

    async def start(self, db) -> None:
        self.db = db
        if self._task is None:
            self._task = asyncio.create_task(self._loop())
        await self.ensure_indexes()
        await self.reload_blocklist()

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None
        try:
            await self.flush()
        except Exception:
            pass

    async def ensure_indexes(self) -> None:
        db = self.db
        if db is None:
            return
        specs = [
            (db[EVENTS], [("key", 1)], {"unique": True}),
            (db[EVENTS], [("last_seen", -1)], {}),
            (db[EVENTS], [("ip", 1), ("last_seen", -1)], {}),
            (db[EVENTS], [("expires_at", 1)], {"expireAfterSeconds": 0}),
            (db[BLOCKLIST], [("ip", 1)], {"unique": True}),
            (db[BLOCKED_HOURS], [("hour", 1)], {"unique": True}),
            (db[BLOCKED_HOURS], [("expires_at", 1)], {"expireAfterSeconds": 0}),
        ]
        for collection, keys, options in specs:
            try:
                await collection.create_index(keys, **options)
            except Exception as exc:
                logger.error("Watchdog: could not create index %s on %s: %s", keys, collection.name, exc)

    async def _loop(self) -> None:
        last_reload = time.monotonic()
        while True:
            await asyncio.sleep(self.FLUSH_SECONDS)
            try:
                await self.flush()
                if time.monotonic() - last_reload >= self.BLOCKLIST_RELOAD_SECONDS:
                    await self.reload_blocklist()
                    last_reload = time.monotonic()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Watchdog flush failed: %s", exc)

    # ---- blocklist ---------------------------------------------------------------------------

    def _set_blocklist(self, rows: list[dict]) -> None:
        exact: dict[str, Optional[datetime]] = {}
        ranges: list[tuple[ipaddress._BaseNetwork, Optional[datetime]]] = []
        now = _now()
        for row in rows:
            expires = row.get("expires_at")
            expires_dt = None
            if expires:
                try:
                    expires_dt = datetime.fromisoformat(str(expires))
                except ValueError:
                    expires_dt = None
                if expires_dt and expires_dt <= now:
                    continue
            try:
                network = ipaddress.ip_network(str(row.get("ip")), strict=False)
            except ValueError:
                continue
            if network.num_addresses == 1:
                exact[str(network.network_address)] = expires_dt
            else:
                ranges.append((network, expires_dt))
        self._blocked_exact = exact
        self._blocked_ranges = ranges

    async def reload_blocklist(self) -> None:
        if self.db is None:
            return
        rows = await self.db[BLOCKLIST].find({}, {"_id": 0, "ip": 1, "expires_at": 1}).to_list(5000)
        self._set_blocklist(rows)

    def blocked_entry(self, ip: str) -> Optional[str]:
        """The blocklist label (address or range) that covers ip, or None."""
        if not self._blocked_exact and not self._blocked_ranges:
            return None
        addr = _addr(ip)
        if addr is not None:
            ip = str(addr)
        now = _now()
        expires = self._blocked_exact.get(ip, False)
        if expires is not False and (expires is None or expires > now):
            return ip
        if self._blocked_ranges:
            if addr is not None:
                for network, expires in self._blocked_ranges:
                    if addr.version == network.version and addr in network and (expires is None or expires > now):
                        return str(network)
        return None

    def is_allowlisted(self, ip: str) -> bool:
        addr = _addr(ip)
        if addr is None:
            return False
        return any(addr.version == n.version and addr in n for n in self.allowlist)

    # ---- recording ---------------------------------------------------------------------------

    def record(
        self,
        rule: str,
        *,
        ip: str,
        method: str,
        path: str,
        query: str = "",
        sample: str = "",
        location: str = "behavior",
        user_agent: str = "",
        token: str = "",
    ) -> None:
        """Fold one flagged request into the pending batch. Never touches the database."""
        label, severity = RULES.get(rule, (rule, "low"))
        safe_path = (path or "/")[:300]
        key = hashlib.sha256(f"{ip}|{rule}|{method}|{safe_path}".encode("utf-8", "replace")).hexdigest()[:32]
        now = _now()
        pending = self._pending.get(key)
        if pending is None:
            if len(self._pending) >= self.MAX_PENDING:
                self.dropped += 1
                return
            user_id = username = None
            if token:
                try:
                    who = self.identify_token(token)
                except Exception:
                    who = None
                if who:
                    user_id, username = who
            pending = {
                "key": key,
                "ip": ip,
                "rule": rule,
                "label": label,
                "severity": severity,
                "method": (method or "")[:10],
                "path": safe_path,
                "count": 0,
                "first_seen": _iso(now),
                "user_id": user_id,
                "username": username,
            }
            self._pending[key] = pending
        pending["count"] += 1
        pending["last_seen"] = _iso(now)
        pending["query"] = (query or "")[:500]
        pending["sample"] = (sample or "")[:SAMPLE_CHARS]
        pending["location"] = location
        pending["user_agent"] = (user_agent or "")[:300]

    def _bump(self, kind: str, ip: str, window_seconds: int, limit: int) -> bool:
        """Count one hit in a fixed window. True the first time the count reaches limit."""
        now = time.monotonic()
        if now - self._windows_pruned_at > 120:
            self._windows = {k: v for k, v in self._windows.items() if now - v[0] < 900}
            self._windows_pruned_at = now
        slot = self._windows.get((kind, ip))
        if slot is None or now - slot[0] >= window_seconds:
            slot = [now, 0, False]
            self._windows[(kind, ip)] = slot
        slot[1] += 1
        if slot[1] >= limit and not slot[2]:
            slot[2] = True
            return True
        return slot[2]  # keep counting onto the same event while the window lasts

    def note_request(self, ip: str, method: str, path: str, user_agent: str) -> None:
        if self._bump("flood", ip, 60, self.flood_per_minute):
            self.record("rate_flood", ip=ip, method=method, path=path,
                        sample=f"{self.flood_per_minute}+ requests in a minute", user_agent=user_agent)

    def note_response(self, status: int, *, ip: str, method: str, path: str, query: str, user_agent: str, token: str) -> None:
        if status not in (401, 403, 429):
            return
        common = dict(ip=ip, method=method, path=path, query=query, user_agent=user_agent, token=token)
        if status == 429:
            self.record("rate_limited", sample="Answered 429 Too Many Requests", **common)
            return
        is_login = method == "POST" and path.rstrip("/") in {"/api/auth/login", "/api/auth/google"}
        if is_login and status == 401:
            if self._bump("login", ip, 600, self.login_fail_limit):
                self.record("brute_force", sample=f"{self.login_fail_limit}+ failed sign-ins in 10 minutes", **common)
            return
        if status == 403 and path.startswith("/api/admin"):
            self.record("admin_probe", sample="Refused: not an admin", **common)
            return
        if self._bump("auth", ip, 300, self.auth_fail_limit):
            self.record("auth_failures", sample=f"{self.auth_fail_limit}+ refused requests in 5 minutes", **common)

    def note_blocked(self, entry: str) -> None:
        self._block_hits[entry] = self._block_hits.get(entry, 0) + 1
        self._block_hit_last[entry] = _now()
        self._blocked_since_flush += 1

    async def flush(self) -> None:
        if self.db is None:
            return
        pending, self._pending = self._pending, {}
        hits, self._block_hits = self._block_hits, {}
        last_hits, self._block_hit_last = self._block_hit_last, {}
        blocked_count, self._blocked_since_flush = self._blocked_since_flush, 0
        keep = timedelta(days=self.keep_days)
        for doc in pending.values():
            count = doc.pop("count")
            first_seen = doc.pop("first_seen")
            last_seen = doc["last_seen"]
            doc["expires_at"] = datetime.fromisoformat(last_seen) + keep
            try:
                await self.db[EVENTS].update_one(
                    {"key": doc["key"]},
                    {
                        "$set": doc,
                        "$inc": {"count": count},
                        "$setOnInsert": {"id": str(uuid.uuid4()), "first_seen": first_seen},
                    },
                    upsert=True,
                )
            except Exception as exc:
                logger.warning("Watchdog: could not save event: %s", exc)
        for entry, count in hits.items():
            last = last_hits.get(entry)
            try:
                await self.db[BLOCKLIST].update_one(
                    {"ip": entry},
                    {"$inc": {"hits": count}, "$set": {"last_hit_at": _iso(last or _now())}},
                )
            except Exception as exc:
                logger.warning("Watchdog: could not save block hits: %s", exc)
        if blocked_count:
            hour = _now().replace(minute=0, second=0, microsecond=0)
            try:
                await self.db[BLOCKED_HOURS].update_one(
                    {"hour": _iso(hour)},
                    {"$inc": {"count": blocked_count}, "$setOnInsert": {"expires_at": hour + timedelta(days=3)}},
                    upsert=True,
                )
            except Exception as exc:
                logger.warning("Watchdog: could not save blocked count: %s", exc)


# ---------------------------------------------------------------------------------------------
# ASGI middleware
# ---------------------------------------------------------------------------------------------

BLOCKED_BODY = json.dumps({"detail": "Access from your network has been blocked."}).encode()


class WatchdogMiddleware:
    """Pure ASGI, so it works the same on any Starlette version and never buffers big uploads."""

    def __init__(self, app, watchdog: Watchdog) -> None:
        self.app = app
        self.watchdog = watchdog

    async def __call__(self, scope, receive, send):
        wd = self.watchdog
        if scope.get("type") != "http" or not wd.enabled:
            await self.app(scope, receive, send)
            return

        headers: dict[str, str] = {}
        for raw_name, raw_value in scope.get("headers") or []:
            name = raw_name.decode("latin-1").lower()
            if name in {"x-forwarded-for", "x-real-ip", "user-agent", "authorization", "content-type", "content-length"}:
                headers[name] = raw_value.decode("latin-1")
        client = scope.get("client") or ("", 0)
        ip = client_ip_from(client[0] if client else "", headers)
        method = scope.get("method", "GET")
        path = scope.get("path", "/")
        query = (scope.get("query_string") or b"").decode("latin-1")
        user_agent = headers.get("user-agent", "")
        auth = headers.get("authorization", "")
        token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""

        # 1. Blocklist. A valid admin token always gets through, so the admin can't lock themselves out.
        if wd.blocking_enabled:
            entry = wd.blocked_entry(ip)
            if entry and not wd.is_allowlisted(ip):
                admin = False
                if token:
                    try:
                        admin = bool(wd.is_admin_token(token))
                    except Exception:
                        admin = False
                if not admin:
                    wd.note_blocked(entry)
                    await send({
                        "type": "http.response.start",
                        "status": 403,
                        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(BLOCKED_BODY)).encode())],
                    })
                    await send({"type": "http.response.body", "body": BLOCKED_BODY})
                    return

        # 2. Request line, headers and small bodies.
        wd.note_request(ip, method, path, user_agent)
        hit = scan_request(path, query, user_agent)
        if hit:
            rule, location, sample = hit
            wd.record(rule, ip=ip, method=method, path=path, query=query, sample=sample,
                      location=location, user_agent=user_agent, token=token)

        content_type = headers.get("content-type", "").lower()
        try:
            content_length = int(headers.get("content-length", "0") or 0)
        except ValueError:
            content_length = 0
        scan_this_body = (
            not hit
            and method in {"POST", "PUT", "PATCH", "DELETE"}
            and 0 < content_length <= MAX_BODY_BYTES
            and ("json" in content_type or "x-www-form-urlencoded" in content_type)
        )
        if scan_this_body:
            messages: list[dict] = []
            more = True
            while more:
                message = await receive()
                messages.append(message)
                if message.get("type") != "http.request":
                    break
                more = bool(message.get("more_body"))
            body = b"".join(m.get("body", b"") for m in messages if m.get("type") == "http.request")
            body_hit = scan_body(body, content_type)
            if body_hit:
                wd.record(body_hit[0], ip=ip, method=method, path=path, query=query, sample=body_hit[1],
                          location="body", user_agent=user_agent, token=token)
            original_receive = receive

            async def receive():  # noqa: F811 - replay the buffered body, then pass through
                if messages:
                    return messages.pop(0)
                return await original_receive()

        # 3. Watch the answer for failed logins, refused requests and rate limits.
        status_holder = {"status": 0}

        async def send_wrapper(message):
            if message.get("type") == "http.response.start":
                status_holder["status"] = int(message.get("status") or 0)
            await send(message)

        await self.app(scope, receive, send_wrapper)
        status = status_holder["status"]
        if status in (401, 403, 429):
            try:
                wd.note_response(status, ip=ip, method=method, path=path, query=query,
                                 user_agent=user_agent, token=token)
            except Exception as exc:
                logger.warning("Watchdog: response check failed: %s", exc)


# ---------------------------------------------------------------------------------------------
# Admin queries (used by the /api/admin/watchdog endpoints in server.py)
# ---------------------------------------------------------------------------------------------


async def _state(db) -> dict:
    return await db[STATE].find_one({"_id": STATE_ID}) or {}


async def note_admin_ip(db, ip: str) -> None:
    """Remember addresses an admin used, so they can't be blocked by mistake."""
    if not ip or ip == "unknown":
        return
    field = "admin_ips." + ip.replace(".", "_").replace(":", "-")
    await db[STATE].update_one(
        {"_id": STATE_ID},
        {"$set": {field: {"ip": ip, "seen_at": _iso(_now())}}},
        upsert=True,
    )


async def recent_admin_ips(db, days: int = 30) -> set[str]:
    state = await _state(db)
    cutoff = _iso(_now() - timedelta(days=days))
    out = set()
    for item in (state.get("admin_ips") or {}).values():
        if isinstance(item, dict) and str(item.get("seen_at") or "") >= cutoff and item.get("ip"):
            out.add(str(item["ip"]))
    return out


def _clean_event(doc: dict, wd: Watchdog) -> dict:
    return {
        "id": doc.get("id") or doc.get("key"),
        "ip": doc.get("ip"),
        "rule": doc.get("rule"),
        "label": doc.get("label") or RULES.get(doc.get("rule", ""), ("", ""))[0],
        "severity": doc.get("severity") or "low",
        "method": doc.get("method") or "",
        "path": doc.get("path") or "",
        "query": doc.get("query") or "",
        "sample": doc.get("sample") or "",
        "location": doc.get("location") or "behavior",
        "user_agent": doc.get("user_agent") or "",
        "username": doc.get("username"),
        "count": int(doc.get("count") or 0),
        "first_seen": doc.get("first_seen"),
        "last_seen": doc.get("last_seen"),
        "blocked": bool(wd.blocked_entry(str(doc.get("ip") or ""))),
    }


_EVENT_FIELDS = {"_id": 0, "expires_at": 0}


async def list_events(db, wd: Watchdog, *, ip: str = "", severity: str = "", limit: int = 200) -> list[dict]:
    query: dict[str, Any] = {}
    if ip:
        query["ip"] = str(ip)[:64]
    if severity in SEVERITY_RANK:
        query["severity"] = severity
    limit = min(500, max(1, int(limit or 200)))
    rows = await db[EVENTS].find(query, _EVENT_FIELDS).sort("last_seen", -1).limit(limit).to_list(limit)
    return [_clean_event(row, wd) for row in rows]


async def list_ips(db, wd: Watchdog, *, days: int = 7) -> list[dict]:
    days = min(30, max(1, int(days or 7)))
    cutoff = _iso(_now() - timedelta(days=days))
    rows = await db[EVENTS].find({"last_seen": {"$gte": cutoff}}, _EVENT_FIELDS).sort("last_seen", -1).limit(5000).to_list(5000)
    groups: dict[str, dict] = {}
    for row in rows:
        ip = str(row.get("ip") or "unknown")
        group = groups.get(ip)
        if group is None:
            group = {
                "ip": ip,
                "total": 0,
                "rules": [],
                "severity": "low",
                "first_seen": row.get("first_seen"),
                "last_seen": row.get("last_seen"),
                "sample_path": row.get("path") or "",
                "blocked": bool(wd.blocked_entry(ip)),
            }
            groups[ip] = group
        group["total"] += int(row.get("count") or 0)
        label = row.get("label") or row.get("rule")
        if label and label not in group["rules"]:
            group["rules"].append(label)
        severity = row.get("severity") or "low"
        if SEVERITY_RANK.get(severity, 0) > SEVERITY_RANK.get(group["severity"], 0):
            group["severity"] = severity
        if str(row.get("first_seen") or "") < str(group["first_seen"] or ""):
            group["first_seen"] = row.get("first_seen")
    ordered = sorted(
        groups.values(),
        key=lambda g: (SEVERITY_RANK.get(g["severity"], 0), str(g["last_seen"] or "")),
        reverse=True,
    )
    return ordered[:300]


def _clean_block(doc: dict) -> dict:
    return {
        "ip": doc.get("ip"),
        "reason": doc.get("reason") or "",
        "created_at": doc.get("created_at"),
        "expires_at": doc.get("expires_at"),
        "created_by": doc.get("created_by") or "",
        "hits": int(doc.get("hits") or 0),
        "last_hit_at": doc.get("last_hit_at"),
    }


async def list_blocklist(db) -> list[dict]:
    now = _iso(_now())
    rows = await db[BLOCKLIST].find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [_clean_block(r) for r in rows if not r.get("expires_at") or str(r["expires_at"]) > now]


async def summary(db, wd: Watchdog, *, your_ip: str) -> dict:
    now = _now()
    day_ago = _iso(now - timedelta(hours=24))
    state = await _state(db)
    seen_at = state.get("seen_at") or ""
    recent = await db[EVENTS].find(
        {"last_seen": {"$gte": day_ago}},
        {"_id": 0, "ip": 1, "count": 1, "severity": 1, "last_seen": 1},
    ).to_list(5000)
    unseen = await db[EVENTS].count_documents({"last_seen": {"$gt": seen_at}} if seen_at else {})
    hours = await db[BLOCKED_HOURS].find({"hour": {"$gte": day_ago}}, {"_id": 0, "count": 1}).to_list(100)
    latest = await db[EVENTS].find({}, {"_id": 0, "last_seen": 1}).sort("last_seen", -1).limit(1).to_list(1)
    blocked = await list_blocklist(db)
    return {
        "enabled": wd.enabled,
        "blocking_enabled": wd.blocking_enabled,
        "unseen": int(unseen),
        "events_24h": sum(int(r.get("count") or 0) for r in recent),
        "ips_24h": len({r.get("ip") for r in recent}),
        "high_24h": sum(1 for r in recent if r.get("severity") == "high"),
        "blocked_count": len(blocked),
        "blocked_requests_24h": sum(int(h.get("count") or 0) for h in hours),
        "last_event_at": latest[0]["last_seen"] if latest else None,
        "your_ip": your_ip,
    }


async def mark_seen(db) -> None:
    await db[STATE].update_one({"_id": STATE_ID}, {"$set": {"seen_at": _iso(_now())}}, upsert=True)


async def block(db, wd: Watchdog, *, target: str, reason: str, hours: Optional[float], admin_ip: str, admin_name: str) -> dict:
    """Validate and add a block. Raises ValueError with a message for the admin."""
    network = parse_target(target)
    label = network_label(network)
    min_prefix = 16 if network.version == 4 else 48
    if network.prefixlen < min_prefix:
        raise ValueError(f"That range is too wide. Block /{min_prefix} or narrower.")
    first = network.network_address
    if first.is_private or first.is_loopback or first.is_link_local or first.is_reserved or first.is_multicast or first.is_unspecified:
        raise ValueError("That's a private or internal address (the server's own proxy). Blocking it would block everyone.")
    own = _addr(admin_ip)
    if own is not None and own.version == network.version and own in network:
        raise ValueError(f"That would block your own address ({admin_ip}) and lock you out.")
    for ip in await recent_admin_ips(db):
        addr = _addr(ip)
        if addr is not None and addr.version == network.version and addr in network:
            raise ValueError(f"An admin account used {ip} recently, so it can't be blocked.")
    for allowed in wd.allowlist:
        if allowed.version == network.version and allowed.overlaps(network):
            raise ValueError("That address is on the server's allow list (WATCHDOG_ALLOW_IPS).")
    expires_at = None
    if hours is not None:
        hours = float(hours)
        if hours <= 0 or hours > 24 * 365:
            raise ValueError("Pick a duration between 1 hour and a year, or forever.")
        expires_at = _iso(_now() + timedelta(hours=hours))
    now = _iso(_now())
    entry = {
        "ip": label,
        "reason": str(reason or "").strip()[:200],
        "created_at": now,
        "expires_at": expires_at,
        "created_by": str(admin_name or "")[:60],
    }
    await db[BLOCKLIST].update_one(
        {"ip": label},
        {"$set": entry, "$setOnInsert": {"hits": 0, "last_hit_at": None}},
        upsert=True,
    )
    await wd.reload_blocklist()
    doc = await db[BLOCKLIST].find_one({"ip": label}, {"_id": 0}) or entry
    return _clean_block(doc)


async def unblock(db, wd: Watchdog, *, target: str) -> bool:
    text = str(target or "").strip()
    try:
        label = network_label(parse_target(text))
    except ValueError:
        label = text[:64]
    result = await db[BLOCKLIST].delete_one({"ip": label})
    await wd.reload_blocklist()
    return bool(getattr(result, "deleted_count", 0))
