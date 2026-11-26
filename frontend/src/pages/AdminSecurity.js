import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import AppShell, { WATCHDOG_SEEN_EVENT } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Ban, Globe, ListFilter, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

// Admin watchdog: requests the server flagged as attacks (SQL injection, script injection,
// path probing, floods...), grouped by address, plus the list of blocked addresses.
// Every string from the server here can be an attacker's payload, so it is only ever shown
// as plain text: never as HTML and never as a link.

const TABS = [
  { id: "addresses", label: "Addresses" },
  { id: "events", label: "All events" },
  { id: "blocked", label: "Blocked" },
];

const SEVERITY_FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const SEVERITY_PILL = { high: "smb-pill--bad", medium: "smb-pill--warn", low: "" };
const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" };

const LOCATION_LABEL = {
  path: "in the path",
  query: "in the query string",
  body: "in the request body",
  header: "in a header",
  behavior: "from behavior",
};

const DURATIONS = [
  { id: "1", label: "1 hour", hours: 1 },
  { id: "24", label: "24 hours", hours: 24 },
  { id: "168", label: "7 days", hours: 168 },
  { id: "forever", label: "Forever", hours: null },
];

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  return fallback;
};

const formatDate = (value) => {
  if (!value) return "–";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const loadError = (err, fallback) => (err?.response?.status === 403 ? "This page is only for admin accounts." : errorText(err, fallback));

const Filters = ({ options, value, onChange, label }) => (
  <div className="pro-seg" role="tablist" aria-label={label}>
    {options.map((option) => (
      <button key={option.id} type="button" role="tab" aria-selected={value === option.id} className={value === option.id ? "is-active" : ""} onClick={() => onChange(option.id)}>
        {option.label}
      </button>
    ))}
  </div>
);

const SeverityPill = ({ severity }) => <span className={`smb-pill ${SEVERITY_PILL[severity] || ""}`}>{SEVERITY_LABEL[severity] || severity || "–"}</span>;

const ErrorLine = ({ error }) =>
  error ? (
    <div className="adm-error-inline" role="alert">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
    </div>
  ) : null;

// Long attacker text: the first part, with a button to show the rest. Plain text only.
const LONG_TEXT = 160;
function LongText({ text }) {
  const [open, setOpen] = useState(false);
  const value = String(text || "");
  if (!value) return null;
  const long = value.length > LONG_TEXT;
  return (
    <span className="adm-wd-code" title={value}>
      {open || !long ? value : `${value.slice(0, LONG_TEXT)}…`}
      {long ? (
        <button type="button" className="adm-wd-more" onClick={() => setOpen(!open)}>
          {open ? "Show less" : "Show all"}
        </button>
      ) : null}
    </span>
  );
}

// Block / Unblock for one address. `blocked` comes from the row the server sent.
const BlockButtons = ({ ip, blocked, onBlock, onUnblock, busy }) =>
  blocked ? (
    <div className="adm-actions">
      <span className="smb-pill smb-pill--bad">Blocked</span>
      <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => onUnblock(ip)} disabled={busy}>Unblock</button>
    </div>
  ) : (
    <button type="button" className="smb-btn smb-btn--sm adm-btn-danger" onClick={onBlock} disabled={busy}>
      <Ban className="h-4 w-4" aria-hidden="true" /> Block
    </button>
  );

function AddressList({ reloadKey, onDetails, onBlock, onUnblock, busy }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/watchdog/ips`, { params: { days: 7 } });
      setItems(response.data?.ips || []);
      setError(null);
    } catch (err) {
      setError(loadError(err, "Couldn't load addresses."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <section className="smb-card">
      <div className="smb-card-head adm-inbox-head">
        <h2 className="smb-card-title">Addresses, last 7 days</h2>
      </div>
      <p className="smb-t3 text-xs">One row per address that set off a rule. Open Details to see every request it made.</p>
      <ErrorLine error={error} />

      <div className="adm-inbox-list">
        {items.map((item) => {
          const rules = Array.from(new Set(item.rules || []));
          return (
            <article key={item.ip} className="adm-inbox-item">
              <div className="adm-inbox-meta">
                <span className="adm-wd-ip">{item.ip}</span>
                <SeverityPill severity={item.severity} />
              </div>
              {rules.length ? (
                <div className="adm-wd-pills">
                  {rules.slice(0, 6).map((rule) => (
                    <span key={rule} className="smb-pill">{rule}</span>
                  ))}
                  {rules.length > 6 ? <span className="smb-pill">+{rules.length - 6} more</span> : null}
                </div>
              ) : null}
              {item.sample_path ? (
                <p className="adm-wd-line">
                  <span className="smb-t3 text-xs">Example path </span>
                  <LongText text={item.sample_path} />
                </p>
              ) : null}
              <div className="adm-inbox-foot">
                <span className="smb-mono smb-t3 text-xs">
                  {Number(item.total || 0).toLocaleString()} hits · first {formatDate(item.first_seen)} · last {formatDate(item.last_seen)}
                </span>
                <div className="adm-actions">
                  <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => onDetails(item.ip)}>
                    <ListFilter className="h-4 w-4" aria-hidden="true" /> Details
                  </button>
                  <BlockButtons ip={item.ip} blocked={item.blocked} busy={busy} onUnblock={onUnblock} onBlock={() => onBlock(item.ip, rules[0] || "")} />
                </div>
              </div>
            </article>
          );
        })}
        {!loading && !error && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Nothing suspicious yet.</p> : null}
        {loading && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
      </div>
    </section>
  );
}

function EventList({ reloadKey, ip, onClearIp, onBlock, onUnblock, busy }) {
  const [severity, setSeverity] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (ip) params.ip = ip;
      if (severity !== "all") params.severity = severity;
      const response = await axios.get(`${API}/admin/watchdog/events`, { params });
      setItems(response.data?.events || []);
      setError(null);
    } catch (err) {
      setError(loadError(err, "Couldn't load events."));
    } finally {
      setLoading(false);
    }
  }, [ip, severity]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <section className="smb-card">
      <div className="smb-card-head adm-inbox-head">
        <h2 className="smb-card-title">All events</h2>
        <Filters options={SEVERITY_FILTERS} value={severity} onChange={setSeverity} label="Severity" />
      </div>
      {ip ? (
        <div className="adm-wd-filter">
          <span className="smb-t3 text-xs">Only showing</span>
          <span className="adm-wd-ip">{ip}</span>
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={onClearIp}>
            <X className="h-4 w-4" aria-hidden="true" /> Show all addresses
          </button>
        </div>
      ) : (
        <p className="smb-t3 text-xs">Newest first. Repeats of the same rule from the same address are counted on one row.</p>
      )}
      <ErrorLine error={error} />

      <div className="adm-inbox-list">
        {items.map((item) => (
          <article key={item.id} className="adm-inbox-item">
            <div className="adm-inbox-meta">
              <b className="adm-wd-label">{item.label || item.rule || "Flagged request"}</b>
              <SeverityPill severity={item.severity} />
            </div>
            <dl className="adm-inbox-fields">
              <dt>Address</dt>
              <dd><span className="adm-wd-ip">{item.ip}</span></dd>
              <dt>Request</dt>
              <dd>
                <span className="adm-wd-code">{item.method || "?"} </span>
                <LongText text={item.path} />
              </dd>
              {item.query ? (
                <>
                  <dt>Query</dt>
                  <dd><LongText text={item.query} /></dd>
                </>
              ) : null}
              {item.sample ? (
                <>
                  <dt>Matched</dt>
                  <dd>
                    <LongText text={item.sample} />
                    {item.location ? <span className="smb-t3 text-xs"> {LOCATION_LABEL[item.location] || item.location}</span> : null}
                  </dd>
                </>
              ) : item.location ? (
                <>
                  <dt>Matched</dt>
                  <dd className="smb-t3">{LOCATION_LABEL[item.location] || item.location}</dd>
                </>
              ) : null}
              {item.username ? (
                <>
                  <dt>Signed in as</dt>
                  <dd>{item.username}</dd>
                </>
              ) : null}
              {item.user_agent ? (
                <>
                  <dt>Browser</dt>
                  <dd><LongText text={item.user_agent} /></dd>
                </>
              ) : null}
            </dl>
            <div className="adm-inbox-foot">
              <span className="smb-mono smb-t3 text-xs">
                {Number(item.count || 1).toLocaleString()}× · first {formatDate(item.first_seen)} · last {formatDate(item.last_seen)}
              </span>
              <BlockButtons ip={item.ip} blocked={item.blocked} busy={busy} onUnblock={onUnblock} onBlock={() => onBlock(item.ip, item.label || "")} />
            </div>
          </article>
        ))}
        {!loading && !error && items.length === 0 ? (
          <p className="smb-t3 text-sm adm-empty">{ip || severity !== "all" ? "Nothing matches these filters." : "Nothing suspicious yet."}</p>
        ) : null}
        {loading && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
      </div>
    </section>
  );
}

function BlockedList({ reloadKey, onUnblock, busy }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/watchdog/blocklist`);
      setItems(response.data?.blocked || []);
      setError(null);
    } catch (err) {
      setError(loadError(err, "Couldn't load the block list."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <section className="smb-card">
      <div className="smb-card-head adm-inbox-head">
        <h2 className="smb-card-title">Blocked addresses</h2>
      </div>
      <p className="smb-t3 text-xs">Requests from these addresses are refused before they reach the site.</p>
      <ErrorLine error={error} />

      <div className="adm-inbox-list">
        {items.map((item) => (
          <article key={item.ip} className="adm-inbox-item">
            <div className="adm-inbox-meta">
              <span className="adm-wd-ip">{item.ip}</span>
              <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => onUnblock(item.ip)} disabled={busy}>Unblock</button>
            </div>
            <dl className="adm-inbox-fields">
              <dt>Reason</dt>
              <dd>{item.reason || "–"}</dd>
              <dt>Blocked</dt>
              <dd>{formatDate(item.created_at)}{item.created_by ? ` by ${item.created_by}` : ""}</dd>
              <dt>Ends</dt>
              <dd>{item.expires_at ? formatDate(item.expires_at) : "Never"}</dd>
              <dt>Refused</dt>
              <dd>
                {Number(item.hits || 0).toLocaleString()} requests
                {item.last_hit_at ? <span className="smb-t3"> · last {formatDate(item.last_hit_at)}</span> : null}
              </dd>
            </dl>
          </article>
        ))}
        {!loading && !error && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">No addresses are blocked.</p> : null}
        {loading && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
      </div>
    </section>
  );
}

export default function AdminSecurity() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((t) => t.id === requested) ? requested : "addresses";
  const ipFilter = searchParams.get("ip") || "";

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("24");
  const markedSeen = useRef(false);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const response = await axios.get(`${API}/admin/watchdog/summary`);
      setSummary(response.data || null);
      setSummaryError(null);
      // Opening the page counts as having looked, which clears the badge in the sidebar.
      if (!markedSeen.current) {
        markedSeen.current = true;
        axios.post(`${API}/admin/watchdog/seen`).then(() => window.dispatchEvent(new Event(WATCHDOG_SEEN_EVENT)), () => {});
      }
    } catch (err) {
      setSummaryError(loadError(err, "Couldn't load the watchdog summary."));
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refresh = () => {
    loadSummary();
    setReloadKey((key) => key + 1);
  };

  const openTab = (id, ip) => {
    const next = { tab: id };
    if (ip) next.ip = ip;
    setSearchParams(next);
  };

  const openBlock = (ip, label) => {
    setReason(label ? `Watchdog: ${label}` : "");
    setDuration("24");
    setBlockTarget(ip);
  };

  const confirmBlock = async () => {
    if (!blockTarget) return;
    const choice = DURATIONS.find((d) => d.id === duration) || DURATIONS[1];
    setBusy(true);
    try {
      await axios.post(`${API}/admin/watchdog/block`, { ip: blockTarget, reason: reason.trim(), hours: choice.hours });
      toast.success(`${blockTarget} blocked${choice.hours ? ` for ${choice.label}` : ""}`);
      setBlockTarget(null);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't block that address."));
    } finally {
      setBusy(false);
    }
  };

  const unblock = async (ip) => {
    setBusy(true);
    try {
      const response = await axios.post(`${API}/admin/watchdog/unblock`, { ip });
      if (response.data?.removed === false) toast.message(`${ip} wasn't blocked`);
      else toast.success(`${ip} unblocked`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't unblock that address."));
    } finally {
      setBusy(false);
    }
  };

  const handleShellSelect = (next) => {
    if (next === "spotlight") navigate("/spotlight");
    else navigate(`/dashboard?tab=${next}`);
  };

  const tiles = [
    { id: "events", label: "Attacks flagged", value: summary?.events_24h, tone: summary?.events_24h ? "warn" : "" },
    { id: "ips", label: "Addresses", value: summary?.ips_24h, tone: "" },
    { id: "high", label: "High severity", value: summary?.high_24h, tone: summary?.high_24h ? "bad" : "" },
    { id: "blocked", label: "Blocked addresses", value: summary?.blocked_count, tone: "", hint: "right now" },
    { id: "refused", label: "Requests refused", value: summary?.blocked_requests_24h, tone: summary?.blocked_requests_24h ? "ok" : "" },
  ];
  const blockingAsYou = Boolean(summary?.your_ip && blockTarget && summary.your_ip === blockTarget);

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell
        active="admin-security"
        onSelect={handleShellSelect}
        title="Watchdog"
        crumb="Admin · Attacks on the server, and blocked addresses"
        isAdmin
        onAdmin={(path) => navigate(path)}
        actions={
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={refresh} disabled={loadingSummary}>
            <RefreshCw className={`h-4 w-4 ${loadingSummary ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      >
        <div className="adm">
          {summaryError ? (
            <div className="smb-card adm-error" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{summaryError}</span>
            </div>
          ) : null}

          {summary && !summary.enabled ? (
            <div className="smb-card adm-wd-notice" role="status">
              <AlertTriangle className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>Watchdog is off on the server, so nothing new is being flagged.</span>
            </div>
          ) : null}
          {summary && summary.enabled && !summary.blocking_enabled ? (
            <div className="smb-card adm-wd-notice" role="status">
              <AlertTriangle className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>Blocking is switched off on the server, so blocks are saved but not enforced.</span>
            </div>
          ) : null}

          <div className="adm-tiles adm-wd-tiles">
            {tiles.map((tile) => (
              <div key={tile.id} className={`smb-card adm-tile ${tile.tone ? `adm-tile--${tile.tone}` : ""}`}>
                <span className="smb-eyebrow">{tile.label}</span>
                <b>{tile.value == null ? "–" : Number(tile.value).toLocaleString()}</b>
                <span className="smb-t3 text-xs">{tile.hint || "last 24 hours"}</span>
              </div>
            ))}
          </div>

          <div className="adm-wd-bar">
            <Filters options={TABS} value={tab} onChange={(id) => openTab(id, id === "events" ? ipFilter : "")} label="Watchdog views" />
            <span className="smb-mono smb-t3 text-xs adm-wd-you">
              {summary?.your_ip ? (
                <>
                  <Globe className="h-3.5 w-3.5 inline" aria-hidden="true" /> Your address: {summary.your_ip}
                </>
              ) : null}
              {summary?.last_event_at ? ` · last flag ${formatDate(summary.last_event_at)}` : ""}
            </span>
          </div>

          {tab === "addresses" ? (
            <AddressList reloadKey={reloadKey} busy={busy} onDetails={(ip) => openTab("events", ip)} onBlock={openBlock} onUnblock={unblock} />
          ) : null}
          {tab === "events" ? (
            <EventList reloadKey={reloadKey} busy={busy} ip={ipFilter} onClearIp={() => openTab("events")} onBlock={openBlock} onUnblock={unblock} />
          ) : null}
          {tab === "blocked" ? <BlockedList reloadKey={reloadKey} busy={busy} onUnblock={unblock} /> : null}
        </div>
      </AppShell>

      <Dialog open={Boolean(blockTarget)} onOpenChange={(open) => !open && !busy && setBlockTarget(null)}>
        <DialogContent className="bg-[var(--card-bg)] border border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Block this address?</DialogTitle>
            <DialogDescription>
              Every request from it gets refused until the block ends. You can unblock it any time from the Blocked tab.
            </DialogDescription>
          </DialogHeader>
          <div className="adm-confirm-who">
            <span className="adm-wd-ip">{blockTarget}</span>
            {blockTarget && blockTarget.includes("/") ? <span className="smb-t3 text-xs">This is a range, so every address in it is blocked.</span> : null}
          </div>
          {blockingAsYou ? (
            <div className="adm-error-inline" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> This is your own address.
            </div>
          ) : null}
          {summary && !summary.blocking_enabled ? (
            <p className="smb-t3 text-xs">Blocking is switched off on the server, so this is saved but not enforced yet.</p>
          ) : null}
          <label htmlFor="watchdog-reason" className="smb-eyebrow block">Reason</label>
          <Input id="watchdog-reason" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why it's blocked" />
          <span className="smb-eyebrow block">How long</span>
          <Filters options={DURATIONS} value={duration} onChange={setDuration} label="Block length" />
          <DialogFooter>
            <Button className="smb-btn smb-btn--sec" onClick={() => setBlockTarget(null)} disabled={busy}>Cancel</Button>
            <Button className="smb-btn adm-btn-danger" onClick={confirmBlock} disabled={busy}>
              {busy ? "Working…" : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Block
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
