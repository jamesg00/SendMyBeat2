import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/ProgressBar";
import { youtubeTagChars } from "@/lib/seoModel";
import { scoreTone, verdictFor } from "@/lib/seoTools";
import "@/components/seo/FreeTagTool.css";

// The no-account tag generator: the search box, the progress while it runs, and the scored
// tags. Used on /free-tag-generator and /tag-my-beat. One free run per visitor; the server
// also checks the network address, so clearing this id isn't enough to go again.
const VISITOR_KEY = "smb_free_tag_visitor";
const RESULT_KEY = "smb_free_tag_result";

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

const FreeTagTool = ({ heading, placeholder = "e.g. ken carson type beat", initialQuery = "" }) => {
  const [query, setQuery] = useState(() => String(initialQuery || "").slice(0, 120));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(savedResult);
  const [used, setUsed] = useState(Boolean(savedResult()));
  const id = useMemo(visitorId, []);

  useEffect(() => {
    if (used) return;
    axios
      .get(`${API}/free-tags/status`, { params: { visitor_id: id } })
      .then((res) => setUsed(Boolean(res.data?.used)))
      .catch(() => {});
  }, [id, used]);

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

  const generate = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/free-tags`, { query: q, visitor_id: id });
      const next = {
        query: res.data.query,
        tags: res.data.tags || [],
        scored_tags: Array.isArray(res.data.scored_tags) ? res.data.scored_tags : [],
      };
      setResult(next);
      setUsed(true);
      try {
        localStorage.setItem(RESULT_KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: the result still shows */
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.code === "free_tags_used") setUsed(true);
      toast.error(typeof detail === "string" ? detail : detail?.message || "Couldn't generate tags. Try again.");
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

  return (
    <>
      {!result && !used ? (
        <form className="ftg-form" onSubmit={generate}>
          {heading ? <h2 className="policy-title ftt-heading">{heading}</h2> : null}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            maxLength={120}
            aria-label="Artist or vibe"
            required
          />
          <Button type="submit" className="smb-btn smb-btn--pri smb-btn--lg" disabled={loading || query.trim().length < 2}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {loading ? "Generating..." : "Generate my tags"}
          </Button>
        </form>
      ) : null}

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

      {used ? (
        <section className="ftg-cta policy-feature-card u-cta">
          <h2 className="policy-title">{result ? "Want more runs?" : "You've used your free run."}</h2>
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
