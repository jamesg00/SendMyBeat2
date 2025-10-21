import React, { useEffect, useState } from 'react';

const ProgressBar = ({ isActive, message = "Processing...", duration = 30000 }) => {
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
            {message}
          </p>
          <p className="text-sm font-semibold" style={{color: 'var(--accent-primary)'}}>
            {Math.round(progress)}%
          </p>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
