import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/ProgressBar";
import TrendingArtistsBox from "@/components/seo/TrendingArtistsBox";
import { youtubeTagChars } from "@/lib/seoModel";
import { scoreTone, verdictFor } from "@/lib/seoTools";
import "@/components/seo/FreeTagTool.css";

// The no-account tag generator: the search box, the progress while it runs, and the scored
// tags. Used on /free-tag-generator and the tag tool pages. Visitors get a few runs a day
// (runs_per_day, 3 by default), counted by the server against this id and the network
// address, so clearing this id isn't enough to go again. The allowance always comes from the
// API (GET /free-tags/status and each POST); the saved result is only shown again.
const VISITOR_KEY = "smb_free_tag_visitor";
const RESULT_KEY = "smb_free_tag_result";
const DEFAULT_RUNS = 3;

const visitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
};

const count = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null);

// The run allowance from a status or POST body: { runsLeft, runsPerDay, resetsAt }. runsLeft is
// null when the server didn't say. An older server only sends `used`, which means none left.
const allowanceFrom = (data, previous) => {
  const runsPerDay = count(data?.runs_per_day) ?? previous?.runsPerDay ?? DEFAULT_RUNS;
  let runsLeft = count(data?.runs_left);
  if (runsLeft === null && data?.used === true) runsLeft = 0;
  const resetsAt = typeof data?.resets_at === "string" ? data.resets_at : previous?.resetsAt || null;
  return { runsLeft, runsPerDay, resetsAt };
};

// When the runs come back, in the visitor's own time: "tomorrow at 12:00 AM PST".
const formatReset = (iso) => {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(at) - dayStart(new Date())) / 86400000);
  if (days <= 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `${at.toLocaleDateString(undefined, { weekday: "long" })} at ${time}`;
};

const usedMessage = (runsPerDay) =>
  `You've used today's ${runsPerDay} free tag runs. Come back tomorrow for more, or sign up free to get 3 more generations right now.`;

// Results saved before scores were kept have no scored_tags; they still show, without colours.
const savedResult = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(RESULT_KEY) || "null");
    if (!saved || !Array.isArray(saved.tags)) return null;
    return { query: saved.query || "", tags: saved.tags, scored_tags: Array.isArray(saved.scored_tags) ? saved.scored_tags : [] };
  } catch {
    return null;
  }
};

// The free run happens in one request, so these steps follow the clock, in the order the server works.
const STEPS = [
  { at: 0, text: "Reading your search" },
  { at: 4000, text: "Checking what people search on YouTube" },
  { at: 11000, text: "Pulling tags from videos that already rank" },
  { at: 20000, text: "Scoring each tag for search intent" },
  { at: 30000, text: "Trimming to YouTube's 500-character limit" },
  { at: 40000, text: "Almost done, finishing your list" },
];
const RUN_MS = 45000;

const DEMAND = { high: "High demand", medium: "Some demand", low: "Low demand" };
const COMPETITION = { low: "Low competition", medium: "Medium competition", high: "High competition" };

const chipTitle = (entry) => {
  const score = Number(entry?.score);
  if (!Number.isFinite(score) || score <= 0) return undefined;
  const signals = entry.signals || {};
  return [`${verdictFor(score)}: ${Math.round(score)} of 100`, DEMAND[signals.demand], COMPETITION[signals.competition]].filter(Boolean).join(" · ");
};

const FreeTagTool = ({ heading, placeholder = "e.g. ken carson type beat", initialQuery = "", showTrending = true }) => {
  const [query, setQuery] = useState(() => String(initialQuery || "").slice(0, 120));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(savedResult);
  // null until the server answers; until then the form shows and the server has the last word.
  const [allowance, setAllowance] = useState(null);
  const [usedNote, setUsedNote] = useState("");
  const id = useMemo(visitorId, []);
  const inputRef = useRef(null);

  const refreshStatus = useCallback(() => {
    axios
      .get(`${API}/free-tags/status`, { params: { visitor_id: id } })
      .then((res) => setAllowance((prev) => allowanceFrom(res.data, prev)))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const runsLeft = allowance?.runsLeft ?? null;
  const runsPerDay = allowance?.runsPerDay ?? DEFAULT_RUNS;
  const resetsAt = allowance?.resetsAt || null;
  const usedUp = runsLeft === 0;

  // Out of runs with the page left open: ask again just after they come back.
  useEffect(() => {
    if (!usedUp || !resetsAt) return undefined;
    const wait = new Date(resetsAt).getTime() - Date.now() + 5000;
    if (!Number.isFinite(wait) || wait <= 0 || wait > 86400000) return undefined;
    const timer = setTimeout(() => {
      setUsedNote("");
      refreshStatus();
    }, wait);
    return () => clearTimeout(timer);
  }, [usedUp, resetsAt, refreshStatus]);

  useEffect(() => {
    if (!loading) return undefined;
    setStep(0);
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      let next = 0;
      STEPS.forEach((s, i) => {
        if (elapsed >= s.at) next = i;
      });
      setStep(next);
    }, 500);
    return () => clearInterval(timer);
  }, [loading]);

  // A trending artist chip puts that search in the box.
  const pickQuery = useCallback((q) => {
    setQuery(String(q || "").slice(0, 120));
    if (inputRef.current) inputRef.current.focus({ preventScroll: true });
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/free-tags`, { query: q, visitor_id: id });
      const next = {
        query: res.data.query,
        tags: res.data.tags || [],
        scored_tags: Array.isArray(res.data.scored_tags) ? res.data.scored_tags : [],
      };
      setResult(next);
      if (count(res.data?.runs_left) !== null) {
        setAllowance((prev) => allowanceFrom(res.data, prev));
      } else if (res.data && "runs_left" in res.data) {
        // The server couldn't re-read the count: ask for it.
        refreshStatus();
      } else {
        // An older server: one run per visitor.
        setAllowance((prev) => ({ ...allowanceFrom(res.data, prev), runsLeft: 0 }));
      }
      try {
        localStorage.setItem(RESULT_KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: the result still shows */
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.code === "free_tags_used") {
        setAllowance((prev) => ({ ...allowanceFrom(detail, prev), runsLeft: 0 }));
        setUsedNote(typeof detail.message === "string" ? detail.message : "");
      } else {
        toast.error(typeof detail === "string" ? detail : detail?.message || "Couldn't generate tags. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(result.tags.join(", "));
      toast.success("Tags copied");
    } catch {
      toast.error("Couldn't copy. Select the tags and copy them yourself.");
    }
  };

  const scores = useMemo(() => {
    const byTag = {};
    (result?.scored_tags || []).forEach((entry) => {
      if (entry && entry.tag) byTag[String(entry.tag).toLowerCase()] = entry;
    });
    return byTag;
  }, [result]);
  const hasScores = Boolean(result) && result.tags.some((tag) => scoreTone(scores[tag.toLowerCase()]?.score));
  const chars = result ? youtubeTagChars(result.tags) : 0;

  const resetText = formatReset(resetsAt);

  return (
    <>
      {!usedUp ? (
        <form className="ftg-form" onSubmit={generate}>
          {heading ? <h2 className="policy-title ftt-heading">{heading}</h2> : null}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            maxLength={120}
            aria-label="Artist or vibe"
            required
          />
          <Button type="submit" className="smb-btn smb-btn--pri smb-btn--lg" disabled={loading || query.trim().length < 2}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {loading ? "Generating..." : result ? "Generate again" : "Generate my tags"}
          </Button>
          {runsLeft !== null ? (
            <p className="ftt-runs smb-mono" aria-live="polite">
              {runsLeft} of {runsPerDay} free {runsPerDay === 1 ? "run" : "runs"} left today
            </p>
          ) : null}
        </form>
      ) : null}

      {showTrending && !loading ? <TrendingArtistsBox onPick={usedUp ? undefined : pickQuery} /> : null}

      <ProgressBar isActive={loading} message={`${STEPS[step].text}...`} duration={RUN_MS} />

      {result ? (
        <section className="ftg-result" aria-live="polite">
          <div className="ftg-result-head">
            <h2 className="policy-title">Tags for "{result.query}"</h2>
            <span className={`smb-mono text-xs ${chars > 500 ? "smb-warn" : "smb-t3"}`}>
              {result.tags.length} tags, {chars} of 500 characters
            </span>
          </div>
          <ul className="ftg-tags">
            {result.tags.map((tag) => {
              const entry = scores[tag.toLowerCase()];
              const tone = scoreTone(entry?.score);
              return (
                <li key={tag} className={tone ? `ftt-chip ftt-chip--${tone}` : undefined} title={chipTitle(entry)}>
                  {tag}
                  {tone ? <span className="ftt-score">{Math.round(Number(entry.score))}</span> : null}
                </li>
              );
            })}
          </ul>
          {hasScores ? (
            <div className="ftt-legend" aria-label="What the colours mean">
              <span className="ftt-legend-item ftt-chip--good"><i aria-hidden="true" />60+</span>
              <span className="ftt-legend-item ftt-chip--ok"><i aria-hidden="true" />45 to 59</span>
              <span className="ftt-legend-item ftt-chip--weak"><i aria-hidden="true" />Under 45</span>
              <span className="ftt-legend-words">Scores out of 100: Strong 80+, Good 60+, Okay 40+, Weak below 40.</span>
            </div>
          ) : null}
          <Button type="button" onClick={copyAll} className="smb-btn smb-btn--sec">
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy all tags
          </Button>
        </section>
      ) : null}

      {usedUp ? (
        <section className="ftg-cta policy-feature-card u-cta" aria-live="polite">
          <h2 className="policy-title">You've used today's free runs.</h2>
          <p>{usedNote || usedMessage(runsPerDay)}</p>
          {resetText ? <p className="ftt-reset">Your free runs come back {resetText}.</p> : null}
          <Link to="/?signup=1" className="smb-btn smb-btn--pri smb-btn--lg">
            Sign up free
          </Link>
        </section>
      ) : result ? (
        <section className="ftg-cta policy-feature-card u-cta">
          <h2 className="policy-title">Want more runs?</h2>
          <p>
            Sign up free to get 3 more AI generations and 3 YouTube uploads, no card needed. After that, Plus is $5 a month for 50 of
            each.
          </p>
          <Link to="/?signup=1" className="smb-btn smb-btn--pri smb-btn--lg">
            Sign up free
          </Link>
        </section>
      ) : null}
    </>
  );
};

export default FreeTagTool;
