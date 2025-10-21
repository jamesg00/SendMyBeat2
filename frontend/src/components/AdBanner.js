import React, { useEffect } from 'react';

const AdBanner = ({ 
  isSubscribed, 
  adSlot = "1234567890", // Placeholder - replace with your AdSense ad slot ID
  format = "auto",
  style = {}
}) => {
  // Don't show ads for subscribed users
  if (isSubscribed) {
    return null;
  }

  useEffect(() => {
    // Push ad when component mounts
    try {
      if (window.adsbygoogle && process.env.NODE_ENV === 'production') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.log('AdSense error:', err);
    }
  }, []);

  // Show placeholder in development or when AdSense not configured
  const isAdSenseConfigured = process.env.REACT_APP_ADSENSE_CLIENT_ID && 
                               process.env.REACT_APP_ADSENSE_CLIENT_ID !== 'YOUR_ADSENSE_CLIENT_ID';

  if (!isAdSenseConfigured || process.env.NODE_ENV !== 'production') {
    return (
      <div 
        className="bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center p-4"
        style={{ minHeight: '90px', ...style }}
      >
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
            Advertisement Space
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            (AdSense will appear here for free users)
          </p>
        </div>
      </div>
    );
  }

  // Real AdSense code
  return (
    <div className="ad-container" style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={process.env.REACT_APP_ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner;
