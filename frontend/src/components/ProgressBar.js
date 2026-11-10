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
    <div className="smb-progress" role="status" aria-live="polite">
      <div className="smb-progress-inner">
        <div className="smb-progress-row">
          <span className="smb-progress-dot" aria-hidden="true" />
          <p className="smb-progress-message">{message}</p>
          <span className="smb-progress-pct">{Math.round(progress)}%</span>
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="smb-progress-cancel"
              title="Cancel"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="smb-bar">
          <i className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
