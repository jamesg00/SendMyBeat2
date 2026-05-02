import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Upload, Settings } from "lucide-react";
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
      <Card className="glass-card border-0">
        <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold gradient-text">{title}</h3>
                <p className="text-xs sm:text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                  {subline}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center rounded-full border px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "var(--border-color)" }}>
                <span className="font-bold mr-2" style={{ color: "var(--text-primary)" }}>
                  {creditsRemaining}/{creditsTotal}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {isMax ? "Fair Use" : "Metered"}
                </span>
              </div>
              {showManageButton ? (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  variant="outline"
                  className="text-xs sm:text-sm"
                  style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {loadingPortal ? "Loading..." : "Manage"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (creditsRemaining === undefined || uploadCreditsRemaining === undefined) {
    return null;
  }

  const isAiLow = creditsRemaining === 0;
  const isUploadLow = uploadCreditsRemaining === 0;
  const isAnyLow = isAiLow || isUploadLow;

  return (
    <Card className={`${isAnyLow ? "neon-glow" : ""} border-0 producer-card`}>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold" style={{ color: "var(--text-primary)" }}>Free Daily Credits</h3>
            <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>{getResetMessage()}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${isAiLow ? "border-red-500" : ""}`}>
              <Zap className={`h-4 w-4 ${isAiLow ? "text-red-500" : ""}`} />
              <span style={{ color: "var(--text-primary)" }}>{creditsRemaining}/{creditsTotal}</span>
              <span style={{ color: "var(--text-secondary)" }}>AI</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs sm:text-sm ${isUploadLow ? "border-red-500" : ""}`}>
              <Upload className={`h-4 w-4 ${isUploadLow ? "text-red-500" : ""}`} />
              <span style={{ color: "var(--text-primary)" }}>{uploadCreditsRemaining}/{uploadsTotal}</span>
              <span style={{ color: "var(--text-secondary)" }}>Uploads</span>
            </div>
            <Button onClick={onUpgrade} className="btn-modern text-xs sm:text-sm" data-testid="upgrade-banner-btn">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;


