import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

// The plans, matching the app's paywall and backend/server.py (TRIAL_DAILY_*, PLUS_V2_* and PRO_V2_*).
// Plus is "plus" and Pro is "max" to the server.

const PLANS = [
  {
    id: "plus",
    name: "Plus",
    price: "$5",
    blurb: "50 generations and 50 uploads a month, no watermark.",
    bullets: ["50 AI generations a month", "50 YouTube uploads a month", "Tags, descriptions and Upload Studio", "No watermark"],
  },
  {
    id: "max",
    name: "Pro",
    price: "$10",
    blurb: "Double the credits, plus the plan agent and analytics.",
    bullets: [
      "100 AI generations a month",
      "100 YouTube uploads a month",
      "Copy a pro producer's style with the plan agent",
      "Pro breakdowns and channel analytics",
      "Run several jobs at once",
    ],
  },
];

const UpgradeModal = ({ open, onClose, onUpgrade, loading, subscription }) => {
  const trialAvailable = Boolean(subscription?.trial_available);
  const onTrial = Boolean(subscription?.trial);
  const plan = subscription?.plan;
  const currentPlan = onTrial ? null : plan === "max" || plan === "pro" ? "max" : plan === "plus" ? "plus" : null;
  const subscribed = Boolean(subscription?.is_subscribed);

  const [selected, setSelected] = useState("plus");

  useEffect(() => {
    if (!open) return;
    // Preselect the plan the user doesn't have yet.
    setSelected(currentPlan === "plus" ? "max" : "plus");
  }, [open, currentPlan]);

  const choice = PLANS.find((p) => p.id === selected) || PLANS[0];
  const isCurrent = currentPlan === choice.id;
  const startsTrial = trialAvailable && choice.id === "plus";

  let cta = `${subscribed ? "Switch to" : "Get"} ${choice.name}`;
  if (startsTrial) cta = "Start 3-day free trial";
  else if (onTrial && choice.id === "max") cta = "Switch to Pro (billed today)";
  if (isCurrent) cta = "Your plan";

  const dueToday = startsTrial ? "$0.00" : `${choice.price}.00`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="smb-sheet max-w-[480px]" data-testid="upgrade-modal">
        <span className="smb-grab" aria-hidden="true" />
        <DialogHeader className="text-left">
          <DialogTitle className="smb-sheet-title">Choose a plan</DialogTitle>
          <DialogDescription className="smb-t2">
            {trialAvailable
              ? "Try Plus free for 3 days: 3 generations and 3 uploads a day, then $5/month."
              : "Plus covers producers uploading every week. Pro doubles that and adds the pro tools."}
          </DialogDescription>
        </DialogHeader>

        <div className="smb-opts" role="radiogroup" aria-label="Plan">
          {PLANS.map((p) => {
            const on = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`smb-opt ${on ? "is-active" : ""}`}
                onClick={() => setSelected(p.id)}
                data-testid={`plan-option-${p.id}`}
              >
                <span className="smb-radio" aria-hidden="true" />
                <span className="smb-opt-body">
                  <b>
                    SendMyBeat {p.name}
                    {currentPlan === p.id ? <span className="smb-badge smb-badge--sm">Current</span> : null}
                    {p.id === "max" && currentPlan !== p.id ? <span className="smb-badge smb-badge--sm">Most popular</span> : null}
                  </b>
                  <span>{p.blurb}</span>
                </span>
                <span className="smb-opt-price">{p.price}<small>/mo</small></span>
              </button>
            );
          })}
        </div>

        <ul className="smb-checklist">
          {choice.bullets.map((b) => (
            <li key={b}>
              <Check aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="smb-sum">
          <div>
            <span className="smb-t2">{startsTrial ? "After the trial" : "Billed monthly"}</span>
            <span className="smb-mono">{choice.price}/mo</span>
          </div>
          <div className="smb-sum-total">
            <span>Due today</span>
            <span className="smb-mono">{dueToday}</span>
          </div>
        </div>

        <Button
          onClick={isCurrent ? undefined : () => onUpgrade(choice.id, startsTrial)}
          disabled={loading || isCurrent}
          className="smb-btn smb-btn--pri smb-btn--lg smb-btn--full"
          data-testid="upgrade-confirm-btn"
        >
          {loading ? "Opening checkout..." : cta}
        </Button>
        <p className="smb-fineprint">Cancel anytime. Secure checkout with Stripe.</p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
