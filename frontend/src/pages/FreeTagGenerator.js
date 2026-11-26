import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/ProgressBar";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

// One free run per visitor, no account. The server also checks the network address,
// so clearing this id isn't enough to go again.
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

const savedResult = () => {
  try {
    return JSON.parse(localStorage.getItem(RESULT_KEY) || "null");
  } catch {
    return null;
  }
};

const tagChars = (tags) => tags.join(",").length;

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

const FreeTagGenerator = () => {
  const [query, setQuery] = useState("");
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
      const next = { query: res.data.query, tags: res.data.tags || [] };
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

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <div className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">Free tool, no account</p>
          <h1 className="policy-title ftg-h1">Free YouTube tag generator for type beats</h1>
          <p className="policy-muted ftg-lede">
            Type an artist or a vibe, like "future type beat" or "dark trap". You get YouTube tags pulled from what people search
            and the tags on videos that already rank, sized for YouTube's 500-character limit. One free run, no sign-up.
          </p>

          {!result && !used ? (
            <form className="ftg-form" onSubmit={generate}>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. ken carson type beat"
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
                <span className="smb-mono smb-t3 text-xs">{result.tags.length} tags, {tagChars(result.tags)} characters</span>
              </div>
              <ul className="ftg-tags">
                {result.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <Button type="button" onClick={copyAll} className="smb-btn smb-btn--sec">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy all tags
              </Button>
            </section>
          ) : null}

          {used ? (
            <section className="ftg-cta policy-feature-card">
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

          <section className="ftg-copy">
            <h2 className="policy-title">How the tags are picked</h2>
            <p>
              SendMyBeat reads YouTube's own search suggestions and the tags on type beats that already rank for your artist. AI adds
              close variations, then every tag is scored on search demand and competition, and the weakest are cut so the set fits
              in YouTube's tag box.
            </p>
            <h2 className="policy-title">What else SendMyBeat does</h2>
            <p>
              With an account you can write descriptions, turn your beat and artwork into a video with a visualizer, and upload it
              straight to your YouTube channel. See <Link to="/">how it works</Link> or read <Link to="/about">about SendMyBeat</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FreeTagGenerator;
