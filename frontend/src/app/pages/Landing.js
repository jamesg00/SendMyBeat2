import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import * as api from "@/app/api";
import { AppIcon, Button, Card, JobProgress, Meter, PlayPauseIcon, Segmented, Sheet, cx } from "@/app/ui";
import { setAuthToken } from "@/lib/auth";

// The page before signing in: what SendMyBeat does, previews of each part of the app built from
// its own pieces, and the plans (the app's landing screen). Log in and sign up open a sheet.

const TAG_STEPS = ["Reading your search…", "Searching YouTube for top type beats…", "Pulling tags from similar videos…", "Asking AI for type beat variations…", "Scoring and ranking tags…"];

// Limits are TRIAL_DAILY_*, PLUS_V2_MONTHLY_* and PRO_V2_MONTHLY_* in backend/server.py.
const PLANS = [
  { name: "Free trial", price: "$0", per: "", badge: "3 days", lines: ["3 AI generations a day", "3 YouTube uploads a day", "Then Plus at $5/mo. Cancel anytime"] },
  { name: "Plus", price: "$5", per: "/mo", lines: ["50 AI generations a month", "50 YouTube uploads a month", "Tags, descriptions and Upload Studio", "No watermark"] },
  {
    name: "Pro",
    price: "$10",
    per: "/mo",
    badge: "Most popular",
    lines: ["100 AI generations a month", "100 YouTube uploads a month", "Copy a pro producer’s style", "Pro breakdowns and channel analytics", "Run several jobs at once"],
  },
];

export default function Landing({ onSignedIn }) {
  const [auth, setAuth] = useState(null);
  return (
    <div className="s-app">
      <header className="s-top">
        <span className="s-brand">
          <AppIcon size={28} />
          SendMyBeat
        </span>
        <span style={{ margin: "0 auto" }} />
        <div className="s-top-right">
          <Link to="/spotlight" className="s-link" style={{ color: "var(--t2)" }}>
            Spotlight
          </Link>
          <Button title="Log in" variant="secondary" size="sm" onClick={() => setAuth("login")} />
        </div>
      </header>

      <main className="s-screen s-screen--wide" style={{ gap: 72, paddingTop: 56 }}>
        <section className="s-cols" style={{ alignItems: "center" }}>
          <div className="s-col">
            <div className="s-stack" style={{ gap: 14 }}>
              <span className="s-kicker">For beat producers on YouTube</span>
              <h1 className="s-display" style={{ fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.06, letterSpacing: "-0.03em" }}>
                Tags, descriptions and uploads for every beat.
              </h1>
              <p style={{ color: "var(--t2)", fontSize: 17, lineHeight: "25px", maxWidth: 480 }}>SendMyBeat finds the tags that rank, writes the description, renders the video and uploads it to your channel.</p>
            </div>
            <div className="s-stack" style={{ gap: 10, maxWidth: 360 }}>
              <Button title="Get started" onClick={() => setAuth("register")} />
              <Button title="Log in" variant="secondary" onClick={() => setAuth("login")} />
              <span className="s-muted" style={{ textAlign: "center" }}>
                3-day free trial · cancel anytime
              </span>
            </div>
          </div>
          <TagRunDemo />
        </section>

        <section className="s-cols" style={{ rowGap: 48 }}>
          <Feature n="01" title="Tags that fit YouTube’s limit" body="Edit the generated tags as chips. The line fills toward YouTube’s 500-character limit as you go.">
            <TagEditorPreview />
          </Feature>
          <Feature n="02" title="Upload Studio" body="Pick your beat and cover art, hear it under the preview, and send it to YouTube as a video.">
            <StudioPreview />
          </Feature>
          <Feature n="03" title="Analytics" body="Views per upload, plus which titles are working. Included with Pro.">
            <ChartPreview />
          </Feature>
          <Feature n="04" title="Spotlight and Pros" body="A community of producers with a leaderboard, and the pros who blew up on YouTube: see why, and copy their moves.">
            <LeaderboardPreview />
          </Feature>
        </section>

        <section className="s-stack" style={{ gap: 16 }}>
          <div className="s-stack" style={{ gap: 6 }}>
            <span className="s-label">Pricing</span>
            <h2 className="s-display" style={{ fontSize: 28, letterSpacing: -0.5 }}>
              Try it free for 3 days.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {PLANS.map((p) => (
              <div key={p.name} className="s-card" style={{ gap: 10, borderRadius: 16, borderColor: p.badge === "Most popular" ? "var(--acc-line)" : undefined }}>
                <div className="s-row-between">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</span>
                    {p.badge ? <span className="s-badge">{p.badge.toUpperCase()}</span> : null}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>
                    {p.price}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--t3)" }}>{p.per}</span>
                  </span>
                </div>
                {p.lines.map((line) => (
                  <div key={line} style={{ display: "flex", gap: 8, color: "var(--t2)", fontSize: 14, lineHeight: "20px" }}>
                    <span style={{ color: "var(--t3)" }}>–</span>
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="s-muted">Without a plan you can still browse Pros and Spotlight. Change or cancel any time from Plan and billing in your profile.</p>
        </section>

        <section className="s-stack" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
          <h2 className="s-display" style={{ fontSize: 28, letterSpacing: -0.5 }}>
            Your next upload, done in minutes.
          </h2>
          <Button title="Get started" onClick={() => setAuth("register")} style={{ minWidth: 240 }} />
          <button type="button" className="s-link" style={{ color: "var(--t2)", fontWeight: 400 }} onClick={() => setAuth("login")}>
            Have an account? <b style={{ color: "var(--text)" }}>Log in</b>
          </button>
        </section>
      </main>

      <AuthSheet mode={auth} onClose={() => setAuth(null)} onSignedIn={onSignedIn} />
    </div>
  );
}

function AuthSheet({ mode: initial, onClose, onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initial) {
      setMode(initial);
      setError(null);
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await (mode === "login" ? api.login : api.register)(username.trim(), password);
      setAuthToken(res.access_token);
      setPassword("");
      onSignedIn(res.user);
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!initial} onClose={onClose} label={mode === "login" ? "Log in" : "Create account"}>
      <div className="s-row-between">
        <AppIcon size={36} />
        <button type="button" className="s-link s-sub" onClick={onClose}>
          Cancel
        </button>
      </div>
      <div className="s-stack" style={{ gap: 6 }}>
        <h2 className="s-display" style={{ fontSize: 30, letterSpacing: -0.3 }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="s-body">{mode === "login" ? "Log in to your SendMyBeat account." : "Free to start. No card needed."}</p>
      </div>
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        label="Log in or sign up"
        options={[
          { value: "login", label: "Log in" },
          { value: "register", label: "Sign up" },
        ]}
      />
      <form onSubmit={submit} className="s-stack" style={{ gap: 14 }}>
        <label className="s-field">
          <span>Username</span>
          <input className="s-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" placeholder="producer name" autoFocus />
        </label>
        <label className="s-field">
          <span>Password</span>
          <input className="s-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Your password" : "Choose a password"} />
        </label>
        {error ? (
          <span className="s-error" role="alert">
            {error}
          </span>
        ) : null}
        <Button title={busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"} type="submit" disabled={busy} />
        <p className="s-muted" style={{ textAlign: "center" }}>
          By continuing you agree to the <Link to="/terms" style={{ color: "var(--t2)" }}>Terms</Link> and <Link to="/privacy-policy" style={{ color: "var(--t2)" }}>Privacy policy</Link>.
        </p>
      </form>
    </Sheet>
  );
}

function Feature({ n, title, body, children }) {
  return (
    <div className="s-col" style={{ gap: 12 }}>
      <div className="s-stack" style={{ gap: 6 }}>
        <span className="s-kicker">{n}</span>
        <h2 className="s-display" style={{ fontSize: 24, letterSpacing: -0.4 }}>
          {title}
        </h2>
        <p className="s-body" style={{ fontSize: 15, lineHeight: "22px" }}>
          {body}
        </p>
      </div>
      {children}
    </div>
  );
}

// A tag run playing on a loop, using the same log Workflow shows.
function TagRunDemo() {
  const [startedAt, setStartedAt] = useState(() => Date.now() - 7000);
  useEffect(() => {
    const t = setInterval(() => setStartedAt(Date.now()), 26000);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-label="Example: tags being generated for dark trap type beat">
      <JobProgress title="dark trap type beat" startedAt={startedAt} expectedSec={25} steps={TAG_STEPS} />
    </div>
  );
}

const SAMPLE_TAGS = ["dark trap type beat", "trap beat 2026", "hard trap instrumental", "free type beat", "dark piano trap", "808 beat"];

function TagEditorPreview() {
  const chars = 438;
  return (
    <Card className="s-panel" aria-hidden="true">
      <div className="s-chips">
        {SAMPLE_TAGS.map((t, i) => (
          <span key={t} className={cx("s-chip", i === 1 && "s-chip--new")} style={{ cursor: "default" }}>
            {i === 1 ? `+ ${t}` : t}
            <span className="s-chip-x" style={i === 1 ? { color: "var(--acc)" } : undefined}>
              ×
            </span>
          </span>
        ))}
        <span className="s-chip s-chip--more" style={{ cursor: "default" }}>
          +64 more
        </span>
      </div>
      <div className="s-stack" style={{ gap: 8 }}>
        <Meter value={chars / 500} />
        <div className="s-row-between">
          <span className="s-muted">YouTube tag limit</span>
          <span className="s-mono">{chars} / 500</span>
        </div>
      </div>
    </Card>
  );
}

function StudioPreview() {
  const bars = Array.from({ length: 48 }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 0.9)) + 0.3 * Math.abs(Math.sin(i * 0.37)));
  return (
    <Card className="s-panel">
      <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 10, border: "1px solid var(--line)", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: "34%", aspectRatio: "1", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }} className="s-mono">
          cover.jpg
        </span>
        <span className="s-tag" style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)" }}>
          16:9 · 2 fps
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="s-beat-play" style={{ cursor: "default" }}>
          <PlayPauseIcon playing size={11} />
        </span>
        <div className="s-row-main" style={{ gap: 6 }}>
          <div style={{ height: 28, display: "flex", alignItems: "center", gap: 2 }}>
            {bars.map((h, i) => (
              <span key={i} style={{ flex: 1, height: `${Math.min(1, h) * 100}%`, borderRadius: 1, background: i < 13 ? "var(--text)" : "var(--wave)" }} />
            ))}
          </div>
          <div className="s-row-between">
            <span className="s-hint" style={{ color: "var(--text)" }}>
              0:42
            </span>
            <span className="s-hint">2:58</span>
          </div>
        </div>
      </div>
      <span className="s-btn s-btn--md" style={{ cursor: "default" }}>
        Upload to YouTube
      </span>
      <span className="s-hint" style={{ textAlign: "center" }}>
        mp4 · 1920×1080 · 2 fps · public
      </span>
    </Card>
  );
}

const VIEWS = [8.2, 10.6, 7.4, 12.9, 10.1, 11.8, 15.9, 21.0];

function ChartPreview() {
  const w = 400;
  const h = 130;
  const top = 14;
  const bottom = h - 20;
  const y = (v) => bottom - (v / 24) * (bottom - top);
  const x = (i) => (i / (VIEWS.length - 1)) * (w - 8) + 4;
  const text = { fill: "var(--t3)", fontSize: 10, fontFamily: "var(--mono)" };
  return (
    <Card className="s-panel">
      <div className="s-stack" style={{ gap: 2 }}>
        <span className="s-muted">Views, last 8 uploads · sample channel</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>97.9K</span>
          <span className="s-mono s-ok">+18%</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Example analytics chart: views per upload rising over the last 8 uploads">
        {[10, 20].map((t) => (
          <g key={t}>
            <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke="var(--line-soft)" />
            <text x={0} y={y(t) - 4} {...text}>
              {t}K
            </text>
          </g>
        ))}
        <line x1={0} x2={w} y1={bottom} y2={bottom} stroke="var(--line)" />
        <polyline points={VIEWS.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--text)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(VIEWS.length - 1)} cy={y(VIEWS[VIEWS.length - 1])} r={4} fill="var(--bg)" stroke="var(--acc)" strokeWidth={2} />
        <text x={0} y={h - 4} {...text}>
          8 uploads ago
        </text>
        <text x={w} y={h - 4} textAnchor="end" {...text}>
          Latest · 21.0K
        </text>
      </svg>
    </Card>
  );
}

const LEADERS = [
  { name: "nightshift", pts: 412 },
  { name: "lowend.audio", pts: 386 },
  { name: "kairo beats", pts: 351 },
];

function LeaderboardPreview() {
  const row = (rank, name, pts, you) => (
    <div key={name} className={cx("s-hair", you && "s-you")} style={{ minHeight: 46 }}>
      <span className="s-mono" style={{ width: 22, fontSize: 13, color: you || Number(rank) <= 3 ? "var(--text)" : undefined }}>
        {rank}
      </span>
      <span className="s-avatar" style={{ width: 26, height: 26 }} />
      <span style={{ flex: 1, fontWeight: you ? 700 : 400 }}>{name}</span>
      <span className="s-mono" style={{ color: you ? "var(--text)" : undefined }}>
        {pts}
      </span>
    </div>
  );
  return (
    <Card className="s-panel">
      <div className="s-row-between">
        <span className="s-label">Leaderboard</span>
        <span className="s-muted">Trending</span>
      </div>
      <div>
        {LEADERS.map((p, i) => row(String(i + 1), p.name, p.pts))}
        {row("14", "You", 188, true)}
      </div>
    </Card>
  );
}
