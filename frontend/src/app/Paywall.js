import { useEffect, useState } from "react";

import * as api from "@/app/api";
import { closePaywall, dollars, manageBilling, refreshSubscription, startPlan, usePaywall, useRequest, useSubscription } from "@/app/store";
import { AppIcon, Button, Sheet, cx } from "@/app/ui";

// The plans, shown as a sheet over whatever you were doing (the app's paywall screen).

// Same words as the app's paywall (mobile/src/app/paywall.tsx).
const HEADLINES = {
  needs_plan: ["Make every upload count", "Tags that rank, descriptions that sell, and uploads straight to YouTube."],
  needs_pro: ["Unlock Pro", "Copy what works for the biggest producers, and see what’s working on your channel."],
  trial_limit: ["That’s today’s trial", "Your credits come back tomorrow, or pick a plan to keep going now."],
  out_of_credits: ["You’re out of credits", "Pro gives you twice the generations and uploads every month."],
};

const ROWS = [
  ["AI generations a month", "50", "100"],
  ["YouTube uploads a month", "50", "100"],
  ["Tags, descriptions, Upload Studio", true, true],
  ["Copy a pro’s style", false, true],
  ["Pro breakdowns and channel analytics", false, true],
  ["Several jobs at once", false, true],
];

const Cell = ({ value }) =>
  value === true ? <span style={{ color: "var(--acc)" }}>✓</span> : value === false ? <span style={{ color: "var(--t3)" }}>–</span> : <span style={{ font: "400 13px var(--mono)" }}>{value}</span>;

export default function Paywall() {
  const paywall = usePaywall();
  return (
    <Sheet open={!!paywall} onClose={closePaywall} wide label="Plans">
      {paywall ? <Plans reason={paywall.reason} message={paywall.message} /> : null}
    </Sheet>
  );
}

function Plans({ reason, message }) {
  const sub = useSubscription();
  const config = useRequest(api.billingConfig);
  const current = sub?.is_subscribed ? (sub.plan === "plus" ? "plus" : "max") : null;
  const [picked, setPicked] = useState(reason === "needs_pro" || reason === "out_of_credits" ? "max" : "plus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    void refreshSubscription();
  }, []);
  // With a plan already, Pro is the one to look at: the upgrade from Plus, or your own plan.
  useEffect(() => {
    if (current) setPicked("max");
  }, [current]);

  const trial = !!sub?.trial_available && !current;
  const [title, lead] = HEADLINES[reason] ?? HEADLINES.needs_plan;
  const price = (id, fallback) => dollars(config.data?.plans?.find((p) => p.id === id)?.price_cents ?? fallback);
  const plus = price("plus", 500);
  const pro = price("max", 1000);
  const founding = config.data?.founding;
  const foundingLeft = sub?.founding_spots_left ?? 0;

  const buy = async (plan, withTrial) => {
    setBusy(true);
    setError(null);
    try {
      if (await startPlan(plan, withTrial)) closePaywall();
    } catch (e) {
      setError(e.message || "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };
  const openBilling = async () => {
    setBusy(true);
    try {
      await manageBilling();
    } catch (e) {
      setError(e.message || "Could not open billing.");
      setBusy(false);
    }
  };

  const isCurrent = picked === current;
  const cta = isCurrent
    ? { title: "Manage billing", onClick: openBilling, secondary: true }
    : current
      ? { title: `Switch to ${picked === "max" ? `Pro · ${pro}` : `Plus · ${plus}`}/month`, onClick: () => buy(picked, false) }
      : picked === "plus" && trial
        ? { title: "Start free trial", onClick: () => buy("plus", true) }
        : { title: `Get ${picked === "max" ? `Pro · ${pro}` : `Plus · ${plus}`}/month`, onClick: () => buy(picked, false) };
  const fine = isCurrent
    ? "Change your card, switch plans or cancel on Stripe."
    : picked === "plus" && trial
      ? `3 days free, 3 generations and 3 uploads a day. Then ${plus}/month. Cancel anytime.`
      : current
        ? "Switches now; Stripe adjusts what you pay this month."
        : "Billed monthly by Stripe. Cancel anytime.";

  return (
    <>
      <div className="s-row-between">
        <AppIcon size={40} />
        <button type="button" onClick={closePaywall} aria-label="Close" className="s-tile" style={{ border: 0, borderRadius: "50%", width: 32, height: 32, color: "var(--t2)", cursor: "pointer" }}>
          ✕
        </button>
      </div>
      <div className="s-stack" style={{ gap: 6 }}>
        <h2 className="s-display" style={{ fontSize: 28, lineHeight: "32px", letterSpacing: -0.5 }}>
          {title}
        </h2>
        <p className="s-body">{message || lead}</p>
      </div>

      <div className="s-plans" role="radiogroup" aria-label="Plan">
        <PlanCard id="plus" name="Plus" price={plus} badge={current === "plus" ? "YOUR PLAN" : trial ? "3 DAYS FREE" : null} picked={picked} onPick={setPicked} />
        <PlanCard id="max" name="Pro" price={pro} badge={current === "max" ? "YOUR PLAN" : "MOST POPULAR"} solid={current !== "max"} picked={picked} onPick={setPicked} />
      </div>

      <div className="s-cmp">
        <div>
          <span>WHAT YOU GET</span>
          <span>PLUS</span>
          <span>PRO</span>
        </div>
        {ROWS.map(([label, a, b]) => (
          <div key={label}>
            <span>{label}</span>
            <Cell value={a} />
            <Cell value={b} />
          </div>
        ))}
      </div>

      {error ? <span className="s-error">{error}</span> : null}
      <div className="s-stack" style={{ gap: 8 }}>
        <Button title={busy ? "One moment…" : cta.title} variant={cta.secondary ? "secondary" : "primary"} disabled={busy || !sub} onClick={() => void cta.onClick()} />
        <p className="s-muted" style={{ textAlign: "center" }}>
          {fine}
        </p>
        {!current && founding && foundingLeft > 0 ? (
          <button type="button" className="s-link" style={{ alignSelf: "center", color: "var(--t2)", fontSize: 13 }} disabled={busy} onClick={() => void buy("founding", false)}>
            Founding member: Pro for {dollars(founding.price_cents)}/{founding.interval} · {foundingLeft} spots left →
          </button>
        ) : null}
      </div>
    </>
  );
}

function PlanCard({ id, name, price, badge, solid, picked, onPick }) {
  return (
    <button type="button" role="radio" aria-checked={picked === id} className="s-plan" onClick={() => onPick(id)}>
      <span className={cx("s-badge", solid && "s-badge--solid")} style={{ visibility: badge ? "visible" : "hidden" }}>
        {badge ?? "–"}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{name}</span>
      <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
        {price}
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--t3)" }}>/mo</span>
      </span>
    </button>
  );
}
