import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import AppShell from "@/components/AppShell";
import { Activity, AlertTriangle, Cpu, DollarSign, Gauge, RefreshCw, Server } from "lucide-react";

// Admin: server health, launch controls, recent jobs and this month's estimated costs.

const money = (value, digits = 2) => `$${Number(value || 0).toFixed(digits)}`;
const number = (value) => Number(value || 0).toLocaleString();
const label = (key) => String(key || "").replace(/_/g, " ");

const formatAge = (isoValue) => {
  if (!isoValue) return "–";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return "–";
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  return fallback;
};

const STATUS_PILL = { succeeded: "smb-pill--ok", failed: "smb-pill--bad", cancelled: "smb-pill--bad", processing: "smb-pill--warn", queued: "smb-pill--warn" };

const Tile = ({ icon: Icon, label: name, value, hint, tone }) => (
  <div className={`smb-card adm-tile ${tone ? `adm-tile--${tone}` : ""}`}>
    <span className="smb-eyebrow">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {name}
    </span>
    <b>{value}</b>
    {hint ? <span className="smb-t3 text-xs">{hint}</span> : null}
  </div>
);

export default function AdminCosts() {
  const navigate = useNavigate();
  const [costs, setCosts] = useState(null);
  const [ops, setOps] = useState(null);
  const [controls, setControls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [costsResponse, opsResponse] = await Promise.all([axios.get(`${API}/admin/costs`), axios.get(`${API}/admin/ops`)]);
      setCosts(costsResponse.data);
      setOps(opsResponse.data);
      setControls(opsResponse?.data?.health?.controls || null);
      setError(null);
    } catch (err) {
      setError(err?.response?.status === 403 ? "This page is only for admin accounts." : errorText(err, "Couldn't load the admin data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateControls = async (body, fallback) => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/admin/ops/controls`, body);
      setControls(response?.data?.controls || controls);
      await fetchData();
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setSaving(false);
    }
  };

  const clearUploads = async () => {
    if (!window.confirm("Clear all active YouTube upload jobs? Use this only if an upload is stuck.")) return;
    setClearing(true);
    try {
      await axios.post(`${API}/admin/ops/clear-jobs`, { job_type: "youtube_upload", statuses: ["queued", "processing"] });
      await fetchData();
    } catch (err) {
      setError(errorText(err, "Couldn't clear the upload jobs."));
    } finally {
      setClearing(false);
    }
  };

  const clearJob = async (jobId) => {
    if (!window.confirm(`Clear job ${jobId}? It will be marked failed so it can be retried.`)) return;
    setClearing(true);
    try {
      await axios.post(`${API}/admin/ops/clear-job/${jobId}`);
      await fetchData();
    } catch (err) {
      setError(errorText(err, "Couldn't clear that job."));
    } finally {
      setClearing(false);
    }
  };

  const handleShellSelect = (tab) => {
    if (tab === "spotlight") navigate("/spotlight");
    else navigate(`/dashboard?tab=${tab}`);
  };

  const health = ops?.health || {};
  const ctl = controls || health.controls || {};
  const features = Object.entries(ctl.disabled_features || {});
  const jobs = ops?.recent_jobs || [];
  const details = costs?.details || [];
  const totals = details.reduce(
    (acc, item) => ({ count: acc.count + (item.count || 0), tin: acc.tin + (item.total_tokens_in || 0), tout: acc.tout + (item.total_tokens_out || 0) }),
    { count: 0, tin: 0, tout: 0 },
  );
  const healthy = String(health.status || "").toLowerCase() === "ok" || health.ready;

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell
        active="admin-costs"
        onSelect={handleShellSelect}
        title="Ops and costs"
        crumb="Admin · Server health, launch controls and spend"
        isAdmin
        onAdmin={(path) => navigate(path)}
        actions={
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      >
        <div className="adm">
          {error ? (
            <div className="smb-card adm-error" role="alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{error}</span>
              <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={fetchData}>Try again</button>
            </div>
          ) : null}

          {loading && !ops && !costs ? <p className="smb-t3 text-sm">Loading…</p> : null}

          {ops || costs ? (
            <>
              <div className="adm-tiles">
                <Tile icon={Activity} label="Health" value={health.status || "unknown"} hint={health.ready ? "Ready for traffic" : "Not ready"} tone={healthy ? "ok" : "bad"} />
                <Tile icon={Gauge} label="Queued" value={number(health.jobs?.queued)} hint="jobs waiting" tone={(health.jobs?.queued || 0) > 20 ? "warn" : null} />
                <Tile icon={Server} label="Processing" value={number(health.jobs?.processing)} hint="jobs running now" />
                <Tile icon={AlertTriangle} label="Failed" value={number(health.jobs?.failed_last_hour)} hint="in the last hour" tone={(health.jobs?.failed_last_hour || 0) > 0 ? "bad" : null} />
              </div>

              <section className="smb-card">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">Launch controls</h2>
                  <span className="smb-mono smb-t3 text-xs">for traffic spikes</span>
                </div>
                <div className="adm-switches">
                  <div className="adm-switch">
                    <div className="min-w-0">
                      <b>Overload mode</b>
                      <span className="smb-t3 text-xs">Slows new work down so the queue can catch up.</span>
                    </div>
                    <button type="button" role="switch" aria-checked={!!ctl.overload_mode_enabled} disabled={saving} className={`adm-toggle ${ctl.overload_mode_enabled ? "is-on is-warn" : ""}`} onClick={() => updateControls({ overload_mode_enabled: !ctl.overload_mode_enabled }, "Couldn't change overload mode.")}>
                      <i />
                    </button>
                  </div>
                  <div className="adm-switch">
                    <div className="min-w-0">
                      <b>Pause new heavy jobs</b>
                      <span className="smb-t3 text-xs">Running jobs finish; new uploads and AI jobs wait.</span>
                    </div>
                    <button type="button" role="switch" aria-checked={!!ctl.global_disable_new_heavy_jobs} disabled={saving} className={`adm-toggle ${ctl.global_disable_new_heavy_jobs ? "is-on is-warn" : ""}`} onClick={() => updateControls({ global_disable_new_heavy_jobs: !ctl.global_disable_new_heavy_jobs }, "Couldn't change heavy-job controls.")}>
                      <i />
                    </button>
                  </div>
                </div>

                {features.length ? (
                  <>
                    <p className="smb-eyebrow">Features</p>
                    <div className="adm-features">
                      {features.map(([key, disabled]) => (
                        <div key={key} className="adm-switch">
                          <div className="min-w-0">
                            <b className="capitalize">{label(key)}</b>
                            <span className={`text-xs ${disabled ? "smb-danger" : "smb-t3"}`}>{disabled ? "Turned off for everyone" : "On"}</span>
                          </div>
                          <button type="button" role="switch" aria-checked={!disabled} aria-label={`${label(key)} on`} disabled={saving} className={`adm-toggle ${!disabled ? "is-on" : ""}`} onClick={() => updateControls({ disabled_features: { [key]: !disabled } }, "Couldn't change that feature.")}>
                            <i />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="adm-danger">
                  <div className="min-w-0">
                    <b>Stuck uploads</b>
                    <span className="smb-t3 text-xs">Clears every queued and processing YouTube upload.</span>
                  </div>
                  <button type="button" className="smb-btn smb-btn--sm adm-btn-danger" onClick={clearUploads} disabled={clearing}>
                    {clearing ? "Clearing…" : "Clear active uploads"}
                  </button>
                </div>
              </section>

              <section className="smb-card">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">Recent jobs</h2>
                  <span className="smb-mono smb-t3 text-xs">{jobs.length} shown</span>
                </div>
                {jobs.length ? (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Stage</th>
                          <th className="is-num">Progress</th>
                          <th>Heartbeat</th>
                          <th>Updated</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.id}>
                            <td className="capitalize">{label(job.type)}</td>
                            <td><span className={`smb-pill ${STATUS_PILL[job.status] || ""}`}>{job.status}</span></td>
                            <td className="smb-t2">{job.stage || "–"}</td>
                            <td className="is-num">
                              <span className="adm-progress"><i style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }} /></span>
                              <span className="smb-mono">{job.progress ?? 0}%</span>
                            </td>
                            <td className="smb-mono smb-t2">{formatAge(job.last_heartbeat_at)}</td>
                            <td className="smb-mono smb-t2">{formatAge(job.updated_at)}</td>
                            <td className="is-num">
                              <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" disabled={clearing} onClick={() => clearJob(job.id)}>Clear</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="smb-t3 text-sm">No recent jobs.</p>
                )}
              </section>

              <div className="adm-tiles adm-tiles--3">
                <Tile icon={DollarSign} label="This month" value={money(costs?.total_estimated_cost)} hint="hosting + AI, estimated" />
                <Tile icon={Server} label="Hosting" value={money(costs?.hosting_cost)} hint="fixed, Lightsail" />
                <Tile icon={Cpu} label="AI usage" value={money(costs?.llm_cost, 4)} hint="token spend so far" />
              </div>

              <section className="smb-card">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">AI usage by feature</h2>
                  <span className="smb-mono smb-t3 text-xs">this month</span>
                </div>
                {details.length ? (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th className="is-num">Requests</th>
                          <th className="is-num">Tokens in</th>
                          <th className="is-num">Tokens out</th>
                          <th className="is-num">Est. cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.map((item, index) => (
                          <tr key={item._id || index}>
                            <td className="capitalize">{label(item._id)}</td>
                            <td className="is-num smb-mono">{number(item.count)}</td>
                            <td className="is-num smb-mono">{number(item.total_tokens_in)}</td>
                            <td className="is-num smb-mono">{number(item.total_tokens_out)}</td>
                            <td className="is-num smb-mono">{money(item.total_cost, 4)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="is-num smb-mono">{number(totals.count)}</td>
                          <td className="is-num smb-mono">{number(totals.tin)}</td>
                          <td className="is-num smb-mono">{number(totals.tout)}</td>
                          <td className="is-num smb-mono">{money(costs?.llm_cost, 4)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="smb-t3 text-sm">No AI usage recorded yet this month.</p>
                )}
                <p className="smb-t3 text-xs">
                  Hosting is the fixed Lightsail plan. AI cost is estimated from token counts; the xAI and AWS bills can differ slightly (taxes, exchange rates).
                </p>
              </section>
            </>
          ) : null}
        </div>
      </AppShell>
    </div>
  );
}
