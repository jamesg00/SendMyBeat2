import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";

const PlanCard = ({ title, price, subtitle, bullets, cta, onClick, loading, featured = false }) => (
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
    <Button onClick={onClick} disabled={loading} className="w-full">
      {loading ? "Processing..." : cta}
    </Button>
  </div>
);

const UpgradeModal = ({ open, onClose, onUpgrade, loading }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl" data-testid="upgrade-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center gradient-text">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-center" style={{ color: "var(--text-secondary)" }}>
            Plus is the cheap entry plan. Max gives you more monthly room without going fully unlimited.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <PlanCard
            title="SendMyBeat Plus"
            price="$5/mo"
            subtitle="Metered plan"
            bullets={[
              "150 AI generations per month",
              "60 YouTube uploads per month",
              "BeatHelper queue + templates",
              "Lower-cost growth plan",
            ]}
            cta="Upgrade to Plus"
            loading={loading}
            onClick={() => onUpgrade("plus")}
          />
          <PlanCard
            title="SendMyBeat Max"
            price="$12/mo"
            subtitle="Fair-use growth plan"
            bullets={[
              "500 AI generations per month",
              "150 YouTube uploads per month",
              "All BeatHelper automation",
              "Priority growth workflow",
            ]}
            cta="Upgrade to Max"
            loading={loading}
            onClick={() => onUpgrade("max")}
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
