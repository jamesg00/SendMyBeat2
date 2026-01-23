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

  // Check if AdSense is configured
  const isAdSenseConfigured = process.env.REACT_APP_ADSENSE_CLIENT_ID && 
                               process.env.REACT_APP_ADSENSE_CLIENT_ID !== 'YOUR_ADSENSE_CLIENT_ID';

  console.log('AdSense Config:', { 
    isConfigured: isAdSenseConfigured, 
    clientId: process.env.REACT_APP_ADSENSE_CLIENT_ID,
    env: process.env.NODE_ENV 
  });

  // Hide slot entirely if not configured to avoid empty space
  if (!isAdSenseConfigured) {
    return null;
  }

  // Real AdSense code - Will show in both dev and production
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
