import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Upload, Settings } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const SubscriptionBanner = ({ creditsRemaining, uploadCreditsRemaining, isSubscribed, onUpgrade, API }) => {
  const [loadingPortal, setLoadingPortal] = useState(false);
  
  console.log('📊 Banner Credits:', { 
    creditsRemaining, 
    uploadCreditsRemaining,
    creditsType: typeof creditsRemaining,
    uploadType: typeof uploadCreditsRemaining 
  });
  
  // Handle missing data
  if (creditsRemaining === undefined || uploadCreditsRemaining === undefined) {
    console.error('❌ Credits are undefined!', { creditsRemaining, uploadCreditsRemaining });
    return (
      <Card className="mb-6 producer-card border-2 border-red-500">
        <CardContent className="p-6">
          <p className="text-center text-red-500 font-semibold">
            ⚠️ Unable to load credit information. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const response = await axios.post(`${API}/subscription/portal`);
      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open subscription management');
      setLoadingPortal(false);
    }
  };
  
  // Pro Subscription Display
  if (isSubscribed) {
    return (
      <Card className="mb-6 glass-card border-0">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-5">
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold gradient-text">SendMyBeat Pro</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  Unlimited AI generations &<br className="sm:hidden" /> YouTube uploads
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-3xl sm:text-4xl font-bold gradient-text">∞</p>
              <p className="text-xs font-semibold" style={{color: 'var(--text-secondary)'}}>UNLIMITED</p>
            </div>
          </div>
          <Button
            onClick={handleManageSubscription}
            disabled={loadingPortal}
            variant="outline"
            className="w-full py-3 sm:py-4 text-sm sm:text-base"
            style={{borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)'}}
          >
            <Settings className="mr-2 h-4 w-4" />
            {loadingPortal ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Free Tier Display - Side by Side Layout
  const aiPercentage = (creditsRemaining / 3) * 100;
  const uploadPercentage = (uploadCreditsRemaining / 3) * 100;
  const isAiLow = creditsRemaining === 0;
  const isUploadLow = uploadCreditsRemaining === 0;
  const isAnyLow = isAiLow || isUploadLow;

  return (
    <Card className={`mb-6 producer-card border-0 ${isAnyLow ? 'neon-glow' : ''}`}>
      <CardContent className="p-4 sm:p-5 md:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-base sm:text-lg font-bold" style={{color: 'var(--text-primary)'}}>
            Free Daily Credits
          </h3>
          <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
            Resets at midnight UTC
          </p>
        </div>

        {/* Side by Side Credit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
          {/* AI Generations Card */}
          <div className={`producer-card p-4 rounded-xl ${isAiLow ? 'border-2 border-red-500' : ''}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${isAiLow ? 'bg-red-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                AI Generations
              </p>
              <div className="text-3xl font-bold mb-2" style={{color: isAiLow ? '#ef4444' : 'var(--text-primary)'}}>
                {creditsRemaining}
              </div>
              <p className="text-xs mb-3" style={{color: 'var(--text-secondary)'}}>
                of 3 remaining
              </p>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isAiLow ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}
                  style={{ width: `${aiPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* YouTube Uploads Card */}
          <div className={`producer-card p-4 rounded-xl ${isUploadLow ? 'border-2 border-red-500' : ''}`}>
            <div className="flex flex-col items-center text-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${isUploadLow ? 'bg-red-500' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                <Upload className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                YouTube Uploads
              </p>
              <div className="text-3xl font-bold mb-2" style={{color: isUploadLow ? '#ef4444' : 'var(--text-primary)'}}>
                {uploadCreditsRemaining}
              </div>
              <p className="text-xs mb-3" style={{color: 'var(--text-secondary)'}}>
                of 3 remaining
              </p>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isUploadLow ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}
                  style={{ width: `${uploadPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Button */}
        {isAnyLow ? (
          <div>
            <p className="text-sm mb-3 text-center font-medium" style={{color: 'var(--text-secondary)'}}>
              {isAiLow && isUploadLow 
                ? "🚫 All free credits used for today" 
                : isAiLow 
                ? "🚫 No AI generations left for today"
                : "🚫 No uploads left for today"}
            </p>
            <Button 
              onClick={onUpgrade}
              className="w-full btn-modern py-6 text-base"
              data-testid="upgrade-banner-btn"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Upgrade to Pro - Unlimited Access
            </Button>
          </div>
        ) : (
          <Button 
            onClick={onUpgrade}
            variant="ghost"
            className="w-full py-4"
            style={{color: 'var(--accent-primary)'}}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Want Unlimited? Upgrade to Pro
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;