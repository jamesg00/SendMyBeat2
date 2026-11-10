import React, { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import UploadInsights from "@/components/analytics/UploadInsights";

// The whole channel report, top to bottom: where the channel stands, upload-by-upload detail,
// what to do next, what works and what doesn't, and the longer playbook behind tabs.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const healthOf = (raw) => {
  const text = String(raw || "");
  const match = text.match(/\d{1,3}/);
  const score = match ? Math.max(0, Math.min(100, Number(match[0]))) : null;
  // "35/100 - Inconsistent artist tags…" → the part after the dash is the one-line verdict.
  const verdict = text.split(/\s[-–]\s/).slice(1).join(" – ").trim();
  return { score, verdict };
};
const healthWord = (score) => (score == null ? "Not scored" : score >= 75 ? "Healthy" : score >= 50 ? "Growing" : score >= 30 ? "Needs work" : "Just starting");

const PLAYBOOK = [
  ["seo_optimization", "Titles and SEO"],
  ["content_strategy", "What to upload"],
  ["discoverability_tactics", "Getting found"],
  ["internet_money_lessons", "From the pros"],
];

const Stat = ({ label, value, hint }) => (
  <div className="an-stat">
    <span className="smb-eyebrow">{label}</span>
    <b>{value}</b>
    {hint ? <span className="smb-t3 text-xs">{hint}</span> : null}
  </div>
);

const ChannelReport = ({ data }) => {
  const insights = data.insights || {};
  const { score, verdict } = healthOf(insights.channel_health_score);
  const videos = Array.isArray(data.recent_videos) ? data.recent_videos : [];
  const avgViews = videos.length ? Math.round(videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0) / videos.length) : 0;
  const rate = (key) => {
    const withViews = videos.filter((v) => Number(v.views) > 0);
    return withViews.length ? withViews.reduce((sum, v) => sum + ((Number(v[key]) || 0) / Number(v.views)) * 100, 0) / withViews.length : 0;
  };
  const tabs = PLAYBOOK.filter(([key]) => (insights[key] || []).length > 0);
  const [tab, setTab] = useState(null);
  const activeTab = tabs.find(([key]) => key === tab) ? tab : tabs[0]?.[0];
  const actions = insights.immediate_actions || [];
  const [done, setDone] = useState(() => new Set());
  const toggle = (i) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="an-report" data-testid="channel-report">
      {/* Where the channel stands */}
      <section className="smb-card an-summary">
        <div className="an-health" style={{ "--p": score ?? 0 }}>
          <b>{score ?? "–"}</b>
          <span>/100</span>
        </div>
        <div className="min-w-0">
          <p className="smb-eyebrow">Channel health · {healthWord(score)}</p>
          <h3 className="an-channel">{data.channel_name}</h3>
          {verdict ? <p className="smb-t2 text-sm">{verdict}</p> : null}
        </div>
        <div className="an-stats">
          <Stat label="Subscribers" value={compact.format(data.subscriber_count)} />
          <Stat label="Total views" value={compact.format(data.total_views)} />
          <Stat label="Videos" value={compact.format(data.total_videos)} />
          <Stat label="Avg views" value={compact.format(avgViews)} hint={`last ${videos.length} uploads`} />
          <Stat label="Like rate" value={`${rate("likes").toFixed(1)}%`} hint="likes per view" />
          <Stat label="Comment rate" value={`${rate("comments").toFixed(2)}%`} hint="comments per view" />
        </div>
      </section>

      {/* Upload by upload: views against your average, title patterns and reviews */}
      <UploadInsights data={data} />

      {/* What to do next */}
      {insights.growth_roadmap || actions.length ? (
        <section className="smb-card an-next">
          <div className="smb-card-head">
            <h3 className="smb-card-title">Do this next</h3>
            {actions.length ? (
              <span className="smb-mono smb-t3 text-xs">
                {done.size}/{actions.length} done
              </span>
            ) : null}
          </div>
          {insights.growth_roadmap ? <p className="an-goal">{insights.growth_roadmap}</p> : null}
          {actions.length ? (
            <ol className="an-actions">
              {actions.map((action, i) => (
                <li key={i}>
                  <button type="button" role="checkbox" aria-checked={done.has(i)} className={done.has(i) ? "is-done" : ""} onClick={() => toggle(i)}>
                    <span className="pro-check">{done.has(i) ? <Check className="h-3 w-3" /> : null}</span>
                    <span className="smb-mono smb-t3">{String(i + 1).padStart(2, "0")}</span>
                    <span className="an-action-text">{action}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}

      {/* What works, what doesn't */}
      {(insights.what_works || []).length || (insights.critical_issues || []).length ? (
        <div className="smb-grid2">
          <section className="smb-card">
            <div className="smb-card-head">
              <h3 className="smb-card-title">Working well</h3>
              <span className="smb-pill smb-pill--ok">Keep doing</span>
            </div>
            <ul className="an-list an-list--ok">
              {(insights.what_works || []).map((point, i) => (
                <li key={i}>
                  <Check aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </section>
          <section className="smb-card">
            <div className="smb-card-head">
              <h3 className="smb-card-title">Holding you back</h3>
              <span className="smb-pill smb-pill--bad">Fix</span>
            </div>
            <ul className="an-list an-list--bad">
              {(insights.critical_issues || []).map((issue, i) => (
                <li key={i}>
                  <CircleAlert aria-hidden="true" />
                  {issue}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {/* The longer playbook, one topic at a time */}
      {tabs.length ? (
        <section className="smb-card">
          <div className="smb-card-head an-playbook-head">
            <h3 className="smb-card-title">Playbook</h3>
            <div className="pro-seg" role="tablist" aria-label="Playbook topics">
              {tabs.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={activeTab === key} className={activeTab === key ? "is-active" : ""} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ol className="an-playbook" key={activeTab}>
            {(insights[activeTab] || []).map((tip, i) => (
              <li key={i}>
                <span className="smb-mono smb-t3">{String(i + 1).padStart(2, "0")}</span>
                {tip}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
};

export default ChannelReport;
