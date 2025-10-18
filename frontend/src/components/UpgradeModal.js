import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap } from 'lucide-react';

const UpgradeModal = ({ open, onClose, onUpgrade, loading }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="upgrade-modal">
        <DialogHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mb-4 neon-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl text-center gradient-text">
            Upgrade to SendMyBeat Pro
          </DialogTitle>
          <DialogDescription className="text-center text-base" style={{color: 'var(--text-secondary)'}}>
            Unlock unlimited AI-powered tag generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="producer-card p-6 text-center">
            <p className="text-4xl font-bold gradient-text mb-2">$5</p>
            <p style={{color: 'var(--text-secondary)'}}>per month</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold" style={{color: 'var(--text-primary)'}}>Unlimited AI Tag Generation</p>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Generate 500 strategic tags anytime</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold" style={{color: 'var(--text-primary)'}}>Unlimited AI Refinement</p>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Refine descriptions as many times as you want</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold" style={{color: 'var(--text-primary)'}}>Unlimited YouTube Uploads</p>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Upload beats directly to YouTube</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold" style={{color: 'var(--text-primary)'}}>Save Unlimited Templates</p>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Store all your description templates</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onUpgrade}
            disabled={loading}
            className="w-full btn-modern text-lg py-6"
            data-testid="upgrade-now-btn"
          >
            {loading ? (
              <>
                <div className="spinner mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Upgrade Now
              </>
            )}
          </Button>

          <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;