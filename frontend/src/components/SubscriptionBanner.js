import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Sparkles } from 'lucide-react';

const SubscriptionBanner = ({ creditsRemaining, isSubscribed, onUpgrade }) => {
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
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Unlimited AI generations</p>
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

  const percentage = (creditsRemaining / 2) * 100;
  const isLow = creditsRemaining === 0;

  return (
    <Card className={`mb-6 producer-card border-0 ${isLow ? 'neon-glow' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isLow ? 'bg-red-500' : 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]'}`}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold" style={{color: 'var(--text-primary)'}}>Free Tier</p>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                {creditsRemaining} of 2 AI generations left today
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${isLow ? 'text-red-500' : 'gradient-text'}`}>
              {creditsRemaining}
            </p>
            <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Credits</p>
          </div>
        </div>
        
        <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full transition-all ${isLow ? 'bg-red-500' : 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {isLow ? (
          <Button 
            onClick={onUpgrade}
            className="w-full btn-modern"
            data-testid="upgrade-banner-btn"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to Pro - $5/month
          </Button>
        ) : (
          <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>
            Resets daily at midnight UTC
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionBanner;