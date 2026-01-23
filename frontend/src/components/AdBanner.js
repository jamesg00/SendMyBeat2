import React, { useEffect, useRef, useState } from 'react';

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

  const adRef = useRef(null);
  const [adVisible, setAdVisible] = useState(false);

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

  useEffect(() => {
    if (!adRef.current) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const status = adRef.current.getAttribute('data-ad-status');
      if (status === 'filled') {
        setAdVisible(true);
        clearInterval(interval);
      }
      if (attempts >= 12) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
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
    <div
      className="ad-container"
      style={{
        ...style,
        overflow: 'hidden',
        minHeight: adVisible ? '90px' : 0,
        height: adVisible ? 'auto' : 0,
        opacity: adVisible ? 1 : 0,
        transition: 'opacity 200ms ease'
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.REACT_APP_ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner;
