import React from "react";
import { BarChart3, DollarSign, Layers, LogOut, Settings, Star, Users } from "lucide-react";

// Signed-in layout: a sidebar on desktop, a top bar plus a floating pill tab bar on phones.
// `active` is one of "workflow" | "analytics" | "spotlight" | "settings".

export const NAV_ITEMS = [
  { id: "workflow", label: "Workflow", short: "Studio", Icon: Layers },
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

        {isAdmin ? (
          <nav className="smb-nav smb-nav--admin" aria-label="Admin">
            <span className="smb-nav-heading">Admin</span>
            <a href="/admin/costs" className="smb-nav-link" onClick={(e) => { if (onAdmin) { e.preventDefault(); onAdmin("/admin/costs"); } }}>
              <DollarSign className="smb-ico" aria-hidden="true" />
              <span>Costs</span>
            </a>
            <a href="/admin/users" className="smb-nav-link" onClick={(e) => { if (onAdmin) { e.preventDefault(); onAdmin("/admin/users"); } }}>
              <Users className="smb-ico" aria-hidden="true" />
              <span>Users</span>
            </a>
          </nav>
        ) : null}

        <div className="smb-side-grow" />

        {credits ? <div className="smb-side-credits">{credits}</div> : null}

        <div className="smb-me">
          <span className="smb-avatar" aria-hidden="true">{initials(username)}</span>
          <span className="smb-me-name" title={username}>{username || "Producer"}</span>
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
            {planLabel ? <span className="smb-badge">{planLabel}</span> : null}
            <button
              type="button"
              className="smb-avatar smb-avatar-btn"
              onClick={select("settings")}
              aria-label="Open settings"
            >
              {initials(username)}
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
