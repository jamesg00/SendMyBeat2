import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import * as api from "@/app/api";
import { VerifiedBadge } from "@/app/producer";
import { requirePro, useRequest } from "@/app/store";
import { Button, Card, Meter, Ring, Spinner, compact, cx } from "@/app/ui";

// The Pros tab: producers who made it on YouTube, and the plan you copied from one of them
// (mobile/src/components/pros.tsx). Pictures: a press photo used with permission (credited),
// else their YouTube channel picture, else the still from their most-viewed upload.

/** Where "Copy their style" goes (a Pro feature: without Pro the plans open instead). */
export function useCopyPro() {
  const navigate = useNavigate();
  return (id, moves) => {
    if (!requirePro()) return;
    navigate(`/pros/${id}/plan${moves?.length ? `?moves=${moves.join(",")}` : ""}`);
  };
}

/** Your active plan. */
export function usePlan() {
  const req = useRequest(api.stylePlan);
  return { plan: req.data?.plan ?? null, setPlan: (plan) => req.setData(() => ({ plan })), refresh: req.refresh };
}

/** Full-bleed producer picture fading into the page, with whatever sits on the fade as children. */
export function ProHero({ pro, height, scrim, children }) {
  const credit =
    pro.photo_source === "press" ? (pro.photo_credit ?? "Press photo") : pro.photo_source === "youtube" ? "YouTube channel" : pro.photo_source === "video" ? "From their top upload" : null;
  return (
    <div className="s-hero" style={{ height, "--scrim": scrim }}>
      {pro.photo ? (
        <img src={pro.photo} alt={pro.photo_source === "press" ? `${pro.name}, ${credit}` : `${pro.name}’s picture from YouTube`} loading="lazy" />
      ) : (
        <span className="s-monogram">{pro.name.slice(0, 1)}</span>
      )}
      <div className="s-hero-chips">
        <span>{pro.group}</span>
        {credit ? <span>{credit}</span> : null}
      </div>
      {children ? <div className="s-hero-bottom">{children}</div> : null}
    </div>
  );
}

// Pros home: a deck of producer cards you scroll through, then who's closest to your style.
export function ProsGallery() {
  const list = useRequest(api.pros);
  const navigate = useNavigate();
  const copyPro = useCopyPro();
  const deck = useRef(null);
  const [index, setIndex] = useState(0);

  // The card nearest the middle of the deck is the one "in view".
  const onScroll = () => {
    const el = deck.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    Array.from(el.children).forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setIndex(best);
  };
  const go = (i) => deck.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  useEffect(() => {
    onScroll();
  }, [list.data]);

  if (list.loading) return <Spinner />;
  if (list.error || !list.data) {
    return (
      <Card>
        <span className="s-error">{list.error ?? "Could not load the pros."}</span>
        <Button title="Try again" variant="secondary" size="md" onClick={list.reload} />
      </Card>
    );
  }
  const items = list.data.pros;
  const current = items[Math.min(index, items.length - 1)];
  const closest = items.filter((p) => p.match != null).sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  return (
    <div className="s-stack" style={{ gap: 16 }}>
      <div className="s-stack" style={{ gap: 4 }}>
        <span className="s-kicker">PROS · {items.length} PRODUCERS</span>
        <h2 className="s-headline">They blew up on YouTube.</h2>
        <p className="s-body">See why, read their numbers, and copy the moves into your own uploads.</p>
      </div>

      <div className="s-deck" ref={deck} onScroll={onScroll}>
        {items.map((p, i) => (
          <Link key={p.id} to={`/pros/${p.id}`} className={cx("s-deck-card", i === index && "on")} aria-label={`${p.name}. ${p.why ?? p.tagline}`}>
            <ProHero pro={p} height={440} scrim="var(--card2)">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="s-deck-name s-truncate">{p.name}</span>
                {p.verified ? <VerifiedBadge size={22} /> : null}
              </div>
              <span style={{ fontSize: 15, lineHeight: "21px", fontWeight: 500, opacity: 0.9, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.why ?? p.tagline}
              </span>
              <div className="s-deck-stats">
                <div>
                  <b className="s-truncate">{p.subscribers ? compact.format(p.subscribers) : "–"}</b>
                  <small>subscribers</small>
                </div>
                <div>
                  <b className="s-truncate" style={{ color: "var(--acc)" }}>
                    {p.match != null ? `${p.match}%` : "–"}
                  </b>
                  <small>your match</small>
                </div>
                <div>
                  <b className="s-truncate">{p.sound?.[0] ?? "–"}</b>
                  <small>known for</small>
                </div>
              </div>
            </ProHero>
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button type="button" className="s-round" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous producer">
          ‹
        </button>
        <div className="s-dots" aria-hidden="true">
          {items.map((p, i) => (
            <span key={p.id} className={i === index ? "on" : undefined} onClick={() => go(i)} style={{ cursor: "pointer" }} />
          ))}
        </div>
        <button type="button" className="s-round" onClick={() => go(index + 1)} disabled={index >= items.length - 1} aria-label="Next producer">
          ›
        </button>
      </div>
      {current ? (
        <div style={{ display: "flex", gap: 10, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Button title={`Why ${current.name} blew up`} onClick={() => navigate(`/pros/${current.id}`)} style={{ flex: 1, minWidth: 0 }} />
          <Button title="Copy style" variant="secondary" onClick={() => copyPro(current.id)} />
        </div>
      ) : null}

      {closest.length ? (
        <div style={{ maxWidth: 640, width: "100%", alignSelf: "center" }}>
          <div className="s-label" style={{ paddingBottom: 8 }}>
            Closest to your style
          </div>
          {closest.map((p) => (
            <Link key={p.id} to={`/pros/${p.id}`} className="s-hair" aria-label={`${p.name}, ${p.match}% match`}>
              {p.photo ? <img className="s-avatar" style={{ width: 32, height: 32, border: 0 }} src={p.photo} alt="" loading="lazy" /> : <span className="s-avatar" style={{ width: 32, height: 32 }} />}
              <span style={{ width: 130, fontSize: 14.5, fontWeight: 500 }} className="s-truncate">
                {p.name}
              </span>
              <span className="s-bar">
                <span style={{ width: `${p.match ?? 0}%` }} />
              </span>
              <span className="s-mono" style={{ width: 40, textAlign: "right", color: "var(--text)", fontWeight: 500 }}>
                {p.match}%
              </span>
            </Link>
          ))}
          <p className="s-muted" style={{ paddingTop: 8 }}>
            From your SendMyBeat uploads vs their last 50.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const describeStep = (step) => (step.target ? `${step.count ?? 0}/${step.target} · from your uploads` : step.done ? "Done" : "Click when done");

// Your plan: the compact card on Workflow and Spotlight, or the full checklist on Profile.
export function PlanCard({ plan, full, onChange }) {
  const [busy, setBusy] = useState(null);
  const tick = async (step) => {
    if (step.kind !== "manual" || busy) return;
    setBusy(step.id);
    try {
      onChange((await api.tickPlanStep(step.id, !step.done)).plan);
    } finally {
      setBusy(null);
    }
  };
  const end = async () => {
    if (!window.confirm("End this plan? Your ticked steps are cleared.")) return;
    await api.endStylePlan();
    onChange(null);
  };

  return (
    <div className="s-accent-panel">
      <Link to={`/pros/${plan.pro_id}`} style={{ display: "flex", alignItems: "center", gap: 14, color: "inherit", textDecoration: "none" }}>
        <Ring value={plan.total ? plan.done / plan.total : 0} size={56} stroke={6} label={`${plan.done}/${plan.total}`} />
        <span className="s-row-main">
          <span className="s-kicker">YOUR PLAN · {plan.pro_name}’S STYLE</span>
          <span className="s-display s-clamp2" style={{ fontSize: 17, lineHeight: "22px" }}>
            {plan.next ? plan.next.text : "Every step done"}
          </span>
        </span>
        <span className="s-chevron">›</span>
      </Link>
      {full ? (
        <div>
          {plan.steps.map((step) => {
            const manual = step.kind === "manual";
            const Tag = manual ? "button" : "div";
            return (
              <Tag
                key={step.id}
                type={manual ? "button" : undefined}
                role={manual ? "checkbox" : undefined}
                aria-checked={manual ? step.done : undefined}
                onClick={manual ? () => void tick(step) : undefined}
                className="s-hair"
                style={{ minHeight: 56, padding: "8px 0", background: "none", cursor: manual ? "pointer" : "default" }}>
                <span className={cx("s-box", step.done && "on")}>
                  {step.done ? (
                    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M2 6.5 L5 9 L10 3" stroke="var(--on-acc)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                <span className="s-row-main">
                  <span style={{ fontSize: 14.5, lineHeight: "20px", color: step.done ? "var(--t3)" : undefined }}>{step.text}</span>
                  <span className="s-hint">
                    {step.move} · {busy === step.id ? "Saving…" : describeStep(step)}
                  </span>
                </span>
              </Tag>
            );
          })}
          <button type="button" className="s-hair s-hair--last" onClick={() => void end()} style={{ minHeight: 44, color: "var(--danger)", fontSize: 14, fontWeight: 500, background: "none", borderBottom: 0 }}>
            End this plan
          </button>
        </div>
      ) : plan.next ? (
        plan.next.target ? (
          <div className="s-stack" style={{ gap: 6 }}>
            <Meter value={(plan.next.count ?? 0) / plan.next.target} color="var(--acc)" height={3} />
            <span className="s-sub">
              {plan.next.count ?? 0} of {plan.next.target} so far · ticks off from your uploads
            </span>
          </div>
        ) : (
          <span className="s-sub">Tick this off on your Profile when it’s done.</span>
        )
      ) : (
        <span className="s-sub">Pick another producer to keep going.</span>
      )}
    </div>
  );
}
