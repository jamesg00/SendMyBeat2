import React, { useEffect, useRef, useState } from "react";
import { API } from "@/App";
import { getAuthToken } from "@/lib/auth";

// Google AdSense display unit, shown only to people who don't pay. The AdSense script itself is
// loaded once in public/index.html.
//
// Set on Vercel once AdSense approves the site:
//   REACT_APP_ADSENSE_SLOT       the ad unit's slot id (AdSense > Ads > By ad unit > Display ads)
//   REACT_APP_ADSENSE_CLIENT_ID  optional, defaults to the publisher id in public/ads.txt
// With no slot set this renders nothing, so no empty boxes show while the site waits for approval.
export const ADSENSE_CLIENT = process.env.REACT_APP_ADSENSE_CLIENT_ID && process.env.REACT_APP_ADSENSE_CLIENT_ID !== "ca-pub-XXXXXXXXXXXXXXXX"
  ? process.env.REACT_APP_ADSENSE_CLIENT_ID
  : "ca-pub-2777610112879824";
export const ADSENSE_SLOT = process.env.REACT_APP_ADSENSE_SLOT || "";

const AdUnit = ({ adSlot, format, style, label }) => {
  const adRef = useRef(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An ad blocker or a second push on the same <ins>; nothing to show either way.
    }
  }, []);

  useEffect(() => {
    // Only open up the space once Google actually fills it, so an unfilled unit leaves no gap.
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const status = adRef.current?.getAttribute("data-ad-status");
      if (status === "filled") setFilled(true);
      if (status === "filled" || status === "unfilled" || attempts >= 20) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside
      className="ad-container"
      aria-label={label}
      style={{
        ...style,
        overflow: "hidden",
        minHeight: filled ? 90 : 0,
        height: filled ? "auto" : 0,
        opacity: filled ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      {filled ? <p className="ad-label">{label}</p> : null}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
};

const AdBanner = ({ isSubscribed, adSlot = ADSENSE_SLOT, format = "auto", style = {}, label = "Advertisement" }) => {
  if (isSubscribed || !adSlot || typeof window === "undefined") return null;
  if (window.location.pathname.startsWith("/viz-embed")) return null;
  return <AdUnit adSlot={adSlot} format={format} style={style} label={label} />;
};

export default AdBanner;

// Paid members never see ads. Public pages don't load the subscription, so ask once per visit.
// Plain fetch, not axios: the app's axios 401 handler sends people to the homepage, and an expired
// token on a public page should just mean "show the free version".
let paidLookup = null;
const lookUpPaid = () => {
  const token = getAuthToken();
  if (!token) return Promise.resolve(false);
  if (!paidLookup) {
    paidLookup = fetch(`${API}/subscription/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Boolean(data?.is_subscribed))
      .catch(() => false);
  }
  return paidLookup;
};

// An ad for the free tools (tag generator, uploader): hidden until we know the visitor doesn't pay.
export const FreeToolAd = ({ style = {} }) => {
  const [paid, setPaid] = useState(null);
  useEffect(() => {
    let live = true;
    lookUpPaid().then((value) => live && setPaid(value));
    return () => { live = false; };
  }, []);
  if (paid !== false) return null;
  return <AdBanner isSubscribed={false} style={{ margin: "28px 0", ...style }} />;
};
