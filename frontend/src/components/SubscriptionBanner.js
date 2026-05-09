import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

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
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
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
    const isMax = plan === "max";
    const title = isMax ? "SendMyBeat Max" : "SendMyBeat Plus";
    const subline = isMax
      ? `${creditsTotal} AI generations + ${uploadsTotal} uploads per month`
      : `${creditsTotal} AI generations + ${uploadsTotal} uploads per month`;

    return (
      <div className="subscription-strip" data-testid="subscription-banner">
        <div className="subscription-strip-section">
          <span className="subscription-strip-label">{title}</span>
          <div className="subscription-track">
            <div className="subscription-fill" style={{ width: `${creditsTotal ? Math.min(100, (creditsRemaining / creditsTotal) * 100) : 0}%` }} />
          </div>
          <span className="subscription-strip-value">{creditsRemaining} / {creditsTotal} AI</span>
        </div>
        <div className="subscription-strip-section">
          <span className="subscription-strip-label">Uploads</span>
          <div className="subscription-track">
            <div className="subscription-fill" style={{ width: `${uploadsTotal ? Math.min(100, (uploadCreditsRemaining / uploadsTotal) * 100) : 0}%` }} />
          </div>
          <span className="subscription-strip-value">{uploadCreditsRemaining} / {uploadsTotal}</span>
        </div>
        <span className="subscription-strip-meta">{subline}</span>
        {showManageButton ? (
          <Button
            onClick={handleManageSubscription}
            disabled={loadingPortal}
            variant="outline"
            className="subscription-strip-button text-xs sm:text-sm"
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
    <div className="subscription-strip" data-testid="subscription-banner">
      <div className="subscription-strip-section">
        <span className="subscription-strip-label">AI Credits</span>
        <div className="subscription-track">
          <div className="subscription-fill" style={{ width: `${creditsTotal ? Math.min(100, (creditsRemaining / creditsTotal) * 100) : 0}%` }} />
        </div>
        <span className="subscription-strip-value">{creditsRemaining} / {creditsTotal}</span>
      </div>
      <div className="subscription-strip-section">
        <span className="subscription-strip-label">Uploads</span>
        <div className="subscription-track">
          <div className="subscription-fill" style={{ width: `${uploadsTotal ? Math.min(100, (uploadCreditsRemaining / uploadsTotal) * 100) : 0}%` }} />
        </div>
        <span className="subscription-strip-value">{uploadCreditsRemaining} / {uploadsTotal}</span>
      </div>
      <span className="subscription-strip-meta">{getResetMessage()}</span>
      <Button onClick={onUpgrade} variant="outline" className="subscription-strip-button text-xs sm:text-sm" data-testid="upgrade-banner-btn">
        <Sparkles className="mr-2 h-4 w-4" />
        Upgrade
      </Button>
    </div>
  );
};

export default SubscriptionBanner;


