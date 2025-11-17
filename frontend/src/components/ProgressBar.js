import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const ProgressBar = ({ isActive, message = "Processing...", duration = 30000, onCancel }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    // Start progress
    setProgress(0);
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until complete
      setProgress(percentage);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, duration]);

  // Complete progress when inactive
  useEffect(() => {
    if (!isActive && progress > 0) {
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isActive, progress]);

  if (progress === 0) return null;

  const handleCancel = () => {
    if (onCancel) {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this operation?\n\nYour progress will be lost, but no credits will be used."
      );
      if (confirmed) {
        onCancel();
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 cyber-grid neon-border-top shadow-2xl" style={{backgroundColor: 'var(--bg-primary)', borderTop: '2px solid var(--accent-primary)'}}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium matrix-glow pulse-glow">
            {message}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold matrix-glow" style={{color: 'var(--accent-primary)'}}>
              {Math.round(progress)}%
            </p>
            {onCancel && (
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-full neon-border hover:scale-110 transition-transform rgb-hover"
                style={{backgroundColor: 'rgba(239, 68, 68, 0.1)'}}
                title="Cancel operation"
              >
                <X className="w-5 h-5" style={{color: '#ef4444'}} />
              </button>
            )}
          </div>
        </div>
        <div className="w-full h-3 neon-border rounded-full overflow-hidden" style={{backgroundColor: 'rgba(0, 255, 65, 0.1)'}}>
          <div 
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300 ease-out matrix-glow"
            style={{ 
              width: `${progress}%`,
              boxShadow: '0 0 20px var(--accent-primary)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
