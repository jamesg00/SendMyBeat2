import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Credit meters. In the signed-in shell this sits at the bottom of the sidebar on
// desktop and at the top of the page on phones.

const pct = (remaining, total) => (total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0);

const Meter = ({ label, remaining, total }) => (
  <div className="smb-meter">
    <div className="smb-meter-row">
      <span className="smb-meter-label">{label}</span>
      <span className="smb-meter-value">{remaining}/{total}</span>
    </div>
    <div className="smb-bar">
      <i className={`smb-bar-fill ${remaining / (total || 1) <= 0.2 ? "smb-bar-fill--warn" : ""}`} style={{ width: `${pct(remaining, total)}%` }} />
    </div>
  </div>
);

const SubscriptionBanner = ({
  creditsRemaining,
  uploadCreditsRemaining,
  creditsTotal = 3,
  uploadsTotal = 3,
  resetsAt,
  isSubscribed,
  plan = "free",
  onUpgrade,
  API,
  showManageButton = true,
}) => {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const getResetMessage = () => {
    if (!resetsAt) return "Resets monthly for paid plans";
    const resetDate = new Date(resetsAt);
    if (Number.isNaN(resetDate.getTime())) return "Credits reset at midnight UTC";
    const diffMs = resetDate.getTime() - nowMs;
    if (diffMs <= 0) return `Credits reset at ${resetDate.toLocaleString()}`;
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `Resets in ${hours}h ${minutes}m`;
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const response = await axios.post(`${API}/subscription/portal`);
      window.location.href = response.data.url;
    } catch (error) {
      toast.error("Failed to open subscription management");
      setLoadingPortal(false);
    }
  };

  if (isSubscribed) {
    const isPro = plan === "max" || plan === "pro";
    const title = isPro ? "SendMyBeat Pro" : "SendMyBeat Plus";

    return (
      <div className="smb-credits" data-testid="subscription-banner">
        <div className="smb-credits-head">
          <span className="smb-credits-title">{title}</span>
          <span className="smb-pill smb-pill--ok">Metered</span>
        </div>
        <Meter label="AI" remaining={creditsRemaining} total={creditsTotal} />
        <Meter label="Uploads" remaining={uploadCreditsRemaining} total={uploadsTotal} />
        <p className="smb-credits-meta">{`${creditsTotal} AI generations + ${uploadsTotal} uploads per month`}</p>
        {showManageButton ? (
          <Button
            onClick={handleManageSubscription}
            disabled={loadingPortal}
            variant="outline"
            className="smb-btn smb-btn--sec smb-btn--sm smb-btn--full"
          >
            <Settings className="mr-2 h-4 w-4" />
            {loadingPortal ? "Loading..." : "Manage"}
          </Button>
        ) : null}
      </div>
    );
  }

  if (creditsRemaining === undefined || uploadCreditsRemaining === undefined) {
    return null;
  }

  return (
    <div className="smb-credits" data-testid="subscription-banner">
      <div className="smb-credits-head">
        <span className="smb-credits-title">Free Daily Credits</span>
      </div>
      <Meter label="AI" remaining={creditsRemaining} total={creditsTotal} />
      <Meter label="Uploads" remaining={uploadCreditsRemaining} total={uploadsTotal} />
      <p className="smb-credits-meta">{getResetMessage()}</p>
      <Button
        onClick={onUpgrade}
        className="smb-btn smb-btn--pri smb-btn--sm smb-btn--full"
        data-testid="upgrade-banner-btn"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Upgrade
      </Button>
    </div>
  );
};

export default SubscriptionBanner;
