import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ExternalLink, ImageIcon, Music, Search, Upload, X, Youtube } from "lucide-react";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAuthToken, setReturnTo, takeReturnTo } from "@/lib/auth";
import { ARTISTS, FREE_TAG_PAGE, STYLES, TAG_HUB_PATH, TAG_SETS, tagSetPath, tagsFor } from "@/lib/seoModel";
import { TAG_MAX_LENGTH, YOUTUBE_TAG_LIMIT, YOUTUBE_TITLE_LIMIT, charLength, parseTags, tagListChars } from "@/lib/seoTools";
import { Field } from "@/pages/tools/toolKit";

// The free MP3 to YouTube uploader (TOOL_PAGES "upload" in lib/seoModel.js): an audio file
// plus a still image or animated GIF becomes a video on the producer's own channel. No
// visualizer, and no AI tags: the tags come from our ready-made type beat tag sets.
// Backend: GET /api/free-upload/status, POST /api/free-upload/youtube, then the job is
// polled at GET /api/youtube/upload-jobs/{id}.

const YEAR = new Date().getFullYear();
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AUDIO_ACCEPT = "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/flac,audio/ogg,.mp3,.wav,.m4a,.flac,.ogg";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const MAX_AUDIO_MB = 200;
const MAX_IMAGE_MB = 12;
const DESCRIPTION_LIMIT = 5000;
const POLL_MS = 3000;
const ACTIVE_STATUSES = ["queued", "running", "processing"];
const PRIVACY = [
  ["public", "Public"],
  ["unlisted", "Unlisted"],
  ["private", "Private"],
];

// Every tag set, artists first, for the searchable picker.
const TAG_SET_OPTIONS = [
  ...Object.entries(ARTISTS).map(([slug, a]) => ({ slug, name: a.name, kind: "artist", search: [a.name, slug, ...(a.aliases || [])].join(" ").toLowerCase() })),
  ...Object.entries(STYLES).map(([slug, s]) => ({ slug, name: s.name, kind: "style", search: [s.name, slug].join(" ").toLowerCase() })),
];

const hasExtension = (name, list) => list.some((ext) => String(name || "").toLowerCase().endsWith(ext));
// YouTube rejects < and > in titles, descriptions and tags.
const noAngles = (text) => String(text || "").replace(/[<>]/g, "");
// "my_beat-final (prod. me).mp3" -> "my beat final (prod. me)"
const titleFromFile = (name) =>
  noAngles(String(name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()).slice(0, YOUTUBE_TITLE_LIMIT);

const errorText = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
};

// A local preview URL for a picked file, freed when the file changes or the tool closes.
const useObjectUrl = (file) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return undefined;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
};

// ---- signed out: what it does, and the way in

const SignedOut = ({ page, returnPath }) => {
  const [opening, setOpening] = useState(false);
  const continueWithGoogle = async () => {
    setOpening(true);
    setReturnTo(returnPath);
    try {
      const response = await axios.get(`${API}/auth/google/url`);
      window.location.assign(response.data.auth_url);
    } catch (error) {
      toast.error(errorText(error, "Couldn't open Google sign-in"));
      setOpening(false);
    }
  };

  return (
    <section id="tool" className="ftg-result mup">
      <div className="ftg-result-head">
        <h2 className="policy-title">Upload your MP3 in four steps</h2>
        <span className="smb-mono smb-t3 text-xs">3 free uploads a day</span>
      </div>
      <ol className="mup-steps">
        {(page.steps || []).map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ol>
      <div className="mup-actions">
        <Button type="button" className="smb-btn smb-btn--pri smb-btn--lg" onClick={continueWithGoogle} disabled={opening}>
          <Youtube className="h-4 w-4" aria-hidden="true" />
          {opening ? "Opening Google..." : "Continue with Google"}
        </Button>
        <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg" onClick={() => setReturnTo(returnPath)}>
          Sign up with a username
        </Link>
      </div>
      <p className="ftl-hint">
        Google sign-in creates your free SendMyBeat account and connects the YouTube channel your video goes to, in one step. No card
        needed. Already have an account?{" "}
        <Link to="/?login=1" onClick={() => setReturnTo(returnPath)}>Log in</Link>
        . New to SendMyBeat? <Link to="/">See what it does</Link>.
      </p>
    </section>
  );
};

// ---- signed in, but no YouTube channel connected yet

const ConnectYouTube = ({ returnPath }) => {
  const [opening, setOpening] = useState(false);
  const connect = async () => {
    setOpening(true);
    setReturnTo(returnPath);
    try {
      const response = await axios.get(`${API}/youtube/auth-url`);
      window.location.assign(response.data.auth_url);
    } catch (error) {
      toast.error(errorText(error, "Couldn't open YouTube sign-in"));
      setOpening(false);
    }
  };
  return (
    <section id="tool" className="ftg-result mup">
      <div className="ftg-result-head">
        <h2 className="policy-title">Connect your YouTube channel</h2>
      </div>
      <p className="mup-text">
        You&apos;re signed in. To upload, connect the YouTube channel the video should go to. Google asks you to allow uploads to that
        channel; you can disconnect it any time from your dashboard.
      </p>
      <div className="mup-actions">
        <Button type="button" className="smb-btn smb-btn--pri smb-btn--lg" onClick={connect} disabled={opening}>
          <Youtube className="h-4 w-4" aria-hidden="true" />
          {opening ? "Opening Google..." : "Connect YouTube"}
        </Button>
      </div>
    </section>
  );
};

// ---- the tag set picker: search 150 artists and 21 styles

const TagSetPicker = ({ value, onPick }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    const starts = TAG_SET_OPTIONS.filter((o) => o.name.toLowerCase().startsWith(q));
    const rest = TAG_SET_OPTIONS.filter((o) => !o.name.toLowerCase().startsWith(q) && o.search.includes(q));
    return [...starts, ...rest].slice(0, 8);
  }, [q]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (slug) => {
    onPick(slug);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="mup-picker" ref={boxRef}>
      <div className="mup-search">
        <Search className="h-4 w-4" aria-hidden="true" />
        <Input
          id="mup-tagset"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) pick(matches[0].slug);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search an artist or style, e.g. Drake or dark trap"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="mup-tagset-list"
          aria-autocomplete="list"
        />
      </div>
      {open && q ? (
        <ul id="mup-tagset-list" className="mup-options" role="listbox">
          {matches.length ? (
            matches.map((o) => (
              <li key={o.slug} role="option" aria-selected={o.slug === value}>
                <button type="button" onClick={() => pick(o.slug)}>
                  <span>{o.name}</span>
                  <span className="smb-mono smb-t3">{o.kind}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="mup-empty">No tag set for that yet. Add your own tags below.</li>
          )}
        </ul>
      ) : null}
      <p className="mup-quick">
        <span className="smb-t3">Popular:</span>
        {FREE_TAG_PAGE.featured.map((slug) => (
          <button key={slug} type="button" className={slug === value ? "is-on" : ""} onClick={() => pick(slug)}>
            {TAG_SETS[slug].name}
          </button>
        ))}
      </p>
    </div>
  );
};

// ---- the upload form, progress and result

const UploadForm = ({ status, refreshStatus }) => {
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileId, setAudioFileId] = useState("");
  const [audioProgress, setAudioProgress] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageFileId, setImageFileId] = useState("");
  const [imageProgress, setImageProgress] = useState(null);
  const [title, setTitle] = useState("");
  const [autoTitle, setAutoTitle] = useState("");
  const [tagSet, setTagSet] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null);
  const [leftToday, setLeftToday] = useState(status.left_today);
  const audioInput = useRef(null);
  const imageInput = useRef(null);
  const audioUrl = useObjectUrl(audioFile);
  const imageUrl = useObjectUrl(imageFile);

  useEffect(() => setLeftToday(status.left_today), [status.left_today]);

  const tagChars = tagListChars(tags);
  const tagsOver = tagChars > YOUTUBE_TAG_LIMIT;
  const tagPct = Math.min(100, (tagChars / YOUTUBE_TAG_LIMIT) * 100);
  const descLength = charLength(description);
  const active = Boolean(job && ACTIVE_STATUSES.includes(job.status));
  const outOfUploads = Number(leftToday) <= 0;
  const blocked = outOfUploads || Boolean(status.slots_full);
  const filesBusy = audioProgress !== null || imageProgress !== null;
  const canUpload =
    !blocked && !filesBusy && !submitting && !active && audioFileId && imageFileId && title.trim() && !tagsOver && descLength <= DESCRIPTION_LIMIT;

  const pickAudio = async (file) => {
    if (!file) return;
    if (!hasExtension(file.name, AUDIO_EXTENSIONS)) {
      toast.error("Use an MP3, WAV, M4A, FLAC or OGG file.");
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      toast.error(`That file is over ${MAX_AUDIO_MB} MB.`);
      return;
    }
    setAudioFile(file);
    setAudioFileId("");
    const fromName = titleFromFile(file.name);
    if (!title.trim() || title === autoTitle) setTitle(fromName);
    setAutoTitle(fromName);
    setAudioProgress(0);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await axios.post(`${API}/upload/audio`, form, {
        onUploadProgress: (p) => p.total && setAudioProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setAudioFileId(response.data.file_id);
    } catch (error) {
      setAudioFile(null);
      toast.error(errorText(error, "Couldn't upload the audio. Try again."));
    } finally {
      setAudioProgress(null);
    }
  };

  const pickImage = async (file) => {
    if (!file) return;
    const type = String(file.type || "").toLowerCase();
    if (!hasExtension(file.name, IMAGE_EXTENSIONS) || (type && !IMAGE_MIME_TYPES.includes(type))) {
      toast.error("Use a JPG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`That image is over ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setImageFile(file);
    setImageFileId("");
    setImageProgress(0);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await axios.post(`${API}/upload/image`, form, {
        onUploadProgress: (p) => p.total && setImageProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setImageFileId(response.data.file_id);
    } catch (error) {
      setImageFile(null);
      toast.error(errorText(error, "Couldn't upload the image. Try again."));
    } finally {
      setImageProgress(null);
    }
  };

  const pickTagSet = (slug) => {
    setTagSet(slug);
    setTags(tagsFor(slug, YEAR));
  };

  const addTags = (text) => {
    const incoming = parseTags(text).map((t) => t.slice(0, TAG_MAX_LENGTH));
    if (!incoming.length) return;
    setTags((current) => {
      const seen = new Set(current.map((t) => t.toLowerCase()));
      const next = [...current];
      incoming.forEach((t) => {
        if (!seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          next.push(t);
        }
      });
      return next;
    });
    setTagInput("");
  };

  const removeTag = (tag) => setTags((current) => current.filter((t) => t !== tag));

  const submit = async (event) => {
    event.preventDefault();
    if (!canUpload) return;
    setSubmitting(true);
    const form = new FormData();
    form.append("title", title.trim());
    form.append("description", description);
    form.append("tags", JSON.stringify(tags));
    if (tagSet) form.append("tag_set", tagSet);
    form.append("privacy_status", privacy);
    form.append("audio_file_id", audioFileId);
    form.append("image_file_id", imageFileId);
    try {
      const response = await axios.post(`${API}/free-upload/youtube`, form);
      const data = response.data || {};
      setJob({ status: "queued", progress: 0, ...(data.job || {}), id: data.job?.id || data.job_id });
      if (typeof data.left_today === "number") setLeftToday(data.left_today);
      toast.success("Upload started");
    } catch (error) {
      toast.error(errorText(error, "Couldn't start the upload. Try again."));
      if (error?.response?.status === 429) refreshStatus();
    } finally {
      setSubmitting(false);
    }
  };

  // Follow the job until it's done.
  const jobId = job?.id || job?.job_id;
  useEffect(() => {
    if (!jobId || !active) return undefined;
    let failures = 0;
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await axios.get(`${API}/youtube/upload-jobs/${jobId}`);
        const next = response?.data?.job;
        if (!next) return;
        failures = 0;
        setJob(next);
        if (next.status === "succeeded") toast.success("Your video is on YouTube");
        if (next.status === "failed" || next.status === "cancelled") refreshStatus();
      } catch (error) {
        failures += 1;
        const code = error?.response?.status;
        if (code === 401 || code === 403 || code === 404 || failures >= 4) {
          setJob((current) => ({ ...current, status: "failed", error: "Lost track of the upload. Check YouTube Studio to see if it arrived." }));
        }
      } finally {
        busy = false;
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [jobId, active, refreshStatus]);

  const startOver = () => {
    setJob(null);
    setAudioFile(null);
    setAudioFileId("");
    setImageFile(null);
    setImageFileId("");
    setTitle("");
    setAutoTitle("");
    if (audioInput.current) audioInput.current.value = "";
    if (imageInput.current) imageInput.current.value = "";
    refreshStatus();
  };

  const isGif = imageFile && (String(imageFile.type).toLowerCase() === "image/gif" || hasExtension(imageFile.name, [".gif"]));

  if (job && (active || job.status === "succeeded" || job.status === "failed" || job.status === "cancelled")) {
    const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
    const videoUrl = job.result?.video_url;
    return (
      <section id="tool" className="ftg-result mup" aria-live="polite">
        {active ? (
          <>
            <div className="ftg-result-head">
              <h2 className="policy-title">Making your video</h2>
              <span className="smb-mono smb-t3 text-xs">{progress}%</span>
            </div>
            <span className="smb-bar">
              <span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${Math.max(progress, 3)}%` }} />
            </span>
            <p className="ftl-hint">
              {job.message || (job.status === "queued" ? "Waiting for a free spot..." : "Rendering and uploading...")} You can keep this
              page open; it updates by itself.
            </p>
          </>
        ) : job.status === "succeeded" ? (
          <>
            <div className="ftg-result-head">
              <h2 className="policy-title">Your video is on YouTube</h2>
            </div>
            {videoUrl ? (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="smb-btn smb-btn--pri smb-btn--lg mup-link">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open it on YouTube
              </a>
            ) : null}
            <p className="ftl-hint">
              YouTube can take a few minutes to finish processing before the video plays in HD. {Math.max(0, Number(leftToday) || 0)} free
              upload{Number(leftToday) === 1 ? "" : "s"} left today.
            </p>
            <div className="mup-upsell">
              <h3 className="policy-title">Want a visualizer and AI-scored tags next time?</h3>
              <p>
                SendMyBeat&apos;s Upload Studio turns your beat into a video with a layout and visualizer, and the tag generator scores
                every tag on search demand and competition. Plus and Pro also drop the watermark.
              </p>
              <div className="mup-actions">
                <Link to="/" className="smb-btn smb-btn--pri">See what SendMyBeat does</Link>
                <Link to="/dashboard" className="smb-btn smb-btn--sec">Open my dashboard</Link>
              </div>
            </div>
            <Button type="button" className="smb-btn smb-btn--sec" onClick={startOver}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload another
            </Button>
          </>
        ) : (
          <>
            <div className="ftg-result-head">
              <h2 className="policy-title">The upload didn&apos;t go through</h2>
            </div>
            <p className="mup-text smb-warn">{job.error || job.message || "Something went wrong while making the video."}</p>
            <p className="ftl-hint">A failed upload doesn&apos;t count toward your free uploads for today.</p>
            <div className="mup-actions">
              <Button type="button" className="smb-btn smb-btn--pri" onClick={() => setJob(null)}>Try again</Button>
              <Button type="button" className="smb-btn smb-btn--sec" onClick={startOver}>Start over</Button>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <form id="tool" className="ftg-form ftl-form mup" onSubmit={submit}>
      <div className="mup-status">
        <span className={outOfUploads ? "smb-pill smb-pill--warn" : "smb-pill smb-pill--ok"}>
          {Math.max(0, Number(leftToday) || 0)} of {status.daily_limit} free uploads left today
        </span>
        <span className="ftl-hint">
          {status.watermark ? "Free uploads carry a small SendMyBeat watermark. Plus and Pro remove it." : "No watermark on your plan."}
        </span>
      </div>
      {status.slots_full ? (
        <p className="mup-text smb-warn">Today&apos;s free upload spots are all taken across SendMyBeat. They open again tomorrow (Pacific time).</p>
      ) : outOfUploads ? (
        <p className="mup-text smb-warn">
          You&apos;ve used today&apos;s free uploads. They reset at midnight Pacific time, or <Link to="/">see the plans</Link> for more uploads.
        </p>
      ) : null}

      <div className="ftl-grid">
        <Field id="mup-audio" label="Audio (MP3, WAV, M4A, FLAC or OGG)">
          <label className={`mup-drop ${audioFile ? "is-set" : ""}`} htmlFor="mup-audio">
            <Music className="h-5 w-5" aria-hidden="true" />
            <span className="mup-drop-text">
              {audioFile ? audioFile.name : "Choose your beat"}
              <small>
                {audioProgress !== null ? `Uploading ${audioProgress}%` : audioFileId ? "Ready. Tap to change" : `Up to ${MAX_AUDIO_MB} MB`}
              </small>
            </span>
          </label>
          <input
            ref={audioInput}
            id="mup-audio"
            type="file"
            accept={AUDIO_ACCEPT}
            className="sr-only"
            disabled={audioProgress !== null}
            onChange={(e) => pickAudio(e.target.files?.[0])}
          />
          {audioUrl ? <audio className="mup-audio" src={audioUrl} controls preload="metadata" /> : null}
        </Field>

        <Field id="mup-image" label="Picture (JPG, PNG, WEBP or animated GIF)">
          <label className={`mup-drop ${imageFile ? "is-set" : ""}`} htmlFor="mup-image">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
            <span className="mup-drop-text">
              {imageFile ? imageFile.name : "Choose a cover or GIF"}
              <small>
                {imageProgress !== null ? `Uploading ${imageProgress}%` : imageFileId ? "Ready. Tap to change" : `Up to ${MAX_IMAGE_MB} MB`}
              </small>
            </span>
          </label>
          <input
            ref={imageInput}
            id="mup-image"
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            disabled={imageProgress !== null}
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          {imageUrl ? (
            <figure className="mup-preview">
              <img src={imageUrl} alt="Your video's picture" />
              <figcaption className="ftl-hint">{isGif ? "The GIF loops for the whole track." : "Shown in a 16:9 frame on YouTube."}</figcaption>
            </figure>
          ) : null}
        </Field>

        <Field id="mup-title" label="Title" wide hint={`${charLength(title)} of ${YOUTUBE_TITLE_LIMIT} characters`}>
          <Input
            id="mup-title"
            value={title}
            maxLength={YOUTUBE_TITLE_LIMIT}
            onChange={(e) => setTitle(noAngles(e.target.value))}
            placeholder={`e.g. Drake Type Beat ${YEAR} - "Midnight"`}
            required
          />
        </Field>

        <Field id="mup-tagset" label="Tags: start from a type beat tag set" wide>
          <TagSetPicker value={tagSet} onPick={pickTagSet} />
        </Field>

        <div className="ftl-field ftl-field--wide">
          {tagSet ? (
            <p className="ftl-hint">
              From the <Link to={tagSetPath(tagSet)}>{TAG_SETS[tagSet].name} tag set</Link>. Remove what doesn&apos;t fit your beat and add
              your own. Picking another set replaces these.
            </p>
          ) : (
            <p className="ftl-hint">
              Pick a set above, or type your own tags. Browse every set on the <Link to={TAG_HUB_PATH}>type beat tags</Link> page.
            </p>
          )}
          {tags.length ? (
            <ul className="ftg-tags mup-chips">
              {tags.map((tag) => (
                <li key={tag}>
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mup-addtag">
            <Input
              id="mup-addtag"
              aria-label="Add a tag"
              value={tagInput}
              onChange={(e) => {
                const v = e.target.value;
                if (v.includes(",")) addTags(v);
                else setTagInput(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTags(tagInput);
                }
              }}
              placeholder="Add a tag and press Enter"
            />
            <Button type="button" className="smb-btn smb-btn--sec" onClick={() => addTags(tagInput)} disabled={!tagInput.trim()}>
              Add
            </Button>
          </div>
          <div className="smb-meter">
            <div className="smb-meter-row">
              <span className={tagsOver ? "smb-warn" : "smb-meter-label"}>
                {tagsOver ? "Over YouTube's tag limit. Remove a few tags." : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
              </span>
              <span className={`smb-meter-value ${tagsOver ? "smb-warn" : ""}`}>
                {tagChars} of {YOUTUBE_TAG_LIMIT} characters
              </span>
            </div>
            <span className="smb-bar">
              <span className={`smb-bar-fill ${tagsOver ? "smb-bar-fill--warn" : ""}`} style={{ width: `${tagPct}%` }} />
            </span>
          </div>
          <p className="ftl-hint">YouTube counts commas, and two quote marks for every tag with a space in it.</p>
        </div>

        <Field
          id="mup-description"
          label="Description"
          wide
          hint={`${descLength} of ${DESCRIPTION_LIMIT} characters. YouTube doesn't allow < or >, so they're left out.`}
        >
          <Textarea
            id="mup-description"
            value={description}
            onChange={(e) => setDescription(noAngles(e.target.value))}
            placeholder={"Purchase / download link\nBPM and key\nContact\n#typebeat"}
            rows={6}
          />
        </Field>

        <Field id="mup-privacy" label="Who can see it">
          <Select value={privacy} onValueChange={setPrivacy}>
            <SelectTrigger id="mup-privacy" className="mup-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIVACY.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Button type="submit" className="smb-btn smb-btn--pri smb-btn--lg mup-submit" disabled={!canUpload}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {submitting ? "Starting..." : "Upload to YouTube"}
      </Button>
      {!blocked && !canUpload && !submitting ? (
        <p className="ftl-hint">
          {filesBusy
            ? "Wait for your files to finish uploading."
            : !audioFileId || !imageFileId
              ? "Add your audio and a picture to upload."
              : !title.trim()
                ? "Add a title to upload."
                : tagsOver
                  ? "Trim your tags to fit YouTube's limit."
                  : ""}
        </p>
      ) : null}
    </form>
  );
};

// ---- the tool: picks a state from the sign-in and the server's status

const Mp3UploadTool = ({ page }) => {
  const { pathname } = useLocation();
  const returnPath = pathname.replace(/\/+$/, "") || "/upload-mp3-to-youtube";
  const [signedIn] = useState(() => Boolean(getAuthToken()));
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");

  const refreshStatus = useCallback(async () => {
    // If the saved sign-in has expired, the app sends you to the homepage to sign in again;
    // remember this page so you come back here. Forgotten again once the check succeeds.
    setReturnTo(returnPath);
    try {
      const response = await axios.get(`${API}/free-upload/status`);
      takeReturnTo();
      setStatus(response.data);
      setStatusError("");
    } catch (error) {
      const fallback = "The free uploader isn't available right now. Try again in a few minutes.";
      setStatusError(error?.response?.status === 404 ? fallback : errorText(error, fallback));
    }
  }, [returnPath]);

  useEffect(() => {
    if (signedIn) refreshStatus();
  }, [signedIn, refreshStatus]);

  if (!signedIn) return <SignedOut page={page} returnPath={returnPath} />;
  if (!status) {
    return (
      <section id="tool" className="ftg-result mup" aria-live="polite">
        {statusError ? (
          <>
            <p className="mup-text smb-warn">{statusError}</p>
            <div className="mup-actions">
              <Button type="button" className="smb-btn smb-btn--sec" onClick={refreshStatus}>Try again</Button>
            </div>
          </>
        ) : (
          <p className="ftl-hint">Checking your account...</p>
        )}
      </section>
    );
  }
  if (!status.youtube_connected) return <ConnectYouTube returnPath={returnPath} />;
  return <UploadForm status={status} refreshStatus={refreshStatus} />;
};

export default Mp3UploadTool;
