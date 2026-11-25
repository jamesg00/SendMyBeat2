import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, BadgeCheck, Bug, Copy, ExternalLink, Lightbulb, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Admin inbox: bug reports, feature ideas and verification requests in one place.
// Feedback statuses are the ones users already see on their side: New, Planned, Fixed, Closed.

const TABS = [
  { id: "bugs", label: "Bug reports", Icon: Bug },
  { id: "ideas", label: "Ideas", Icon: Lightbulb },
  { id: "verification", label: "Verification", Icon: BadgeCheck },
];

const FEEDBACK_STATUSES = [
  { id: "new", label: "New" },
  { id: "planned", label: "Planned" },
  { id: "fixed", label: "Fixed" },
  { id: "closed", label: "Closed" },
];
const FEEDBACK_FILTERS = [{ id: "open", label: "Open" }, ...FEEDBACK_STATUSES, { id: "all", label: "All" }];
const VERIFICATION_FILTERS = [
  { id: "pending", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const STATUS_PILL = { new: "smb-pill--warn", planned: "", fixed: "smb-pill--ok", closed: "", pending: "smb-pill--warn", approved: "smb-pill--ok", rejected: "smb-pill--bad" };
const STATUS_LABEL = { new: "New", planned: "Planned", fixed: "Fixed", closed: "Closed", pending: "Waiting", approved: "Approved", rejected: "Rejected" };

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

// Users type these links themselves, so only real web links become clickable.
const safeWebUrl = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const copyText = (text, label) => {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${label} copied`), () => {});
};

const Filters = ({ options, value, onChange, label }) => (
  <div className="pro-seg" role="tablist" aria-label={label}>
    {options.map((option) => (
      <button key={option.id} type="button" role="tab" aria-selected={value === option.id} className={value === option.id ? "is-active" : ""} onClick={() => onChange(option.id)}>
        {option.label}
      </button>
    ))}
  </div>
);

const Who = ({ username, userId }) => (
  <span className="adm-inbox-who">
    <b>{username || "Unknown user"}</b>
    {userId ? (
      <button type="button" className="adm-id" onClick={() => copyText(userId, "User id")} title="Copy user id">
        <span className="truncate">{userId}</span>
        <Copy className="h-3 w-3 flex-none" aria-hidden="true" />
      </button>
    ) : null}
  </span>
);

function FeedbackList({ kind, onChanged }) {
  const [filter, setFilter] = useState("open");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/feedback`, { params: { status: filter, kind } });
      setItems(response.data?.items || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.status === 403 ? "This page is only for admin accounts." : errorText(err, "Couldn't load these."));
    } finally {
      setLoading(false);
    }
  }, [filter, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (item, status) => {
    if (item.status === status) return;
    setSavingId(item.id);
    try {
      await axios.patch(`${API}/admin/feedback/${encodeURIComponent(item.id)}`, { status });
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status } : row)));
      toast.success(`Marked ${STATUS_LABEL[status].toLowerCase()}`);
      onChanged();
    } catch (err) {
      toast.error(errorText(err, "Couldn't change the status."));
    } finally {
      setSavingId(null);
    }
  };

  const noun = kind === "bug" ? "bug reports" : "ideas";
  return (
    <section className="smb-card">
      <div className="smb-card-head adm-inbox-head">
        <h2 className="smb-card-title">{kind === "bug" ? "Bug reports" : "Ideas and suggestions"}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Filters options={FEEDBACK_FILTERS} value={filter} onChange={setFilter} label="Status" />
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm adm-icon-btn" onClick={load} disabled={loading} aria-label="Refresh" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <p className="smb-t3 text-xs">
        Sent from Settings on the web and the phone app. People see the status you set here next to what they sent. Open means New or Planned.
      </p>

      {error ? (
        <div className="adm-error-inline" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      ) : null}

      <div className="adm-inbox-list">
        {items.map((item) => (
          <article key={item.id} className="adm-inbox-item">
            <div className="adm-inbox-meta">
              <Who username={item.username} userId={item.user_id} />
              <span className={`smb-pill ${STATUS_PILL[item.status] || ""}`}>{STATUS_LABEL[item.status] || item.status}</span>
            </div>
            <p className="adm-inbox-message">{item.message}</p>
            <div className="adm-inbox-foot">
              <span className="smb-mono smb-t3 text-xs">
                {formatDate(item.created_at)}
                {item.screen ? ` · ${item.screen}` : ""}
                {item.platform ? ` · ${item.platform}` : ""}
                {item.app_version ? ` · v${item.app_version}` : ""}
              </span>
              <label className="adm-inbox-status">
                <span className="smb-t3 text-xs">Status</span>
                <select className="adm-select" value={item.status} disabled={savingId === item.id} onChange={(event) => setStatus(item, event.target.value)} aria-label="Change status">
                  {FEEDBACK_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {item.device ? <p className="smb-t3 text-xs adm-inbox-device" title={item.device}>{item.device}</p> : null}
          </article>
        ))}
        {!loading && !error && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">No {noun} here.</p> : null}
        {loading && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
      </div>
    </section>
  );
}

function VerificationList({ onChanged }) {
  const [filter, setFilter] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/verification`, { params: { status: filter } });
      setItems(response.data?.applications || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.status === 403 ? "This page is only for admin accounts." : errorText(err, "Couldn't load verification requests."));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (item, action) => {
    setNote("");
    setReview({ item, action });
  };

  const submitReview = async () => {
    if (!review) return;
    setActing(true);
    try {
      await axios.post(`${API}/producers/verification/review`, { user_id: review.item.user_id, action: review.action, note: note.trim() || undefined });
      toast.success(review.action === "approve" ? `${review.item.username || "Producer"} verified` : `${review.item.username || "Producer"}'s request rejected`);
      setReview(null);
      onChanged();
      await load();
    } catch (err) {
      toast.error(errorText(err, "That didn't work."));
    } finally {
      setActing(false);
    }
  };

  const approving = review?.action === "approve";
  return (
    <section className="smb-card">
      <div className="smb-card-head adm-inbox-head">
        <h2 className="smb-card-title">Verification requests</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Filters options={VERIFICATION_FILTERS} value={filter} onChange={setFilter} label="Status" />
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm adm-icon-btn" onClick={load} disabled={loading} aria-label="Refresh" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <p className="smb-t3 text-xs">
        Producers apply from their Spotlight profile. Approving adds the verified badge, and if they claimed a Pros page, links it to their profile.
      </p>

      {error ? (
        <div className="adm-error-inline" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      ) : null}

      <div className="adm-inbox-list">
        {items.map((item) => {
          const application = item.verification_application || {};
          const link = safeWebUrl(application.main_platform_url);
          const status = item.verification_status || "pending";
          return (
            <article key={item.user_id} className="adm-inbox-item">
              <div className="adm-inbox-meta">
                <Who username={item.username} userId={item.user_id} />
                <span className={`smb-pill ${STATUS_PILL[status] || ""}`}>{STATUS_LABEL[status] || status}</span>
              </div>
              <dl className="adm-inbox-fields">
                {application.stage_name ? (
                  <>
                    <dt>Stage name</dt>
                    <dd>{application.stage_name}</dd>
                  </>
                ) : null}
                {application.main_platform_url ? (
                  <>
                    <dt>Main link</dt>
                    <dd>
                      {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="adm-inbox-link">
                          {application.main_platform_url} <ExternalLink className="h-3 w-3 inline" aria-hidden="true" />
                        </a>
                      ) : (
                        application.main_platform_url
                      )}
                    </dd>
                  </>
                ) : null}
                {item.pro_name ? (
                  <>
                    <dt>Claims Pros page</dt>
                    <dd>{item.pro_name}</dd>
                  </>
                ) : null}
                {application.notable_work ? (
                  <>
                    <dt>Notable work</dt>
                    <dd>{application.notable_work}</dd>
                  </>
                ) : null}
                <dt>Why</dt>
                <dd>{application.reason || "–"}</dd>
                {status !== "pending" && item.verification_note ? (
                  <>
                    <dt>Note</dt>
                    <dd>{item.verification_note}</dd>
                  </>
                ) : null}
              </dl>
              <div className="adm-inbox-foot">
                <span className="smb-mono smb-t3 text-xs">
                  Applied {formatDate(item.verification_applied_at || application.submitted_at)}
                  {status === "approved" && item.verified_at ? ` · verified ${formatDate(item.verified_at)}` : ""}
                </span>
                {status === "pending" ? (
                  <div className="adm-actions">
                    <button type="button" className="smb-btn smb-btn--sm adm-btn-danger" onClick={() => openReview(item, "reject")}>Reject</button>
                    <button type="button" className="smb-btn smb-btn--pri smb-btn--sm" onClick={() => openReview(item, "approve")}>Approve</button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        {!loading && !error && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">{filter === "pending" ? "No requests waiting." : "Nothing here yet."}</p> : null}
        {loading && items.length === 0 ? <p className="smb-t3 text-sm adm-empty">Loading…</p> : null}
      </div>

      <Dialog open={Boolean(review)} onOpenChange={(open) => !open && !acting && setReview(null)}>
        <DialogContent className="bg-[var(--card-bg)] border border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>{approving ? "Verify this producer?" : "Reject this request?"}</DialogTitle>
            <DialogDescription>
              {approving
                ? "They get the verified badge on Spotlight. If they claimed a Pros page, it's linked to their profile."
                : "They can see the note on their profile. They won't get the badge."}
            </DialogDescription>
          </DialogHeader>
          <div className="adm-confirm-who">
            <b>{review?.item?.username || "Unknown user"}</b>
            <span className="smb-mono smb-t3 text-xs">{review?.item?.user_id}</span>
          </div>
          <label htmlFor="verification-note" className="smb-eyebrow block">Note (optional)</label>
          <Textarea id="verification-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={approving ? "Approved by admin" : "Rejected by admin"} />
          <DialogFooter>
            <Button className="smb-btn smb-btn--sec" onClick={() => setReview(null)} disabled={acting}>Cancel</Button>
            <Button className={`smb-btn ${approving ? "smb-btn--pri" : "adm-btn-danger"}`} onClick={submitReview} disabled={acting}>
              {acting ? "Working…" : approving ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function AdminInbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((t) => t.id === requested) ? requested : "bugs";
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(() => {
    axios.get(`${API}/admin/inbox/summary`).then((r) => setSummary(r.data || null), () => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const countFor = (id) => {
    if (!summary) return null;
    if (id === "bugs") return summary.bugs?.new;
    if (id === "ideas") return summary.ideas?.new;
    return summary.verification?.pending;
  };

  const handleShellSelect = (next) => {
    if (next === "spotlight") navigate("/spotlight");
    else navigate(`/dashboard?tab=${next}`);
  };

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell
        active="admin-inbox"
        onSelect={handleShellSelect}
        title="Inbox"
        crumb="Admin · Bug reports, ideas and verification"
        isAdmin
        onAdmin={(path) => navigate(path)}
      >
        <div className="adm">
          <div className="adm-tiles adm-tiles--3">
            {TABS.map(({ id, label, Icon }) => {
              const count = countFor(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`smb-card adm-tile adm-inbox-tile ${tab === id ? "is-active" : ""} ${count ? "adm-tile--warn" : ""}`}
                  onClick={() => setSearchParams({ tab: id })}
                  aria-pressed={tab === id}
                >
                  <span className="smb-eyebrow">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                  </span>
                  <b>{count == null ? "–" : count}</b>
                  <span className="smb-t3 text-xs">{id === "verification" ? "waiting for review" : "new"}</span>
                </button>
              );
            })}
          </div>

          {tab === "bugs" ? <FeedbackList key="bug" kind="bug" onChanged={loadSummary} /> : null}
          {tab === "ideas" ? <FeedbackList key="idea" kind="idea" onChanged={loadSummary} /> : null}
          {tab === "verification" ? <VerificationList onChanged={loadSummary} /> : null}
        </div>
      </AppShell>
    </div>
  );
}
