import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles, Upload } from 'lucide-react';

const SubscriptionBanner = ({ creditsRemaining, uploadCreditsRemaining, isSubscribed, onUpgrade }) => {
  if (isSubscribed) {
    return (
      <Card className="mb-6 glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold gradient-text">SendMyBeat Pro</p>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Unlimited AI generations & uploads</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold gradient-text">∞</p>
              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Credits</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const aiPercentage = (creditsRemaining / 3) * 100;
  const uploadPercentage = (uploadCreditsRemaining / 3) * 100;
  const isAiLow = creditsRemaining === 0;
  const isUploadLow = uploadCreditsRemaining === 0;
  const isAnyLow = isAiLow || isUploadLow;

  return (
    <Card className={`mb-6 producer-card border-0 ${isAnyLow ? 'neon-glow' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-lg" style={{color: 'var(--text-primary)'}}>Free Tier - Daily Limits</p>
            <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
              Resets daily at midnight UTC
            </p>
          </div>
        </div>

        {/* AI Credits */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isAiLow ? 'bg-red-500' : 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]'}`}>
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>AI Generations</p>
                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  {creditsRemaining} of 3 left
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${isAiLow ? 'text-red-500' : 'gradient-text'}`}>
              {creditsRemaining}
            </p>
          </div>
          <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isAiLow ? 'bg-red-500' : 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]'}`}
              style={{ width: `${aiPercentage}%` }}
            />
          </div>
        </div>

        {/* Upload Credits */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isUploadLow ? 'bg-red-500' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                <Upload className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>YouTube Uploads</p>
                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                  {uploadCreditsRemaining} of 3 left
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${isUploadLow ? 'text-red-500' : 'gradient-text'}`}>
              {uploadCreditsRemaining}
            </p>
          </div>
          <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isUploadLow ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}
              style={{ width: `${uploadPercentage}%` }}
            />
          </div>
        </div>

        {isAnyLow ? (
          <>
            <p className="text-sm mb-3 text-center" style={{color: 'var(--text-secondary)'}}>
              {isAiLow && isUploadLow 
                ? "You've used all your free credits for today 😢" 
                : isAiLow 
                ? "No AI generations left for today 😢"
                : "No uploads left for today 😢"}
            </p>
            <Button 
              onClick={onUpgrade}
              className="w-full btn-modern"
              data-testid="upgrade-banner-btn"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Pro - Unlimited Access
            </Button>
          </>
        ) : (
          <Button 
            onClick={onUpgrade}
            variant="ghost"
            size="sm"
            className="w-full text-sm"
            style={{color: 'var(--accent-primary)'}}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Go Pro for Unlimited
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;