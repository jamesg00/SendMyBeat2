import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart3, DollarSign, Layers, LogOut, Settings, Shield, Star, Users } from "lucide-react";
import { API } from "@/App";
import { getAuthToken } from "@/lib/auth";

// Signed-in layout: a sidebar on desktop, a top bar plus a floating pill tab bar on phones.
// `active` is one of "workflow" | "analytics" | "spotlight" | "settings".

export const NAV_ITEMS = [
  { id: "workflow", label: "Create", short: "Create", Icon: Layers },
  { id: "analytics", label: "Analytics", short: "Analytics", Icon: BarChart3 },
  { id: "spotlight", label: "Spotlight", short: "Spotlight", Icon: Star },
  { id: "settings", label: "Settings", short: "Profile", Icon: Settings },
];

const initials = (name = "") => {
  const clean = String(name).trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2);
  return letters.toUpperCase();
};

// Who's signed in, fetched once per page load and shared by every page's shell, so pages that
// don't load the user themselves (Spotlight, pros, admin) still show your name and admin links.
let mePromise = null;
let meToken = null;
const loadMe = () => {
  const token = getAuthToken();
  if (!token) return Promise.resolve(null);
  if (token !== meToken) {
    mePromise = null;
    meToken = token;
  }
  if (!mePromise) {
    mePromise = axios.get(`${API}/auth/me`).then(
      (r) => r.data || null,
      () => {
        mePromise = null;
        return null;
      },
    );
  }
  return mePromise;
};

const ADMIN_LINKS = [
  { id: "admin-costs", path: "/admin/costs", label: "Ops and costs", Icon: DollarSign },
  { id: "admin-users", path: "/admin/users", label: "Users", Icon: Users },
];

export const planLabelFor = (subscription) => {
  if (!subscription) return null;
  if (subscription.trial) return "Trial";
  if (!subscription.is_subscribed) return "Free";
  return subscription.plan === "max" || subscription.plan === "pro" ? "Pro" : "Plus";
};

const AppShell = ({
  active = "workflow",
  onSelect,
  title,
  crumb,
  actions = null,
  username,
  planLabel,
  analyticsLocked = false,
  isAdmin = false,
  onLogout,
  onAdmin,
  credits = null,
  children,
}) => {
  const [me, setMe] = useState(null);
  useEffect(() => {
    let alive = true;
    loadMe().then((data) => alive && setMe(data));
    return () => {
      alive = false;
    };
  }, []);
  const name = username || me?.username;
  const admin = isAdmin || Boolean(me?.is_admin);
  const openAdmin = (path) => (event) => {
    event.preventDefault();
    if (onAdmin) onAdmin(path);
    else window.location.assign(path);
  };
  const onAdminPage = active === "admin-costs" || active === "admin-users";

  const select = (id) => (event) => {
    if (event) event.preventDefault();
    if (onSelect) onSelect(id);
  };

  return (
    <div className="smb-shell" data-testid="app-shell">
      <aside className="smb-side" aria-label="Main">
        <a href="/dashboard" className="smb-wordmark smb-side-wordmark" onClick={select("workflow")}>
          SENDMYBEAT
        </a>

        <nav className="smb-nav">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={id === "spotlight" ? "/spotlight" : `/dashboard?tab=${id}`}
              className={`smb-nav-link ${active === id ? "is-active" : ""}`}
              aria-current={active === id ? "page" : undefined}
              onClick={select(id)}
              data-testid={`nav-${id}`}
            >
              <Icon className="smb-ico" aria-hidden="true" />
              <span>{label}</span>
              {id === "analytics" && analyticsLocked ? <span className="smb-nav-tag">Pro</span> : null}
            </a>
          ))}
        </nav>

        {admin ? (
          <nav className="smb-nav smb-nav--admin" aria-label="Admin">
            <span className="smb-nav-heading">Admin</span>
            {ADMIN_LINKS.map(({ id, path, label, Icon }) => (
              <a
                key={id}
                href={path}
                className={`smb-nav-link ${active === id ? "is-active" : ""}`}
                aria-current={active === id ? "page" : undefined}
                onClick={openAdmin(path)}
              >
                <Icon className="smb-ico" aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        ) : null}

        <div className="smb-side-grow" />

        {credits ? <div className="smb-side-credits">{credits}</div> : null}

        <div className="smb-me">
          <span className="smb-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="smb-me-name" title={name}>{name || "Producer"}</span>
          {planLabel ? <span className="smb-badge">{planLabel}</span> : null}
        </div>
        {onLogout ? (
          <button type="button" className="smb-nav-link smb-logout" onClick={onLogout} data-testid="logout-btn">
            <LogOut className="smb-ico" aria-hidden="true" />
            <span>Log out</span>
          </button>
        ) : null}
      </aside>

      <div className="smb-main-wrap">
        <header className="smb-topbar">
          <a href="/dashboard" className="smb-wordmark" onClick={select("workflow")}>SENDMYBEAT</a>
          <div className="smb-topbar-right">
            {admin ? (
              <a href="/admin/costs" className={`smb-badge smb-admin-chip ${onAdminPage ? "is-active" : ""}`} onClick={openAdmin("/admin/costs")} aria-label="Admin">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" /> Admin
              </a>
            ) : null}
            {planLabel ? <span className="smb-badge">{planLabel}</span> : null}
            <button
              type="button"
              className="smb-avatar smb-avatar-btn"
              onClick={select("settings")}
              aria-label="Open settings"
            >
              {initials(name)}
            </button>
          </div>
        </header>

        <main className="smb-main" id="main">
          {title ? (
            <div className="smb-main-head">
              <div className="smb-main-titles">
                {crumb ? <p className="smb-crumb">{crumb}</p> : null}
                <h1 className="smb-page-title">{title}</h1>
              </div>
              {actions ? <div className="smb-main-actions">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <nav className="smb-tabbar" aria-label="Main">
        {NAV_ITEMS.map(({ id, short, Icon }) => (
          <a
            key={id}
            href={id === "spotlight" ? "/spotlight" : `/dashboard?tab=${id}`}
            className={`smb-tab ${active === id ? "is-active" : ""}`}
            aria-current={active === id ? "page" : undefined}
            onClick={select(id)}
          >
            <Icon className="smb-ico" aria-hidden="true" />
            <span>{short}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
