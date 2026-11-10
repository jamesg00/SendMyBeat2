import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Check, FileText, Pause, Play, Sparkles, Star, Tags, Upload, Users } from "lucide-react";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAuthToken } from "@/lib/auth";
import { useTheme } from "@/lib/ThemeContext";
import "@/pages/LandingPage.css";

// The page before signing in. It explains the app by letting you use small working copies of it:
// a tag run you can start, the four steps you can click through, a style-match slider, a plan
// picker and the theme gallery. Everything here runs on sample data; nothing is sent anywhere.

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---- sample data for the demos

const LOG_STEPS = ["Reading your search…", "Searching YouTube for top type beats…", "Pulling tags from similar videos…", "Asking AI for type beat variations…", "Scoring and ranking tags…"];

// Tag shapes the generator returns for any artist; {a} is what you typed.
const TAG_SHAPES = [
  ["{a} type beat", 87, "high", "low", "People search this exact phrase often and few uploads target it, so a new video can rank."],
  ["{a} type beat 2026", 81, "high", "medium", "The year catches people looking for new beats in this style."],
  ["free {a} type beat", 76, "high", "high", "Lots of searches, but many videos already fight for it."],
  ["{a} instrumental", 71, "medium", "low", "Fewer searches, but very little competition."],
  ["{a} type beat hard", 68, "medium", "medium", "A mood word narrows the search to listeners who want this energy."],
  ["dark {a} type beat", 64, "medium", "low", "Pairs the artist with a mood people add when they search."],
  ["{a} x type beat", 59, "medium", "medium", "Collab-style searches are common for this lane."],
  ["{a} beat", 47, "low", "high", "Too broad: it competes with the artist's own songs."],
];
const SUGGESTIONS = ["travis scott", "ken carson", "dark trap", "pluggnb"];
const LEVEL = { high: "High", medium: "Medium", low: "Low" };
const tagChars = (tags) => (tags.length ? tags.reduce((n, t) => n + t.length + (t.includes(" ") ? 2 : 0), 0) + tags.length - 1 : 0);

const STEPS = [
  { id: "generate", icon: Tags, title: "Generate tags", body: "Type an artist or a vibe. SendMyBeat searches YouTube, pulls tags from the videos that rank, and returns 60 to 80 that fit YouTube's 500-character limit." },
  { id: "review", icon: Sparkles, title: "Review the ranking", body: "Every tag gets a score from real search demand and competition. See them best to worst, open one to read why, and cut the weak ones." },
  { id: "upload", icon: Upload, title: "Upload from the studio", body: "Drop in your beat and cover art. Upload Studio renders the video and publishes it to your channel with the title, tags and description filled in." },
  { id: "grow", icon: BarChart3, title: "See what's working", body: "Analytics compares each upload with your own average and suggests better titles. Pros shows how the biggest producers grew, with moves you can copy." },
];

const FEATURES = [
  { icon: Tags, title: "Tags that rank", body: "60 to 80 tags per run, each scored on search demand and competition, with a meter for YouTube's 500-character limit." },
  { icon: FileText, title: "Descriptions", body: "Start from a template for type beats, beat sales or free-for-profit, then save your own to reuse on every upload." },
  { icon: Upload, title: "Upload Studio", body: "Beat plus artwork becomes a video. Pick the layout, add a visualizer, preview it and publish without leaving the page." },
  { icon: BarChart3, title: "Channel analytics", body: "Views per upload against your average, the title patterns that win and lose, and a better title for each weak upload. Pro." },
  { icon: Star, title: "Pros", body: "Why the biggest type-beat producers blew up, how their channels work, how close your style is, and a 14-day plan to copy it. Pro." },
  { icon: Users, title: "Spotlight", body: "A public profile with your top beat, a leaderboard driven by upload streaks, and other producers to follow." },
];

const PLANS = [
  { id: "trial", name: "Free trial", price: "$0", per: "3 days", limit: 3, unit: "a day", lines: ["3 AI generations a day", "3 YouTube uploads a day", "Then Plus at $5/mo. Cancel anytime"] },
  { id: "plus", name: "Plus", price: "$5", per: "/mo", limit: 50, unit: "a month", lines: ["50 AI generations a month", "50 YouTube uploads a month", "Tags, descriptions and Upload Studio", "No watermark"] },
  { id: "pro", name: "Pro", price: "$10", per: "/mo", limit: 100, unit: "a month", lines: ["100 AI generations a month", "100 YouTube uploads a month", "Copy a pro producer's style", "Pro breakdowns and channel analytics", "Run several jobs at once"] },
];

const FAQ = [
  ["Do I need a card for the free trial?", "The trial runs through Stripe, so you enter a card, but you aren't charged for the first 3 days and can cancel before it ends."],
  ["Where do the tags come from?", "From YouTube itself: what people type into search, and the tags on videos that already rank for your artist. AI adds variations, then every tag is scored."],
  ["Does it upload to my own channel?", "Yes. You connect your Google account once, and uploads go to that YouTube channel as public, unlisted or private videos."],
  ["What can I do without a plan?", "Browse Spotlight and read the Pros stories. Generating tags, uploading and analytics need the trial or a plan."],
  ["Is there a phone app?", "An Android app with the same account and features is on the way."],
];

// ---- small hooks

/** Fades sections in as they scroll into view. */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll("[data-reveal]");
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** A soft light that follows the pointer across an element. */
const followPointer = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
};

// ---- the tag run you can start

function TagLab() {
  const [query, setQuery] = useState("travis scott");
  const [run, setRun] = useState({ artist: "travis scott", phase: "done", step: LOG_STEPS.length });
  const [open, setOpen] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = (artist) => {
    const name = artist.trim().toLowerCase().slice(0, 28);
    if (!name) return;
    clearInterval(timer.current);
    setQuery(name);
    setOpen(null);
    if (reducedMotion()) {
      setRun({ artist: name, phase: "done", step: LOG_STEPS.length });
      setOpen(0);
      return;
    }
    setRun({ artist: name, phase: "running", step: 0 });
    timer.current = setInterval(() => {
      setRun((cur) => {
        if (cur.step + 1 >= LOG_STEPS.length) {
          clearInterval(timer.current);
          setOpen(0);
          return { ...cur, phase: "done", step: LOG_STEPS.length };
        }
        return { ...cur, step: cur.step + 1 };
      });
    }, 520);
  };

  const tags = useMemo(() => TAG_SHAPES.map(([shape, score, demand, competition, why]) => ({ tag: shape.replace("{a}", run.artist), score, demand, competition, why })), [run.artist]);
  const chars = tagChars(tags.map((t) => t.tag));
  const detail = open == null ? null : tags[open];
  const pct = run.phase === "done" ? 100 : Math.round(((run.step + 0.5) / LOG_STEPS.length) * 100);

  return (
    <div className="lp-lab" onMouseMove={followPointer}>
      <div className="lp-lab-bar">
        <span className="lp-lab-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="smb-mono">Create · Generate tags</span>
        <span className="smb-pill smb-pill--ok"><span className="smb-pill-dot" />Try it</span>
      </div>

      <form
        className="lp-lab-form"
        onSubmit={(e) => {
          e.preventDefault();
          start(query);
        }}
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type an artist or a vibe" aria-label="Artist or vibe" maxLength={28} />
        <Button type="submit" className="smb-btn smb-btn--pri" disabled={run.phase === "running"}>
          <Sparkles className="h-4 w-4" />
          Generate
        </Button>
      </form>
      <div className="lp-lab-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => start(s)} className={run.artist === s ? "is-active" : ""}>
            {s}
          </button>
        ))}
      </div>

      <div className="lp-lab-run">
        <div className="smb-meter-row">
          <b className="truncate">{run.artist}</b>
          <span className="smb-meter-value">{pct}%</span>
        </div>
        <span className="smb-bar"><span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${pct}%`, animation: "none" }} /></span>
        {run.phase === "running" ? (
          <ul className="lp-log" aria-live="polite">
            {LOG_STEPS.slice(0, run.step + 1).map((line, i) => (
              <li key={line} className={i < run.step ? "is-done" : "is-now"}>
                <span>{i < run.step ? "✓" : "●"}</span>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="lp-lab-tags" role="list">
              {tags.map((t, i) => (
                <button key={t.tag} type="button" role="listitem" className={`lp-tag ${open === i ? "is-active" : ""}`} style={{ animationDelay: `${i * 45}ms` }} onClick={() => setOpen(open === i ? null : i)}>
                  <i className={`tag-dot tag-dot--${t.demand}`} />
                  {t.tag}
                  <span>{t.score}</span>
                </button>
              ))}
            </div>
            {detail ? (
              <div className="lp-lab-detail" key={detail.tag}>
                <span className={`lp-lab-score ${detail.score >= 60 ? "smb-acc" : ""}`}>{detail.score}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={`smb-pill ${detail.demand === "high" ? "smb-pill--ok" : detail.demand === "low" ? "smb-pill--bad" : ""}`}>{LEVEL[detail.demand]} demand</span>
                    <span className={`smb-pill ${detail.competition === "low" ? "smb-pill--ok" : detail.competition === "high" ? "smb-pill--bad" : ""}`}>{LEVEL[detail.competition]} competition</span>
                  </div>
                  <p>{detail.why}</p>
                </div>
              </div>
            ) : (
              <p className="smb-t3 text-xs">Click a tag to see why it got its score.</p>
            )}
            <div className="smb-meter-row">
              <span className="smb-meter-label">YouTube tag limit</span>
              <span className="smb-meter-value">{chars} / 500</span>
            </div>
          </>
        )}
      </div>
      <p className="lp-lab-note">A demo with sample scores. Real runs return 60 to 80 tags from live YouTube data.</p>
    </div>
  );
}

// ---- how it works: four steps you can click through

const VIEWS = [820, 1060, 740, 1290, 1010, 1180, 1590, 2100];

function StepPreview({ id }) {
  const [playing, setPlaying] = useState(true);
  const [picked, setPicked] = useState(VIEWS.length - 1);

  if (id === "generate") {
    return (
      <div className="lp-prev">
        <div className="lp-prev-search">
          <span>ken carson</span>
          <span className="lp-prev-key">return</span>
        </div>
        <ul className="lp-log lp-log--loop">
          {LOG_STEPS.map((line, i) => (
            <li key={line} style={{ animationDelay: `${i * 0.7}s` }}>
              <span>✓</span>
              {line}
            </li>
          ))}
        </ul>
        <p className="smb-mono smb-t3 text-xs">60–80 tags · about 45 seconds · 1 credit</p>
      </div>
    );
  }
  if (id === "review") {
    const rows = [["ken carson type beat", 91, "High demand · Low competition"], ["opium type beat", 84, "High demand · Medium competition"], ["destroy lonely type beat", 79, "High demand"], ["rage beat 2026", 66, "Some demand · Low competition"], ["free trap beat", 44, "Low demand · High competition"]];
    return (
      <div className="lp-prev">
        {rows.map(([tag, score, levels], i) => (
          <div key={tag} className="lp-rank" style={{ animationDelay: `${i * 90}ms` }}>
            <span className="smb-mono smb-t3">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="smb-meter-row">
                <span className="smb-mono truncate">{tag}</span>
                <span className="smb-mono">{score}</span>
              </span>
              <span className="smb-bar"><span className={`smb-bar-fill ${score >= 60 ? "smb-bar-fill--acc" : ""}`} style={{ width: `${score}%` }} /></span>
              <span className="smb-t3 text-xs">{levels}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (id === "upload") {
    return (
      <div className="lp-prev">
        <div className="lp-video">
          <span className="lp-video-cover">cover.jpg</span>
          <span className="lp-video-badge smb-mono">16:9 · 1080p</span>
        </div>
        <div className="lp-player">
          <button type="button" className="lp-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the preview" : "Play the preview"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className={`lp-wave ${playing ? "is-playing" : ""}`} aria-hidden="true">
            {Array.from({ length: 36 }, (_, i) => (
              <i key={i} style={{ height: `${30 + 60 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31))}%`, animationDelay: `${(i % 9) * 0.09}s` }} />
            ))}
          </div>
        </div>
        <div className="lp-prev-rows">
          <div><span>Title</span><b>ken carson type beat – “vamp”</b></div>
          <div><span>Tags</span><b>ken carson · 64 tags</b></div>
          <div><span>Privacy</span><b>Public</b></div>
        </div>
      </div>
    );
  }
  const max = 2400;
  const avg = VIEWS.reduce((a, b) => a + b, 0) / VIEWS.length;
  const w = 360;
  const h = 150;
  const x = (i) => 10 + (i / (VIEWS.length - 1)) * (w - 20);
  const y = (v) => h - 22 - (v / max) * (h - 36);
  const diff = Math.round(((VIEWS[picked] - avg) / avg) * 100);
  return (
    <div className="lp-prev">
      <div className="flex items-baseline gap-2">
        <span className="lp-big">{VIEWS[picked].toLocaleString()}</span>
        <span className="smb-t2 text-sm">views</span>
        <span className={`smb-mono ml-auto text-sm ${diff >= 0 ? "smb-acc" : "smb-danger"}`}>{diff >= 0 ? "+" : "−"}{Math.abs(diff)}% vs your average</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="lp-chart" role="img" aria-label="Example chart of views per upload; hover a point to pick an upload">
        <line x1="10" x2={w - 10} y1={y(avg)} y2={y(avg)} stroke="var(--c-t3)" strokeDasharray="4 4" />
        <polyline points={VIEWS.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--c-text)" strokeWidth="1.75" strokeLinejoin="round" />
        {VIEWS.map((v, i) => (
          <g key={i} onMouseEnter={() => setPicked(i)} onClick={() => setPicked(i)} style={{ cursor: "pointer" }}>
            <rect x={x(i) - 20} y="0" width="40" height={h} fill="transparent" />
            <circle cx={x(i)} cy={y(v)} r={i === picked ? 6 : 3.5} fill={i === picked ? "var(--c-bg)" : v >= avg ? "var(--c-text)" : "var(--c-danger)"} stroke={v >= avg ? "var(--c-text)" : "var(--c-danger)"} strokeWidth={i === picked ? 2.5 : 0} />
          </g>
        ))}
      </svg>
      <p className="smb-t3 text-xs">Sample channel. Hover the chart: red uploads are below the average, and each gets a suggested title.</p>
    </div>
  );
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || reducedMotion()) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 6000);
    return () => clearInterval(t);
  }, [auto]);
  const step = STEPS[active];
  return (
    <div className="lp-how" onMouseEnter={() => setAuto(false)}>
      <div className="lp-how-steps" role="tablist" aria-label="How it works">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            className={`lp-how-step ${active === i ? "is-active" : ""}`}
            onClick={() => {
              setActive(i);
              setAuto(false);
            }}
          >
            <span className="lp-how-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <b>{s.title}</b>
              <span className="lp-how-body">{s.body}</span>
            </span>
            {active === i && auto ? <i className="lp-how-timer" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <div className="lp-how-stage" key={step.id} onMouseMove={followPointer}>
        <div className="lp-how-stage-head">
          <step.icon className="h-4 w-4" aria-hidden="true" />
          <span className="smb-mono">{step.title}</span>
        </div>
        <StepPreview id={step.id} />
      </div>
    </div>
  );
}

// ---- Pros: drag your habits and watch the match change

function MatchDemo() {
  const [perWeek, setPerWeek] = useState(2);
  const [artistFirst, setArtistFirst] = useState(true);
  const [quotes, setQuotes] = useState(false);
  const match = Math.round(Math.min(1, perWeek / 6) * 50 + (artistFirst ? 28 : 0) + (quotes ? 22 : 0));
  const verdict = match >= 85 ? "You already upload like them" : match >= 60 ? "You're close to their style" : match >= 35 ? "You're halfway there" : "They work very differently";
  return (
    <div className="lp-match">
      <div className="lp-match-ring" style={{ "--p": match }}>
        <b>{match}%</b>
        <span>match</span>
      </div>
      <div className="lp-match-controls">
        <b className="lp-match-verdict">{verdict}</b>
        <label className="lp-slider">
          <span className="smb-meter-row">
            <span>Uploads a week</span>
            <span className="smb-mono">{perWeek} vs 6</span>
          </span>
          <input type="range" min="0" max="7" step="1" value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} />
        </label>
        <button type="button" role="switch" aria-checked={artistFirst} className={`lp-toggle ${artistFirst ? "is-on" : ""}`} onClick={() => setArtistFirst((v) => !v)}>
          <i /> Artist's name first in the title
        </button>
        <button type="button" role="switch" aria-checked={quotes} className={`lp-toggle ${quotes ? "is-on" : ""}`} onClick={() => setQuotes((v) => !v)}>
          <i /> Beat name in quotes
        </button>
        <p className="smb-t3 text-xs">An example of You vs them. In the app the numbers come from your real uploads and the pro's last 50.</p>
      </div>
    </div>
  );
}

// ---- pricing: say how much you upload, see the plan

function Pricing({ onStart }) {
  const [uploads, setUploads] = useState(20);
  const [wantPro, setWantPro] = useState(false);
  const pick = wantPro || uploads > 50 ? "pro" : "plus";
  return (
    <>
      <div className="lp-calc">
        <label className="lp-slider">
          <span className="smb-meter-row">
            <span>How many beats do you upload a month?</span>
            <span className="smb-mono">{uploads >= 100 ? "100" : uploads}</span>
          </span>
          <input type="range" min="1" max="100" value={uploads} onChange={(e) => setUploads(Number(e.target.value))} />
        </label>
        <button type="button" role="switch" aria-checked={wantPro} className={`lp-toggle ${wantPro ? "is-on" : ""}`} onClick={() => setWantPro((v) => !v)}>
          <i /> I want analytics and to copy a pro's style
        </button>
        <p className="lp-calc-out">
          {pick === "pro" ? "Pro fits: 100 uploads a month, plus analytics and Pros." : "Plus fits: 50 uploads a month covers you."} Either way, the first 3 days are free.
        </p>
      </div>
      <div className="lp-plans">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`lp-plan ${plan.id === pick ? "is-pick" : ""}`} onMouseMove={followPointer}>
            <div className="lp-plan-head">
              <b>{plan.name}</b>
              {plan.id === pick ? <span className="smb-pill smb-pill--ok">Fits you</span> : plan.id === "trial" ? <span className="smb-pill">Start here</span> : null}
            </div>
            <p className="lp-plan-price">
              {plan.price}
              <span>{plan.per}</span>
            </p>
            <ul className="smb-checklist">
              {plan.lines.map((line) => (
                <li key={line}>
                  <Check aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <Button onClick={onStart} className={`smb-btn smb-btn--full ${plan.id === pick || plan.id === "trial" ? "smb-btn--pri" : "smb-btn--sec"}`}>
              {plan.id === "trial" ? "Start free trial" : `Start with ${plan.name}`}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- the page

const LandingPage = ({ setIsAuthenticated }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme, palettes } = useTheme();
  const pageRef = useReveal();

  const openAuth = (mode) => {
    setAuthMode(mode);
    setIsLoginOpen(true);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, { username, password });
      setAuthToken(response.data.access_token);
      setIsAuthenticated(true);
      setPassword("");
      toast.success(`Welcome ${authMode === "login" ? "back" : ""}!`);
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };
  const start = () => openAuth("register");

  return (
    <div className="landing-page lp" ref={pageRef}>
      <header className="lp-nav">
        <a href="/" className="smb-wordmark lp-wordmark">SENDMYBEAT</a>
        <nav className="lp-links" aria-label="Sections">
          <a href="#how" onClick={scrollTo("how")}>How it works</a>
          <a href="#features" onClick={scrollTo("features")}>Features</a>
          <a href="#pros" onClick={scrollTo("pros")}>Pros</a>
          <a href="#pricing" onClick={scrollTo("pricing")}>Pricing</a>
          <Link to="/spotlight">Spotlight</Link>
        </nav>
        <div className="lp-nav-actions">
          <button type="button" className="lp-login" onClick={() => openAuth("login")}>Log in</button>
          <Button onClick={start} className="smb-btn smb-btn--pri smb-btn--sm" data-testid="landing-get-started">
            Get started
          </Button>
        </div>
      </header>

      <section className="lp-hero" onMouseMove={followPointer}>
        <div className="lp-hero-copy">
          <p className="smb-eyebrow">For beat producers on YouTube</p>
          <h1 className="lp-h1">
            Made a beat?
            <span>Get it found.</span>
          </h1>
          <p className="lp-lede">SendMyBeat finds the tags that rank, writes the description, renders the video and uploads it to your channel. Then it shows you what to fix next.</p>
          <div className="lp-cta">
            <Button onClick={start} className="smb-btn smb-btn--pri smb-btn--lg">
              Start free for 3 days <ArrowRight className="h-4 w-4" />
            </Button>
            <a href="#how" onClick={scrollTo("how")} className="smb-btn smb-btn--sec smb-btn--lg">See how it works</a>
          </div>
          <ul className="lp-ticks">
            <li><Check aria-hidden="true" /> Cancel anytime</li>
            <li><Check aria-hidden="true" /> Uploads to your own channel</li>
            <li><Check aria-hidden="true" /> Works on your phone too</li>
          </ul>
        </div>
        <TagLab />
      </section>

      <section className="lp-section" id="how" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">How it works</p>
          <h2 className="lp-h2">From a finished beat to a ranked upload, in four steps.</h2>
          <p className="smb-t2">Click a step to try it. Each preview is a small working piece of the app.</p>
        </div>
        <HowItWorks />
      </section>

      <section className="lp-section" id="features" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">What's inside</p>
          <h2 className="lp-h2">Everything a type-beat channel needs, in one place.</h2>
        </div>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <article key={f.title} className="lp-feature" onMouseMove={followPointer}>
              <span className="lp-feature-ico"><f.icon className="h-5 w-5" aria-hidden="true" /></span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-split" id="pros" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">Pros</p>
          <h2 className="lp-h2">See how close you are to the producers who blew up.</h2>
          <p className="smb-t2">
            Pros breaks down the biggest type-beat channels: their title formula, how often they upload, and which uploads carried the channel. You vs them compares your uploads with theirs and turns the gaps into a 14-day plan.
          </p>
          <ul className="lp-ticks lp-ticks--col">
            <li><Check aria-hidden="true" /> Stories are free to read</li>
            <li><Check aria-hidden="true" /> Breakdowns, your match and the plan are part of Pro</li>
          </ul>
        </div>
        <MatchDemo />
      </section>

      <section className="lp-section" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">Make it yours</p>
          <h2 className="lp-h2">Pick a look. The whole site follows.</h2>
          <p className="smb-t2">The same 11 themes as the app. Try one now; your choice is kept after you sign in.</p>
        </div>
        <div className="lp-themes" role="radiogroup" aria-label="Theme">
          {palettes.map((palette) => {
            const [bg, fg, acc] = palette.swatch;
            return (
              <button key={palette.id} type="button" role="radio" aria-checked={theme === palette.id} className={`lp-theme ${theme === palette.id ? "is-active" : ""}`} onClick={() => setTheme(palette.id)}>
                <span className="lp-theme-swatch" style={{ background: bg }} aria-hidden="true">
                  <i style={{ background: fg }} />
                  <i style={{ background: acc }} />
                </span>
                {palette.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="lp-section" id="pricing" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">Pricing</p>
          <h2 className="lp-h2">Try it free for 3 days.</h2>
        </div>
        <Pricing onStart={start} />
      </section>

      <section className="lp-section lp-faq-wrap" data-reveal>
        <div className="lp-section-head">
          <p className="smb-eyebrow">Questions</p>
          <h2 className="lp-h2">Before you start.</h2>
        </div>
        <div className="lp-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final" data-reveal onMouseMove={followPointer}>
        <h2 className="lp-h2">Your next upload, done in minutes.</h2>
        <p className="smb-t2">Tags, description, video and upload, from one page.</p>
        <Button onClick={start} className="smb-btn smb-btn--pri smb-btn--lg">
          Start free for 3 days <ArrowRight className="h-4 w-4" />
        </Button>
        <button type="button" className="lp-login" onClick={() => openAuth("login")}>Have an account? Log in</button>
      </section>

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="lp-auth sm:max-w-md">
          <DialogHeader className="text-left">
            <span className="smb-wordmark lp-auth-mark">SENDMYBEAT</span>
            <DialogTitle className="lp-auth-title">{authMode === "login" ? "Welcome back" : "Create your account"}</DialogTitle>
            <DialogDescription className="smb-t2">
              {authMode === "login" ? "Log in to manage your beat uploads and metadata." : "Start your 3-day free trial and try the whole workflow."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuth} className="lp-auth-form">
            <div className="lp-field">
              <Label htmlFor="auth-username">Username</Label>
              <Input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ProducerName" autoComplete="username" required />
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
                Don&apos;t have an account? <button type="button" onClick={() => setAuthMode("register")}>Sign up</button>
              </>
            ) : (
              <>
                Already have an account? <button type="button" onClick={() => setAuthMode("login")}>Log in</button>
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
