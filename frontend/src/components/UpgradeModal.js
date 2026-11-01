import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";

// The plans, matching the app's paywall and backend/server.py (TRIAL_DAILY_*, PLUS_V2_* and PRO_V2_*).
// Plus is "plus" and Pro is "max" to the server.

const PlanCard = ({ title, price, subtitle, bullets, cta, onClick, loading, featured = false, current = false }) => (
  <div
    className={`rounded-xl border p-4 sm:p-5 space-y-3 ${
      featured ? "border-yellow-500/70 bg-yellow-500/10" : "border-[var(--border-color)] bg-[var(--bg-secondary)]"
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="font-semibold">{title}</p>
      {featured ? <Crown className="h-4 w-4 text-yellow-500" /> : <Sparkles className="h-4 w-4" />}
    </div>
    <div>
      <p className="text-3xl font-bold">{price}</p>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
    </div>
    <div className="space-y-2">
      {bullets.map((b) => (
        <div key={b} className="flex items-start gap-2 text-sm">
          <Check className="h-4 w-4 mt-0.5 text-green-500" />
          <span>{b}</span>
        </div>
      ))}
    </div>
    <Button onClick={current ? undefined : onClick} disabled={loading || current} className="w-full">
      {current ? "Your plan" : loading ? "Processing..." : cta}
    </Button>
  </div>
);

const UpgradeModal = ({ open, onClose, onUpgrade, loading, subscription }) => {
  const trialAvailable = Boolean(subscription?.trial_available);
  const onTrial = Boolean(subscription?.trial);
  const plan = subscription?.plan;
  const currentPlan = onTrial ? null : plan === "max" || plan === "pro" ? "max" : plan === "plus" ? "plus" : null;
  const subscribed = Boolean(subscription?.is_subscribed);
  const verb = subscribed ? "Switch to" : "Get";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl" data-testid="upgrade-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center gradient-text">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-center" style={{ color: "var(--text-secondary)" }}>
            {trialAvailable
              ? "Try Plus free for 3 days: 3 generations and 3 uploads a day, then $5/month."
              : "Plus covers producers uploading every week. Pro doubles that and adds the pro tools."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <PlanCard
            title="SendMyBeat Plus"
            price="$5/mo"
            subtitle={trialAvailable ? "3 days free, then $5/month" : "For weekly uploads"}
            bullets={[
              "50 AI generations per month",
              "50 YouTube uploads per month",
              "Tags, descriptions, and Upload Studio",
              "No watermark",
            ]}
            cta={trialAvailable ? "Start 3-day free trial" : `${verb} Plus`}
            loading={loading}
            current={currentPlan === "plus"}
            onClick={() => onUpgrade("plus", trialAvailable)}
          />
          <PlanCard
            title="SendMyBeat Pro"
            price="$10/mo"
            subtitle="Most popular"
            bullets={[
              "100 AI generations per month",
              "100 YouTube uploads per month",
              "Copy a pro producer's style with the plan agent",
              "Pro breakdowns and channel analytics",
              "Run several jobs at once",
            ]}
            cta={onTrial ? "Switch to Pro (billed today)" : `${verb} Pro`}
            loading={loading}
            current={currentPlan === "max"}
            onClick={() => onUpgrade("max", false)}
            featured
          />
        </div>
        <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
          Cancel anytime. Secure checkout via Stripe.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
