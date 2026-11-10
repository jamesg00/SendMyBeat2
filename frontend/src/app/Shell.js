import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import * as api from "@/app/api";
import { resumeGeneration } from "@/app/draft";
import Paywall from "@/app/Paywall";
import { Avatar } from "@/app/producer";
import { openPaywall, planName, refreshSubscription, setUser, useRequest, useSubscription, useUser } from "@/app/store";
import { AppIcon, Pill } from "@/app/ui";

// The frame around every signed-in page: the top bar with the four tabs on wide screens, and
// the app's floating pill at the bottom on phones. Guests can open Spotlight and profiles.

const TABS = [
  { to: "/dashboard", label: "Workflow", icon: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" /> },
  {
    to: "/spotlight",
    label: "Spotlight",
    icon: (
      <>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: (
      <>
        <rect x="4" y="11" width="4" height="9" rx="1" fill="currentColor" />
        <rect x="10" y="7" width="4" height="13" rx="1" fill="currentColor" />
        <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" />
      </>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 18.5c1.4-2 3.3-3 5.5-3s4.1 1 5.5 3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
];

// Pages that belong to a tab without being the tab itself.
const tabFor = (path) =>
  path.startsWith("/pros") || path.startsWith("/producer") ? "/spotlight" : (TABS.find((t) => path.startsWith(t.to))?.to ?? null);

export default function Shell({ signedIn }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const sub = useSubscription(signedIn);
  const me = useRequest(() => (signedIn ? api.myProducer() : Promise.resolve(null)), [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    api.me().then(setUser, () => {});
    resumeGeneration();
  }, [signedIn]);

  // Back from Stripe: check the payment went through, then tidy the address bar.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!signedIn || params.get("upgraded") !== "true") return;
    void refreshSubscription(true);
    params.delete("upgraded");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [signedIn, location, navigate]);

  const active = tabFor(location.pathname);
  const links = (
    <>
      {TABS.map((t) => (
        <Link key={t.to} to={t.to} aria-current={active === t.to ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {t.icon}
          </svg>
          {t.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="s-app">
      <header className="s-top">
        <Link to={signedIn ? "/dashboard" : "/"} className="s-brand">
          <AppIcon size={26} />
          SendMyBeat
        </Link>
        {signedIn ? (
          <nav className="s-nav" aria-label="Main">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} aria-current={active === t.to ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
        ) : (
          <span style={{ margin: "0 auto" }} />
        )}
        <div className="s-top-right">
          {signedIn ? (
            <>
              {sub ? <Pill label={planName(sub)} tone="muted" onClick={() => openPaywall(sub.is_subscribed && !sub.pro_access ? "needs_pro" : "needs_plan")} /> : null}
              <Link to="/profile" aria-label="Your profile" style={{ display: "flex", textDecoration: "none" }}>
                {me.data ? (
                  <Avatar producer={me.data} size={32} />
                ) : (
                  <span className="s-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <Link to="/" className="s-btn s-btn--sm">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <Outlet context={{ me }} />
      {signedIn ? (
        <nav className="s-tabbar" aria-label="Main">
          {links}
        </nav>
      ) : null}
      {signedIn ? <Paywall /> : null}
    </div>
  );
}
