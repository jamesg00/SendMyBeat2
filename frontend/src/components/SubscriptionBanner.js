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
      ? "Unlimited AI + unlimited uploads"
      : `${creditsTotal} AI generations + ${uploadsTotal} uploads per month`;

    return (
      <Card className="mb-6 glass-card border-0">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold gradient-text">{title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {subline}
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">
                {isMax ? "∞" : `${creditsRemaining}/${creditsTotal}`}
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {isMax ? "UNLIMITED" : "METERED"}
              </p>
            </div>
          </div>
          <Button
            onClick={handleManageSubscription}
            disabled={loadingPortal}
            variant="outline"
            className="w-full py-3 sm:py-4 text-sm sm:text-base"
            style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}
          >
            <Settings className="mr-2 h-4 w-4" />
            {loadingPortal ? "Loading..." : "Manage Subscription"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (creditsRemaining === undefined || uploadCreditsRemaining === undefined) {
    return null;
  }

  const aiPercentage = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;
  const uploadPercentage = uploadsTotal > 0 ? (uploadCreditsRemaining / uploadsTotal) * 100 : 0;
  const isAiLow = creditsRemaining === 0;
  const isUploadLow = uploadCreditsRemaining === 0;
  const isAnyLow = isAiLow || isUploadLow;

  return (
    <Card className={`mb-6 producer-card border-0 ${isAnyLow ? "neon-glow" : ""}`}>
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-bold" style={{ color: "var(--text-primary)" }}>Free Daily Credits</h3>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{getResetMessage()}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className={`producer-card p-3 sm:p-4 rounded-xl ${isAiLow ? "border-2 border-red-500" : ""}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center mb-2 ${isAiLow ? "bg-red-500" : "bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold mb-1">AI Generations</p>
              <div className="text-2xl sm:text-3xl font-bold mb-1">{creditsRemaining}</div>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>of {creditsTotal} remaining</p>
              <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className={`h-full ${isAiLow ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-green-600"}`} style={{ width: `${aiPercentage}%` }} />
              </div>
            </div>
          </div>

          <div className={`producer-card p-3 sm:p-4 rounded-xl ${isUploadLow ? "border-2 border-red-500" : ""}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center mb-2 ${isUploadLow ? "bg-red-500" : "bg-gradient-to-br from-green-500 to-emerald-600"}`}>
                <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-semibold mb-1">YouTube Uploads</p>
              <div className="text-2xl sm:text-3xl font-bold mb-1">{uploadCreditsRemaining}</div>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>of {uploadsTotal} remaining</p>
              <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className={`h-full ${isUploadLow ? "bg-red-500" : "bg-gradient-to-r from-green-500 to-emerald-600"}`} style={{ width: `${uploadPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={onUpgrade} className="w-full btn-modern py-5 sm:py-6 text-sm sm:text-base" data-testid="upgrade-banner-btn">
          <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;

