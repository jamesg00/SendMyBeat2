import { useRef, useState } from "react";

import * as api from "@/app/api";
import { copyText, openPaywall, refreshSubscription, requireCredit, useFlash, useSubscription } from "@/app/store";
import { Button, Card, JobProgress, Screen, compact } from "@/app/ui";

// Analytics: your latest uploads against your own average, and what to fix (the app's third tab).

const list = (x) => (Array.isArray(x) ? x.filter((s) => typeof s === "string" && s.trim() !== "") : []);
const pct = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v))}%`;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" }) : "");

// The last analysis stays on screen while you look at other tabs.
let cached = null;

export default function AnalyticsPage() {
  const sub = useSubscription();
  if (sub && !sub.pro_access) return <AnalyticsLocked trialAvailable={!!sub.trial_available} />;
  return <Analytics />;
}

// Channel analytics are part of Pro.
function AnalyticsLocked({ trialAvailable }) {
  return (
    <Screen title="Analytics">
      <div className="s-stack" style={{ gap: 12, paddingTop: 12, maxWidth: 520 }}>
        <h2 className="s-display" style={{ fontSize: 22, lineHeight: "27px" }}>
          See what’s working on your channel
        </h2>
        <p style={{ color: "var(--t2)", fontSize: 14.5, lineHeight: "21px" }}>Pro reads your latest uploads: views against your average, which titles hold you back, and what to fix next.</p>
        <Button title={trialAvailable ? "Start with the free trial" : "See Pro"} onClick={() => openPaywall(trialAvailable ? "needs_plan" : "needs_pro")} />
      </div>
    </Screen>
  );
}

function Analytics() {
  const [data, setData] = useState(cached);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(null);

  const analyze = async () => {
    if (!requireCredit("ai")) return;
    setJob({ startedAt: Date.now(), progress: 0 });
    setError(null);
    try {
      cached = await api.analyzeChannel((progress) => setJob((j) => j && { ...j, progress }));
      setData(cached);
      setSelected(null);
      setOpen(null);
    } catch (e) {
      setError(e.message || "Channel analysis failed.");
    } finally {
      setJob(null);
      void refreshSubscription();
    }
  };

  // The server lists uploads newest first and numbers its reviews the same way (1 = newest).
  const reviews = data?.insights?.video_reviews ?? [];
  const newestFirst = (data?.recent_videos ?? []).map((v, i) => ({ ...v, views: v.views ?? 0, n: i + 1, review: reviews.find((r) => r.index === i + 1) }));
  const uploads = [...newestFirst].reverse(); // oldest → newest for the chart
  const mean = (xs) => (xs.length ? xs.reduce((a, v) => a + v.views, 0) / xs.length : 0);
  const avg = mean(uploads);
  const half = Math.floor(uploads.length / 2);
  const older = uploads.slice(0, half);
  const newer = uploads.slice(uploads.length - half);
  const trend = half > 0 && mean(older) > 0 ? ((mean(newer) - mean(older)) / mean(older)) * 100 : null;

  const sel = selected ?? uploads.length - 1;
  const current = uploads[sel];
  const health = typeof data?.insights?.channel_health_score === "string" ? data.insights.channel_health_score : "";
  const patterns = data?.insights?.title_patterns;
  const fixes = [...list(data?.insights?.critical_issues), ...list(data?.insights?.immediate_actions)];

  return (
    <Screen title="Analytics" wide={!!data} accessory={data && !job ? <Button title="Refresh" variant="secondary" size="sm" onClick={() => void analyze()} /> : null}>
      {data ? (
        <>
          <p className="s-sub" style={{ marginTop: -14 }}>
            {data.channel_name} · {compact.format(data.subscriber_count)} subscribers
          </p>
          <div className="s-cols">
            <div className="s-col">
              {current ? (
                <div className="s-stack" style={{ gap: 14 }}>
                  <div className="s-stack" style={{ gap: 6 }}>
                    <div className="s-row-between">
                      <span className="s-label">
                        {sel === uploads.length - 1 ? "Latest upload" : `Upload ${uploads.length - sel} of ${uploads.length}`} · {day(current.published_at)}
                      </span>
                      {trend !== null ? (
                        <span style={{ font: "500 12px var(--mono)", color: trend >= 0 ? "var(--acc)" : "var(--danger)" }}>
                          {trend >= 0 ? "↗" : "↘"} {pct(trend)} recent
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 40, lineHeight: "44px", letterSpacing: -1.4, fontWeight: 700 }}>{compact.format(current.views)}</span>
                      <span style={{ color: "var(--t2)" }}>views</span>
                      {avg > 0 ? <span style={{ marginLeft: "auto", font: "500 13px var(--mono)", color: current.views >= avg ? "var(--acc)" : "var(--danger)" }}>{pct(((current.views - avg) / avg) * 100)} vs avg</span> : null}
                    </div>
                    <p className="s-body s-clamp2">{current.title}</p>
                  </div>
                  <ViewsChart uploads={uploads} avg={avg} selected={sel} onSelect={setSelected} />
                  <p className="s-muted" style={{ marginTop: -6 }}>
                    Move across the chart to see each upload.
                  </p>
                </div>
              ) : null}

              {health ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "12px 0", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  <span style={{ font: "500 20px var(--mono)" }}>{health.split(/\s[-–]\s/)[0]}</span>
                  <span className="s-sub" style={{ flex: 1 }}>
                    {health.split(/\s[-–]\s/).slice(1).join(" – ") || "Channel health"}
                  </span>
                </div>
              ) : null}

              {patterns?.winning || patterns?.losing ? (
                <div className="s-list">
                  {patterns.winning ? <Pattern color="var(--acc)" label="Titles that win" text={patterns.winning} /> : null}
                  {patterns.losing ? <Pattern color="var(--danger)" label="Titles that lose" text={patterns.losing} /> : null}
                </div>
              ) : null}

              <Bullets title="Fix next" color="var(--danger)" items={fixes} numbered />
              <Bullets title="Working well" color="var(--acc)" items={list(data.insights?.what_works)} />
            </div>

            <div className="s-col">
              {newestFirst.length > 0 ? (
                <div>
                  <div className="s-label" style={{ paddingBottom: 8 }}>
                    Latest {newestFirst.length} uploads
                  </div>
                  {newestFirst.map((v) => (
                    <UploadRow
                      key={v.id ?? v.n}
                      upload={v}
                      avg={avg}
                      open={open === v.n}
                      onToggle={() => {
                        setOpen(open === v.n ? null : v.n);
                        setSelected(uploads.length - v.n);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : job ? null : (
        <Card style={{ maxWidth: 520 }}>
          <span className="s-card-title">Channel analytics</span>
          <p className="s-body">
            Looks at your latest 10 uploads and their titles, shows which ones win attention, and gives a fix and a better title for the ones that don’t. Uses 1 AI credit and needs YouTube connected.
          </p>
          <Button title="Analyze my channel" onClick={() => void analyze()} />
        </Card>
      )}

      {job ? (
        <div style={{ maxWidth: 520, width: "100%" }}>
          <JobProgress title="Analyzing your latest uploads" startedAt={job.startedAt} expectedSec={30} progress={job.progress} steps={["Loading your latest 10 uploads", "Comparing titles with views", "Writing fixes for weak titles"]} />
        </div>
      ) : null}
      {error ? <span className="s-error">{error}</span> : null}
    </Screen>
  );
}

// 0, half and a rounded-up top value for the y axis.
function niceMax(v) {
  if (v <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= v) ?? 10;
  return step * mag;
}

// Views per upload with a y axis, the average as a dashed line, and below-average uploads in red.
// Moving across it (or the arrow keys) picks the nearest upload.
function ViewsChart({ uploads, avg, selected, onSelect }) {
  const box = useRef(null);
  const w = 600;
  const h = 200;
  const gutter = 44;
  const top = 12;
  const bottom = h - 24;
  const left = gutter + 6;
  const right = w - 10;
  const max = niceMax(Math.max(avg, ...uploads.map((u) => u.views)));
  const x = (i) => (uploads.length === 1 ? (left + right) / 2 : left + (i / (uploads.length - 1)) * (right - left));
  const y = (v) => bottom - (v / max) * (bottom - top);
  const pts = uploads.map((u, i) => `${x(i)},${y(u.views)}`).join(" ");
  const text = { fill: "var(--t3)", fontSize: 11, fontFamily: "var(--mono)" };

  const pick = (e) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || uploads.length < 2) return;
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const i = Math.round(((px - left) / (right - left)) * (uploads.length - 1));
    onSelect(Math.max(0, Math.min(uploads.length - 1, i)));
  };

  return (
    <svg
      ref={box}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: "auto", touchAction: "pan-y", cursor: "crosshair" }}
      role="slider"
      tabIndex={0}
      aria-label="Views per upload"
      aria-valuemin={1}
      aria-valuemax={uploads.length}
      aria-valuenow={selected + 1}
      aria-valuetext={`${compact.format(uploads[selected]?.views ?? 0)} views`}
      onPointerMove={pick}
      onPointerDown={pick}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSelect(Math.min(uploads.length - 1, selected + 1));
        if (e.key === "ArrowLeft") onSelect(Math.max(0, selected - 1));
      }}>
      {[max, max / 2, 0].map((t) => (
        <g key={t}>
          <line x1={left} y1={y(t)} x2={w} y2={y(t)} stroke={t === 0 ? "var(--line)" : "var(--card2)"} />
          <text x={gutter - 2} y={y(t) + 4} textAnchor="end" {...text}>
            {compact.format(t)}
          </text>
        </g>
      ))}
      {avg > 0 ? (
        <>
          <line x1={left} y1={y(avg)} x2={right} y2={y(avg)} stroke="var(--t3)" strokeDasharray="4 4" />
          <text x={right} y={y(avg) - 5} textAnchor="end" {...text} fill="var(--t2)">
            avg {compact.format(avg)}
          </text>
        </>
      ) : null}
      <line x1={x(selected)} y1={top} x2={x(selected)} y2={bottom} stroke="var(--line)" />
      <polyline points={pts} fill="none" stroke="var(--text)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {uploads.map((u, i) => {
        const color = u.views >= avg ? "var(--text)" : "var(--danger)";
        return <circle key={u.id ?? i} cx={x(i)} cy={y(u.views)} r={i === selected ? 5.5 : 3.5} fill={i === selected ? "var(--bg)" : color} stroke={color} strokeWidth={i === selected ? 2.5 : 0} />;
      })}
      <text x={left} y={h - 5} {...text}>
        {day(uploads[0]?.published_at)}
      </text>
      <text x={right} y={h - 5} textAnchor="end" {...text}>
        {day(uploads[uploads.length - 1]?.published_at)}
      </text>
    </svg>
  );
}

function Pattern({ color, label, text }) {
  return (
    <div className="s-row" style={{ alignItems: "stretch", padding: 14 }}>
      <span style={{ width: 3, borderRadius: 2, background: color, flex: "none" }} />
      <span className="s-row-main" style={{ gap: 3 }}>
        <span style={{ color: "var(--t2)", fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span className="s-body">{text}</span>
      </span>
    </div>
  );
}

function UploadRow({ upload, avg, open, onToggle }) {
  const [copied, flashCopied] = useFlash();
  const r = upload.review;
  const weak = r?.verdict ? /weak/i.test(r.verdict) : upload.views < avg;
  const diff = avg > 0 ? ((upload.views - avg) / avg) * 100 : 0;
  return (
    <div style={{ borderTop: "1px solid var(--line-soft)" }} className="s-upload">
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 0", cursor: "pointer" }}>
        <span style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: weak ? "var(--danger)" : "var(--acc)" }} />
        <span className={open ? undefined : "s-truncate"} style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: "19px" }}>
          {upload.title}
        </span>
        <span style={{ textAlign: "right" }}>
          <span className="s-mono" style={{ display: "block", color: "var(--text)", fontSize: 13 }}>
            {compact.format(upload.views)}
          </span>
          <span style={{ font: "400 11px var(--mono)", color: diff >= 0 ? "var(--acc)" : "var(--danger)" }}>{pct(diff)}</span>
        </span>
      </button>
      {open ? (
        <div className="s-stack" style={{ gap: 10, padding: "0 0 14px 17px" }}>
          {r?.reason ? <p className="s-body">{r.reason}</p> : <p className="s-muted">No review for this upload.</p>}
          {r?.fix ? (
            <p className="s-body">
              <b style={{ color: "var(--text)" }}>Fix: </b>
              {r.fix}
            </p>
          ) : null}
          {r?.better_title ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: "var(--r-ctl)", border: "1px solid var(--line)", background: "var(--card)" }}>
              <span className="s-row-main" style={{ gap: 3 }}>
                <span style={{ color: "var(--t2)", fontSize: 12, fontWeight: 500 }}>Better title</span>
                <span style={{ font: "400 13px/19px var(--mono)", color: "var(--t2)", overflowWrap: "anywhere" }}>{r.better_title}</span>
              </span>
              <Button
                title={copied ? "Copied" : "Copy"}
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (await copyText(r.better_title)) flashCopied();
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Bullets({ title, color, items, numbered }) {
  if (items.length === 0) return null;
  return (
    <div className="s-stack" style={{ gap: 12 }}>
      <span className="s-label">{title}</span>
      {items.slice(0, 6).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          {numbered ? (
            <span className="s-mono" style={{ color, width: 16, fontSize: 13 }}>
              {i + 1}
            </span>
          ) : (
            <span style={{ width: 3, borderRadius: 2, background: color, flex: "none" }} />
          )}
          <p className="s-body" style={{ flex: 1 }}>
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}
