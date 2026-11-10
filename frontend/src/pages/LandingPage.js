import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { setAuthToken } from "@/lib/auth";
import "@/pages/LandingPage.css";

const steps = [
  {
    label: "Step 1",
    title: "Generate",
    body: "Type an artist or a vibe. Get 60 to 80 ranked tags that fit YouTube's 500 characters.",
  },
  {
    label: "Step 2",
    title: "Review",
    body: "Every tag has a score from real search demand and competition. Keep, cut or add your own.",
  },
  {
    label: "Step 3",
    title: "Upload",
    body: "Your beat and artwork become a video and go straight to your channel with the tags and description.",
  },
];

// Limits match TRIAL_DAILY_*, PLUS_V2_MONTHLY_* and PRO_V2_MONTHLY_* in backend/server.py.
const planCards = [
  {
    name: "Free trial",
    price: "3 days",
    description: "Try the whole workflow before you pay.",
    bullets: [
      "3 AI generations per day",
      "3 YouTube uploads per day",
      "Then Plus at $5/mo. Cancel anytime",
    ],
  },
  {
    name: "Plus",
    price: "$5/mo",
    description: "For producers uploading every week.",
    bullets: [
      "50 AI generations per month",
      "50 YouTube uploads per month",
      "Tags, descriptions, and Upload Studio",
      "No watermark",
    ],
  },
  {
    name: "Pro",
    price: "$10/mo",
    description: "Double the uploads, plus the tools to grow like the pros.",
    bullets: [
      "100 AI generations per month",
      "100 YouTube uploads per month",
      "Copy a pro producer's style with the plan agent",
      "Pro breakdowns and channel analytics",
      "Run several jobs at once",
    ],
  },
];


// The hero demo: one generation, looping. Each row and chip appears once the bar passes its mark.
const DEMO_ROWS = [
  { at: 0, t: "0:00", label: "Reading your search" },
  { at: 18, t: "0:04", label: "Searching YouTube for top type beats" },
  { at: 45, t: "0:09", label: "Checking demand for 84 tags" },
  { at: 80, t: "0:13", label: "Picking the best 500 characters" },
];
const DEMO_CHIPS = [
  { at: 62, label: "future type beat" },
  { at: 70, label: "future codeine crazy type beat" },
  { at: 76, label: "future mask off type beat" },
  { at: 82, label: "dark trap type beat" },
  { at: 88, label: "future x young thug" },
  { at: 96, label: "+26 more", ghost: true },
];
const DEMO_RANK = [
  { tag: "future type beat", score: 91, meta: "High demand · Low competition", acc: true },
  { tag: "future codeine crazy type beat", score: 84, meta: "High demand · Medium competition", acc: true },
  { tag: "future mask off type beat", score: 79, meta: "High demand · Medium competition", acc: true },
  { tag: "dark trap type beat", score: 61, meta: "Some demand · Proven on 5 uploads", acc: false },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const useDemoProgress = () => {
  const [pct, setPct] = useState(() => (prefersReducedMotion() ? 100 : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let frame;
    let start;
    const RUN = 7000;
    const HOLD = 2600;
    const tick = (now) => {
      if (start === undefined) start = now;
      const elapsed = (now - start) % (RUN + HOLD);
      const next = elapsed >= RUN ? 100 : Math.round((elapsed / RUN) * 100);
      setPct((prev) => (prev === next ? prev : next));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return pct;
};

// Adds .is-in to sections as they scroll into view, for the entrance animation.
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll("[data-reveal]");
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
};

const LandingPage = ({ setIsAuthenticated }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pct = useDemoProgress();
  const pageRef = useReveal();

  const doneRows = DEMO_ROWS.filter((row) => pct >= row.at);
  const currentRow = doneRows[doneRows.length - 1];
  const tagChars = pct < 62 ? 0 : Math.min(463, Math.round(((pct - 62) / 38) * 463));

  const openAuth = (mode) => {
    setAuthMode(mode);
    setIsLoginOpen(true);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, {
        username,
        password,
      });

      setAuthToken(response.data.access_token);
      setIsAuthenticated(true);
      setPassword("");
      toast.success(`Welcome ${authMode === "login" ? "back" : ""}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollTo = (id) => (event) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="landing-page lp" ref={pageRef}>
      <div className="lp-top">
        <span className="lp-aura lp-aura--a" aria-hidden="true" />
        <span className="lp-aura lp-aura--b" aria-hidden="true" />

        <header className="lp-nav">
          <a href="/" className="smb-wordmark lp-wordmark">SENDMYBEAT</a>
          <nav className="lp-links" aria-label="Sections">
            <a href="#how" onClick={scrollTo("how")}>How it works</a>
            <a href="#pricing" onClick={scrollTo("pricing")}>Pricing</a>
            <Link to="/spotlight">Spotlight</Link>
          </nav>
          <div className="lp-nav-right">
            <button type="button" className="lp-login" onClick={() => openAuth("login")}>Log in</button>
            <Button onClick={() => openAuth("register")} className="smb-btn smb-btn--pri smb-btn--sm" data-testid="landing-get-started">
              Get started
            </Button>
          </div>
        </header>

        <section className="lp-hero">
          <div className="lp-copy">
            <p className="smb-eyebrow">For beat producers on YouTube</p>
            <h1 className="lp-h1">Tags, descriptions and uploads for every beat.</h1>
            <p className="lp-sub">
              SendMyBeat finds the tags that rank, writes the description, renders the video and uploads it to your channel.
            </p>
            <div className="lp-ctas">
              <Button onClick={() => openAuth("register")} className="smb-btn smb-btn--pri smb-btn--lg">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#how" onClick={scrollTo("how")} className="smb-btn smb-btn--sec smb-btn--lg">
                See how it works
              </a>
            </div>
            <p className="smb-eyebrow">3-day free trial · then $5/mo · cancel anytime</p>
          </div>

          <div className="lp-demo" aria-label="Example: generating tags for future type beat">
            <div className="smb-card lp-demo-main">
              <div className="smb-card-head">
                <h2 className="smb-card-title">future type beat</h2>
                <span className="smb-mono lp-pct">{pct}%</span>
              </div>
              <div className="smb-bar"><i className="lp-bar-fill smb-bar-fill--acc" style={{ width: `${pct}%` }} /></div>
              <div className="lp-rows">
                {DEMO_ROWS.map((row) => {
                  const done = pct >= row.at && (row !== currentRow || pct >= 100);
                  const now = row === currentRow && pct < 100;
                  return (
                    <div key={row.label} className={`lp-row ${now ? "is-now" : ""} ${done ? "is-done" : ""}`}>
                      <span className="lp-row-time">{pct >= row.at ? row.t : "--:--"}</span>
                      <span className="lp-row-state" aria-hidden="true">
                        {done ? <Check className="lp-row-check" /> : now ? <i className="lp-dot" /> : <i className="lp-ring" />}
                      </span>
                      <span>{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="smb-card">
              <div className="lp-chips">
                {DEMO_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className={`lp-chip ${chip.ghost ? "lp-chip--ghost" : ""} ${pct >= chip.at ? "is-shown" : ""}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
              <div className="smb-meter">
                <div className="smb-meter-row">
                  <span className="smb-meter-label">YouTube tag limit</span>
                  <span className="smb-meter-value">{tagChars}<span className="smb-t3">/500</span></span>
                </div>
                <div className="smb-bar"><i className="lp-bar-fill smb-bar-fill--acc" style={{ width: `${(tagChars / 500) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="lp-strip" id="how">
        {steps.map((step) => (
          <div key={step.title} data-reveal>
            <span className="smb-eyebrow">{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        ))}
      </section>

      <section className="lp-proof">
        <div className="lp-proof-copy" data-reveal>
          <h2 className="lp-h2">See why every tag made the cut.</h2>
          <p className="smb-t2">
            Each tag gets a 0 to 100 score from YouTube&apos;s own search suggestions, how crowded the results are,
            and how it did on uploads you&apos;ve already made.
          </p>
          <div className="lp-chips">
            <span className="smb-pill smb-pill--ok">High demand</span>
            <span className="smb-pill smb-pill--warn">Medium competition</span>
          </div>
        </div>
        <div className="smb-card lp-rank" data-reveal>
          {DEMO_RANK.map((row, index) => (
            <div key={row.tag} className="lp-rank-row">
              <span className="lp-rank-n">{index + 1}</span>
              <span className="lp-rank-tag">{row.tag}</span>
              <span className="lp-rank-score">{row.score}</span>
              <div className="smb-bar lp-rank-bar">
                <i className={`smb-bar-fill ${row.acc ? "smb-bar-fill--acc" : ""}`} style={{ width: `${row.score}%`, animationDelay: `${index * 0.08}s` }} />
              </div>
              <span className="lp-rank-meta">{row.meta}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-plans" id="pricing">
        <h2 className="lp-h2" data-reveal>Plans</h2>
        <div className="lp-plan-grid">
          {planCards.map((plan) => {
            const recommended = plan.name === "Plus";
            const [amount, per] = plan.price.includes("/") ? plan.price.split("/") : [plan.price, null];
            return (
              <div key={plan.name} className={`lp-plan ${recommended ? "lp-plan--rec" : ""}`} data-reveal>
                <div className="lp-plan-top">
                  <h3>{plan.name}</h3>
                  {recommended ? <span className="smb-pill smb-pill--ok">Recommended</span> : null}
                </div>
                <div className="lp-price">
                  {amount}
                  {per ? <small>/{per}</small> : null}
                </div>
                <p className="smb-t2 lp-plan-desc">{plan.description}</p>
                <ul>
                  {plan.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => openAuth("register")}
                  className={`smb-btn ${recommended ? "smb-btn--pri" : "smb-btn--sec"} smb-btn--full`}
                >
                  {plan.name === "Free trial" ? "Start free trial" : `Get ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="lp-auth sm:max-w-md">
          <DialogHeader className="text-left">
            <span className="smb-wordmark lp-auth-mark">SENDMYBEAT</span>
            <DialogTitle className="lp-auth-title">
              {authMode === "login" ? "Welcome back" : "Create your account"}
            </DialogTitle>
            <DialogDescription className="smb-t2">
              {authMode === "login"
                ? "Log in to manage your beat uploads and metadata."
                : "Start your 3-day free trial and try the whole workflow."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuth} className="lp-auth-form">
            <div className="lp-field">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ProducerName"
                autoComplete="username"
                required
              />
            </div>
            <div className="lp-field">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            <Button type="submit" className="smb-btn smb-btn--pri smb-btn--lg smb-btn--full" disabled={isLoading}>
              {isLoading ? "One moment..." : authMode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="lp-auth-switch">
            {authMode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setAuthMode("register")}>Sign up</button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setAuthMode("login")}>Log in</button>
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
