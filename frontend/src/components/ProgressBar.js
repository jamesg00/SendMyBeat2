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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-2xl backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--card-bg) 92%, transparent)",
        borderTopColor: "var(--accent-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {message}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <p
              className="whitespace-nowrap text-right text-sm font-bold leading-none tabular-nums"
              style={{ color: "var(--accent-primary)" }}
            >
              {Math.round(progress)}%
            </p>
            {onCancel && (
              <button
                onClick={handleCancel}
                className="rounded-full border p-1.5 transition-transform hover:scale-110"
                style={{
                  backgroundColor: "color-mix(in srgb, #ef4444 12%, transparent)",
                  borderColor: "color-mix(in srgb, #ef4444 32%, var(--border-color))",
                }}
                title="Cancel operation"
              >
                <X className="w-5 h-5" style={{color: '#ef4444'}} />
              </button>
            )}
          </div>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--bg-secondary) 82%, transparent)",
            borderColor: "var(--border-color)",
          }}
        >
          <div 
            className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300 ease-out"
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
