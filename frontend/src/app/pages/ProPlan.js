import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import * as api from "@/app/api";
import { useRequest } from "@/app/store";
import { Button, Spinner } from "@/app/ui";

// Copy their style: pick the moves that fit you and see your next 14 days; they become your plan
// (shown on Workflow and Profile, with upload steps ticking themselves off). Starting a plan
// replaces the one you had.

const DAY = 24 * 60 * 60 * 1000;

/** Spread `count` uploads evenly over the next 14 days, starting today. */
function uploadDays(count) {
  const days = new Set();
  for (let i = 0; i < Math.min(count, 14); i++) days.add(Math.floor((i * 14) / count));
  return days;
}

export default function ProPlan() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pro = useRequest(() => api.pro(id), [id]);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!pro.data) {
    return (
      <main className="s-screen" style={{ alignItems: "center", paddingTop: 80 }}>
        {pro.error ? <span className="s-body">{pro.error}</span> : <Spinner />}
      </main>
    );
  }
  const p = pro.data;
  // Moves picked on the previous page start ticked; otherwise the first two.
  const preset = (params.get("moves") ?? "").split(",").filter((m) => p.moves.some((x) => x.id === m));
  const chosen = picked ?? (preset.length ? preset : p.moves.slice(0, 2).map((m) => m.id));
  const toggle = (moveId) => setPicked(chosen.includes(moveId) ? chosen.filter((x) => x !== moveId) : [...chosen, moveId]);
  const picks = p.moves.filter((m) => chosen.includes(m.id));
  const steps = picks.flatMap((m) => m.steps);
  const uploads = Math.max(0, ...picks.map((m) => m.uploads));
  const onDays = uploadDays(uploads);
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  const first = new Date(today.getTime() - offset * DAY); // Monday of this week

  const start = async () => {
    if (!chosen.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.createStylePlan(p.id, chosen);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Could not start the plan.");
      setBusy(false);
    }
  };

  return (
    <main className="s-screen" style={{ maxWidth: 560 }}>
      <div className="s-row-between">
        <button type="button" className="s-link" style={{ color: "var(--t2)", fontSize: 16, fontWeight: 400 }} onClick={() => navigate(-1)}>
          Cancel
        </button>
        <span className="s-display" style={{ fontSize: 17 }}>
          Copy their style
        </span>
        <span style={{ width: 52 }} />
      </div>
      <div className="s-stack" style={{ gap: 4 }}>
        <h1 className="s-display" style={{ fontSize: 30, lineHeight: "34px", letterSpacing: -0.8 }}>
          Your 14 days,
          <br />
          {p.name}’s way
        </h1>
        <p className="s-body">Pick the moves. We fill your calendar.</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {p.moves.map((m) => (
          <button key={m.id} type="button" role="checkbox" aria-checked={chosen.includes(m.id)} className="s-pick" onClick={() => toggle(m.id)} title={m.body}>
            {m.title}
          </button>
        ))}
      </div>

      <div className="s-card s-panel" style={{ padding: 14, gap: 8 }}>
        <div className="s-row-between">
          <span className="s-label">Your next 14 days</span>
          <span className="s-mono" style={{ color: "var(--t3)", fontSize: 12 }}>
            {uploads ? `${uploads} uploads` : "no upload target"}
          </span>
        </div>
        <div className="s-week">
          {"MTWTFSS".split("").map((d, i) => (
            <span key={i} className="s-mono" style={{ textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
              {d}
            </span>
          ))}
        </div>
        {[0, 1, 2].map((w) => (
          <div key={w} className="s-week">
            {Array.from({ length: 7 }, (_, d) => {
              const day = w * 7 + d - offset; // days from today
              const inRange = day >= 0 && day < 14;
              const on = inRange && onDays.has(day);
              const date = new Date(first.getTime() + (w * 7 + d) * DAY);
              return (
                <span
                  key={d}
                  className="s-day"
                  aria-label={on ? `Upload on ${date.toDateString()}` : undefined}
                  style={{ opacity: inRange ? 1 : 0.25, ...(on ? { background: day < 7 ? "var(--acc)" : "var(--acc-line)", color: day < 7 ? "var(--on-acc)" : "var(--text)" } : null) }}>
                  {on ? "↑" : date.getDate()}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {steps.length ? (
        <div className="s-accent-panel" style={{ gap: 8 }}>
          <span className="s-kicker">YOUR PLAN · {steps.length} STEPS</span>
          {steps.map((step, i) => (
            <p key={step} style={{ fontSize: 14, lineHeight: "20px" }}>
              {i + 1}. {step}
            </p>
          ))}
          <p className="s-muted">Upload steps tick themselves off from your SendMyBeat uploads.</p>
        </div>
      ) : (
        <p className="s-body">Pick at least one move.</p>
      )}
      {error ? <span className="s-error">{error}</span> : null}
      <Button title={busy ? "Starting…" : "Start my 14 days"} disabled={!chosen.length || busy} onClick={() => void start()} />
    </main>
  );
}
