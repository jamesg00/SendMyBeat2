import React, { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import { apiError, fetchPro, startStylePlan, useLoad } from "@/components/pros/prosData";

// Copy their style: pick the moves that fit you and see your next 14 days. They become your plan,
// shown on Create and Profile; upload steps tick themselves off. A new plan replaces the old one.

const DAY = 24 * 60 * 60 * 1000;

/** Spread `count` uploads evenly over the next 14 days, starting today. */
const uploadDays = (count) => {
  const days = new Set();
  for (let i = 0; i < Math.min(count, 14); i += 1) days.add(Math.floor((i * 14) / count));
  return days;
};

const ProPlanPage = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pro = useLoad(() => fetchPro(id), [id]);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleShellSelect = (tab) => {
    if (tab === "spotlight") navigate("/spotlight?view=pros");
    else navigate(`/dashboard?tab=${tab}`);
  };

  const p = pro.data;
  const preset = p ? (params.get("moves") || "").split(",").filter((m) => p.moves.some((x) => x.id === m)) : [];
  const chosen = picked ?? (preset.length ? preset : (p?.moves || []).slice(0, 2).map((m) => m.id));
  const toggle = (moveId) => setPicked(chosen.includes(moveId) ? chosen.filter((x) => x !== moveId) : [...chosen, moveId]);
  const picks = (p?.moves || []).filter((m) => chosen.includes(m.id));
  const steps = picks.flatMap((m) => m.steps);
  const uploads = Math.max(0, ...picks.map((m) => m.uploads));
  const onDays = uploadDays(uploads);
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getTime() - offset * DAY);

  const start = async () => {
    if (!chosen.length || busy) return;
    setBusy(true);
    try {
      await startStylePlan(p.id, chosen);
      toast.success(`Your ${p.name} plan is on`);
      navigate("/dashboard");
    } catch (error) {
      toast.error(apiError(error, "Could not start the plan"));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell
        active="spotlight"
        onSelect={handleShellSelect}
        title={p ? `Your 14 days, ${p.name}'s way` : "Copy their style"}
        crumb="Spotlight · Pros · Copy their style"
        onAdmin={(path) => navigate(path)}
      >
        <div className="space-y-6">
          <Link to={`/pros/${id}`} className="inline-flex items-center gap-2 smb-t2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to {p?.name || "the producer"}
          </Link>

          {!p ? (
            pro.error ? <p className="smb-danger text-sm">{pro.error}</p> : <p className="smb-t3 text-sm">Loading…</p>
          ) : p.locked ? (
            <section className="smb-card">
              <h3 className="smb-card-title">Copying a style is part of Pro</h3>
              <Button asChild className="smb-btn smb-btn--pri">
                <a href="/dashboard?plans=pro">See Pro</a>
              </Button>
            </section>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
              <div className="space-y-6">
                <section className="smb-card">
                  <div className="smb-card-head">
                    <h3 className="smb-card-title">Pick the moves</h3>
                    <span className="smb-mono smb-t3 text-xs">{chosen.length} picked</span>
                  </div>
                  <div className="smb-opts">
                    {p.moves.map((m) => {
                      const on = chosen.includes(m.id);
                      return (
                        <button key={m.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(m.id)} className={`smb-opt ${on ? "is-active" : ""}`}>
                          <span className={`pro-check ${on ? "is-on" : ""}`}>{on ? <Check className="h-3 w-3" /> : null}</span>
                          <span className="smb-opt-body">
                            <b>{m.title}</b>
                            <span className="smb-t2 text-sm block">{m.body}</span>
                          </span>
                          <span className="smb-mono smb-t3 text-xs">{m.uploads ? `${m.uploads} uploads` : "one-off"}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="smb-card">
                  <div className="smb-card-head">
                    <h3 className="smb-card-title">Your next 14 days</h3>
                    <span className="smb-mono smb-t3 text-xs">{uploads ? `${uploads} uploads` : "no upload target"}</span>
                  </div>
                  <div className="pro-cal">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={i} className="smb-mono smb-t3 text-xs text-center">{d}</span>
                    ))}
                    {Array.from({ length: 21 }, (_, n) => {
                      const day = n - offset; // days from today
                      const inRange = day >= 0 && day < 14;
                      const on = inRange && onDays.has(day);
                      const date = new Date(monday.getTime() + n * DAY);
                      return (
                        <span
                          key={n}
                          className={`pro-day ${inRange ? "" : "is-out"} ${on ? (day < 7 ? "is-up" : "is-up-later") : ""}`}
                          aria-label={on ? `Upload on ${date.toDateString()}` : undefined}
                        >
                          {on ? "↑" : date.getDate()}
                        </span>
                      );
                    })}
                  </div>
                </section>

                {steps.length ? (
                  <section className="pro-plan">
                    <p className="smb-eyebrow smb-acc">Your plan · {steps.length} steps</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <p className="smb-t3 text-xs">Upload steps tick themselves off from your SendMyBeat uploads.</p>
                  </section>
                ) : (
                  <p className="smb-t2 text-sm">Pick at least one move.</p>
                )}

                <Button onClick={start} disabled={!chosen.length || busy} className="smb-btn smb-btn--pri smb-btn--lg smb-btn--full">
                  {busy ? "Starting…" : "Start my 14 days"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </div>
  );
};

export default ProPlanPage;
