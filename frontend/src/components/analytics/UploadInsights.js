import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// The upload-by-upload detail from the app's Analytics tab: views against your own average with a
// chart you can scrub, which titles win and lose, and a review with a better title for each upload.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const pct = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v))}%`;
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" }) : "");

// 0, half and a rounded-up top value for the y axis.
const niceMax = (v) => {
  if (v <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= v) || 10;
  return step * mag;
};

// Views per upload with the average as a dashed line and below-average uploads in red.
// Moving across it (or the arrow keys) picks the nearest upload.
const ViewsChart = ({ uploads, avg, selected, onSelect }) => {
  const box = useRef(null);
  const w = 640;
  const h = 210;
  const left = 50;
  const right = w - 10;
  const top = 12;
  const bottom = h - 24;
  const max = niceMax(Math.max(avg, ...uploads.map((u) => u.views)));
  const x = (i) => (uploads.length === 1 ? (left + right) / 2 : left + (i / (uploads.length - 1)) * (right - left));
  const y = (v) => bottom - (v / max) * (bottom - top);
  const label = { fill: "var(--c-t3)", fontSize: 11, fontFamily: "var(--font-mono)" };

  const pick = (e) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || uploads.length < 2) return;
    const px = ((e.clientX - rect.left) / rect.width) * w;
    onSelect(Math.max(0, Math.min(uploads.length - 1, Math.round(((px - left) / (right - left)) * (uploads.length - 1)))));
  };

  return (
    <svg
      ref={box}
      viewBox={`0 0 ${w} ${h}`}
      className="an-chart"
      role="slider"
      tabIndex={0}
      aria-label="Views per upload"
      aria-valuemin={1}
      aria-valuemax={uploads.length}
      aria-valuenow={selected + 1}
      aria-valuetext={`${compact.format(uploads[selected]?.views || 0)} views`}
      onPointerMove={pick}
      onPointerDown={pick}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSelect(Math.min(uploads.length - 1, selected + 1));
        if (e.key === "ArrowLeft") onSelect(Math.max(0, selected - 1));
      }}
    >
      {[max, max / 2, 0].map((t) => (
        <g key={t}>
          <line x1={left} y1={y(t)} x2={w} y2={y(t)} stroke={t === 0 ? "var(--c-line)" : "var(--c-line-soft)"} />
          <text x={left - 6} y={y(t) + 4} textAnchor="end" {...label}>{compact.format(t)}</text>
        </g>
      ))}
      {avg > 0 ? (
        <>
          <line x1={left} y1={y(avg)} x2={right} y2={y(avg)} stroke="var(--c-t3)" strokeDasharray="4 4" />
          <text x={right} y={y(avg) - 6} textAnchor="end" {...label} fill="var(--c-t2)">avg {compact.format(avg)}</text>
        </>
      ) : null}
      <line x1={x(selected)} y1={top} x2={x(selected)} y2={bottom} stroke="var(--c-line)" />
      <polyline points={uploads.map((u, i) => `${x(i)},${y(u.views)}`).join(" ")} fill="none" stroke="var(--c-text)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {uploads.map((u, i) => {
        const color = u.views >= avg ? "var(--c-text)" : "var(--c-danger)";
        return <circle key={i} cx={x(i)} cy={y(u.views)} r={i === selected ? 5.5 : 3.5} fill={i === selected ? "var(--c-bg)" : color} stroke={color} strokeWidth={i === selected ? 2.5 : 0} />;
      })}
      <text x={left} y={h - 5} {...label}>{day(uploads[0]?.published_at)}</text>
      <text x={right} y={h - 5} textAnchor="end" {...label}>{day(uploads[uploads.length - 1]?.published_at)}</text>
    </svg>
  );
};

const UploadRow = ({ upload, avg, open, onToggle }) => {
  const review = upload.review;
  const weak = review?.verdict ? /weak/i.test(review.verdict) : upload.views < avg;
  const diff = avg > 0 ? ((upload.views - avg) / avg) * 100 : 0;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(review.better_title);
      toast.success("Title copied");
    } catch (error) {
      toast.error("Could not copy the title");
    }
  };
  return (
    <div className="an-upload">
      <button type="button" className="an-upload-head" onClick={onToggle} aria-expanded={open}>
        <i className={`tag-dot ${weak ? "" : "tag-dot--high"}`} style={weak ? { background: "var(--c-danger)" } : undefined} />
        <span className={`flex-1 min-w-0 ${open ? "" : "truncate"}`}>{upload.title}</span>
        <span className="text-right">
          <span className="smb-mono block">{compact.format(upload.views)}</span>
          <span className={`smb-mono text-xs ${diff >= 0 ? "smb-acc" : "smb-danger"}`}>{pct(diff)}</span>
        </span>
      </button>
      {open ? (
        <div className="an-upload-body">
          {review?.reason ? <p>{review.reason}</p> : <p className="smb-t3">No review for this upload.</p>}
          {review?.fix ? (
            <p>
              <b style={{ color: "var(--c-text)" }}>Fix: </b>
              {review.fix}
            </p>
          ) : null}
          {review?.better_title ? (
            <div className="an-better">
              <span className="flex-1 min-w-0">
                <span className="smb-eyebrow block">Better title</span>
                <span className="smb-mono text-sm break-words" style={{ color: "var(--c-text)" }}>{review.better_title}</span>
              </span>
              <Button type="button" onClick={copy} className="smb-btn smb-btn--sec smb-btn--sm">Copy</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const UploadInsights = ({ data }) => {
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(null);

  // The server lists uploads newest first and numbers its reviews the same way (1 = newest).
  const reviews = Array.isArray(data?.insights?.video_reviews) ? data.insights.video_reviews : [];
  const newestFirst = (data?.recent_videos || []).map((v, i) => ({ ...v, views: Number(v.views) || 0, n: i + 1, review: reviews.find((r) => r.index === i + 1) }));
  if (!newestFirst.length) return null;
  const uploads = [...newestFirst].reverse(); // oldest → newest for the chart
  const mean = (xs) => (xs.length ? xs.reduce((a, v) => a + v.views, 0) / xs.length : 0);
  const avg = mean(uploads);
  const half = Math.floor(uploads.length / 2);
  const older = mean(uploads.slice(0, half));
  const newer = mean(uploads.slice(uploads.length - half));
  const trend = half > 0 && older > 0 ? ((newer - older) / older) * 100 : null;
  const sel = selected ?? uploads.length - 1;
  const current = uploads[sel];
  const patterns = data?.insights?.title_patterns;

  return (
    <div className="smb-grid2" data-testid="upload-insights">
      <section className="smb-card">
        <div className="smb-card-head">
          <h3 className="smb-card-title">{sel === uploads.length - 1 ? "Latest upload" : `Upload ${uploads.length - sel} of ${uploads.length}`}</h3>
          {trend !== null ? (
            <span className={`smb-pill ${trend >= 0 ? "smb-pill--ok" : "smb-pill--bad"}`}>
              {trend >= 0 ? "↗" : "↘"} {pct(trend)} recent
            </span>
          ) : null}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{compact.format(current.views)}</span>
            <span className="smb-t2">views</span>
            {avg > 0 ? <span className={`smb-mono ml-auto text-sm ${current.views >= avg ? "smb-acc" : "smb-danger"}`}>{pct(((current.views - avg) / avg) * 100)} vs your average</span> : null}
          </div>
          <p className="smb-t2 text-sm mt-1">
            {current.title}
            {current.published_at ? ` · ${day(current.published_at)}` : ""}
          </p>
        </div>
        <ViewsChart uploads={uploads} avg={avg} selected={sel} onSelect={setSelected} />
        <p className="smb-t3 text-xs">Move across the chart to see each upload. Red dots are below your average.</p>

        {patterns?.winning || patterns?.losing ? (
          <div>
            {patterns.winning ? (
              <div className="an-pattern">
                <i style={{ background: "var(--c-acc)" }} />
                <span>
                  <span className="smb-eyebrow block">Titles that win</span>
                  <span className="text-sm">{patterns.winning}</span>
                </span>
              </div>
            ) : null}
            {patterns.losing ? (
              <div className="an-pattern">
                <i style={{ background: "var(--c-danger)" }} />
                <span>
                  <span className="smb-eyebrow block">Titles that lose</span>
                  <span className="text-sm">{patterns.losing}</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="smb-card">
        <div className="smb-card-head">
          <h3 className="smb-card-title">Latest {newestFirst.length} uploads</h3>
          <span className="smb-mono smb-t3 text-xs">click one for its review</span>
        </div>
        <div>
          {newestFirst.map((v) => (
            <UploadRow
              key={v.n}
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
      </section>
    </div>
  );
};

export default UploadInsights;
