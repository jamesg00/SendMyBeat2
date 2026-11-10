import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import * as api from "@/app/api";
import { Avatar, FollowButton, LikeButton, TopBeat, VerifiedBadge, followerCount, isVerified, knownProducer, rememberProducers, topBeatOf } from "@/app/producer";
import { loadSocial, useRequest, useSocial, useUser } from "@/app/store";
import { Button, Segmented, Sheet, Spinner, compact, safeLink } from "@/app/ui";

// A producer's Spotlight profile. On your own, click the banner or picture to change it.

const SOCIAL_LABELS = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", twitter: "X", x: "X", beatstars: "BeatStars", soundcloud: "SoundCloud", spotify: "Spotify" };

export default function Producer({ signedIn }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const stats = useRequest(() => api.producerStats(id), [id]);
  const social = useSocial();
  const user = useUser();
  const mine = !!user && user.id === id;
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const bannerInput = useRef(null);
  const avatarInput = useRef(null);

  useEffect(() => {
    if (signedIn) void loadSocial();
  }, [signedIn]);

  const p = stats.data?.profile ?? knownProducer(id);
  if (!p) {
    return (
      <main className="s-screen" style={{ alignItems: "center", paddingTop: 80 }}>
        {stats.error ? <span className="s-body">{stats.error}</span> : <Spinner />}
      </main>
    );
  }

  const patchProfile = (patch) =>
    stats.setData((cur) => {
      if (!cur) return cur;
      rememberProducers([{ ...cur.profile, ...patch }]);
      return { ...cur, profile: { ...cur.profile, ...patch } };
    });

  const changeImage = async (which, file) => {
    if (!file) return;
    setError(null);
    setBusy(which);
    try {
      patchProfile(which === "banner" ? { banner_url: (await api.uploadBanner(file)).banner_url } : { avatar_url: (await api.uploadAvatar(file)).avatar_url });
    } catch (e) {
      setError(e.message || "Could not update your picture.");
    } finally {
      setBusy(null);
    }
  };

  const st = stats.data?.stats;
  const perf = stats.data?.channel?.performance;
  const beats = ((stats.data?.channel_top_beats?.length ? stats.data.channel_top_beats : stats.data?.top_beats) ?? []).filter((b) => b.url);
  const topBeat = topBeatOf(p);
  const socials = Object.entries(p.social_links ?? {}).filter((e) => typeof e[1] === "string" && /^https?:\/\//.test(e[1]));

  return (
    <main className="s-screen" style={{ gap: 18 }}>
      <button type="button" className="s-link s-sub" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/spotlight")}>
        ‹ Spotlight
      </button>
      <div style={{ position: "relative", marginTop: -6 }}>
        {p.banner_url ? <img className="s-banner" src={p.banner_url} alt="" style={{ height: 170, borderRadius: 16, border: "1px solid var(--line-soft)" }} /> : <span className="s-banner" style={{ height: 170, borderRadius: 16, border: "1px solid var(--line-soft)" }} />}
        {mine ? (
          <>
            <button type="button" className="s-btn s-btn--sm s-btn--secondary" style={{ position: "absolute", left: 12, bottom: 12, height: 28, fontSize: 12, fontWeight: 500, background: "rgba(0,0,0,0.7)", color: "#fff" }} onClick={() => bannerInput.current?.click()}>
              {busy === "banner" ? "Uploading…" : "Edit banner"}
            </button>
            <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void changeImage("banner", e.target.files?.[0])} />
            <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void changeImage("avatar", e.target.files?.[0])} />
          </>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -54, padding: "0 12px" }}>
        <button
          type="button"
          disabled={!mine}
          onClick={() => avatarInput.current?.click()}
          aria-label={mine ? "Change profile picture" : undefined}
          style={{ all: "unset", position: "relative", display: "flex", borderRadius: "50%", border: "4px solid var(--bg)", cursor: mine ? "pointer" : "default" }}>
          <Avatar producer={p} size={76} />
          {mine ? (
            <span style={{ position: "absolute", right: -6, bottom: 0, height: 24, padding: "0 8px", borderRadius: 12, background: "var(--primary)", color: "var(--on-primary)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center" }}>
              {busy === "avatar" ? "…" : "Edit"}
            </span>
          ) : null}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
          <LikeButton producer={p} size="md" />
          {mine ? <Button title="Edit profile" variant="secondary" size="sm" onClick={() => setEditing(true)} /> : <FollowButton producer={p} />}
        </div>
      </div>

      <div className="s-stack" style={{ gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h1 className="s-display" style={{ fontSize: 22, letterSpacing: -0.2 }}>
            {p.username}
          </h1>
          {isVerified(p) ? <VerifiedBadge size={16} /> : null}
        </div>
        <span className="s-mono" style={{ fontSize: 12 }}>
          {compact.format(followerCount(social, p))} followers{p.role_tag ? ` · ${p.role_tag}` : ""}
        </span>
        {social.error ? <span className="s-error">{social.error}</span> : null}
        {error ? <span className="s-error">{error}</span> : null}
        {p.bio ? (
          <p className="s-body">{p.bio}</p>
        ) : mine ? (
          <button type="button" className="s-link s-body" style={{ alignSelf: "flex-start", color: "var(--t3)", fontWeight: 400 }} onClick={() => setEditing(true)}>
            Add a bio ›
          </button>
        ) : null}
        {socials.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingTop: 4 }}>
            {socials.map(([key, url]) => (
              <a key={key} className="s-link" style={{ fontSize: 13, fontWeight: 400 }} href={safeLink(url)} target="_blank" rel="noopener noreferrer">
                {SOCIAL_LABELS[key.toLowerCase()] ?? key} ↗
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="s-stats">
        <div>
          <small>Tier</small>
          <b>{p.spotlight_tier ?? "–"}</b>
        </div>
        <div>
          <small>Score</small>
          <b style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{p.spotlight_score ?? 0}</b>
        </div>
        <div>
          <small>Streak</small>
          <b style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{st?.current_streak ?? p.current_streak ?? 0}d</b>
        </div>
        <div>
          <small>Best</small>
          <b style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{st?.longest_streak ?? 0}d</b>
        </div>
      </div>

      {perf?.subscriber_count ? (
        <p className="s-body">
          YouTube: <span className="s-mono">{compact.format(perf.subscriber_count)}</span> subscribers · <span className="s-mono">{compact.format(perf.total_views ?? 0)}</span> views
        </p>
      ) : null}

      {topBeat ? (
        <div className="s-stack" style={{ gap: 8 }}>
          <div className="s-row-between">
            <span className="s-label">Top beat</span>
            {mine ? (
              <button type="button" className="s-link s-sub" onClick={() => setEditing(true)}>
                Change
              </button>
            ) : null}
          </div>
          <TopBeat key={topBeat.url} beat={topBeat} />
        </div>
      ) : mine ? (
        <Button title="Add your top beat" variant="secondary" size="md" onClick={() => setEditing(true)} />
      ) : null}

      {(p.tags ?? []).length > 0 ? (
        <div className="s-chips">
          {(p.tags ?? []).slice(0, 6).map((t) => (
            <span key={t} className="s-tag">
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div>
        <div className="s-label" style={{ paddingBottom: 8 }}>
          Latest uploads
        </div>
        {stats.loading ? (
          <Spinner />
        ) : beats.length === 0 ? (
          <span className="s-muted" style={{ fontSize: 13 }}>
            No YouTube channel linked yet.
          </span>
        ) : (
          beats.map((b, i) => (
            <a key={b.url ?? i} className="s-hair" style={{ padding: "10px 0" }} href={safeLink(b.url)} target="_blank" rel="noopener noreferrer">
              {b.thumbnail ? <img className="s-thumb" src={b.thumbnail} alt="" loading="lazy" /> : null}
              <span className="s-row-main">
                <span className="s-clamp2" style={{ fontSize: 14, lineHeight: "19px" }}>
                  {b.title}
                </span>
                {b.published_at ? <span className="s-mono">{new Date(b.published_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</span> : null}
              </span>
              {b.views != null ? <span className="s-mono">{compact.format(b.views)}</span> : null}
            </a>
          ))
        )}
      </div>

      {mine ? (
        <EditProfile
          open={editing}
          producer={p}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            patchProfile(next);
            setEditing(false);
          }}
        />
      ) : null}
    </main>
  );
}

const LINKS = [
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@yourchannel" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/you" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@you" },
  { key: "beatstars", label: "BeatStars", placeholder: "beatstars.com/you" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "soundcloud.com/you" },
];
const withScheme = (url) => (!url.trim() ? "" : /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

// Edit your Spotlight profile: bio, tags, links and top beat.
export function EditProfile({ open, producer, onClose, onSaved }) {
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState({});
  const [beat, setBeat] = useState(null);
  const [mode, setMode] = useState("youtube");
  const [beatUrl, setBeatUrl] = useState("");
  const [beatTitle, setBeatTitle] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const audioInput = useRef(null);

  useEffect(() => {
    if (!open) return;
    setBio(producer.bio ?? "");
    setTags((producer.tags ?? []).join(", "));
    setLinks(Object.fromEntries(LINKS.map((l) => [l.key, producer.social_links?.[l.key] ?? ""])));
    setBeat(topBeatOf(producer));
    setBeatUrl("");
    setBeatTitle("");
    setError(null);
  }, [open, producer]);

  const run = async (name, fn) => {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Could not save that.");
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run("save", async () => {
      const social_links = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, withScheme(v)]));
      const next = await api.updateMyProducer({
        bio: bio.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 6),
        social_links,
      });
      onSaved({ ...next, top_beat: beat, top_beat_url: beat?.url ?? null });
    });
  const saveLink = () => run("beat", async () => setBeat((await api.setTopBeatLink(withScheme(beatUrl), beatTitle.trim() || undefined)).top_beat));
  const uploadAudio = (file) => file && run("beat", async () => setBeat((await api.uploadTopBeatAudio(file, beatTitle.trim() || file.name.replace(/\.[^.]+$/, ""))).top_beat));
  const removeBeat = () => run("beat", async () => setBeat((await api.clearTopBeat()).top_beat));

  return (
    <Sheet open={open} onClose={onClose} wide label="Edit profile">
      <div className="s-row-between">
        <span className="s-display" style={{ fontSize: 20 }}>
          Edit profile
        </span>
        <button type="button" className="s-link s-sub" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="s-field">
        <span>Bio</span>
        <textarea className="s-input" style={{ height: 96 }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="What you make, who you've worked with" />
      </label>
      <label className="s-field">
        <span>Tags (up to 6)</span>
        <input className="s-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dark trap, pluggnb, drill" />
      </label>
      <div className="s-field">
        <span>Links</span>
        {LINKS.map((l) => (
          <input key={l.key} className="s-input" value={links[l.key] ?? ""} onChange={(e) => setLinks({ ...links, [l.key]: e.target.value })} placeholder={l.placeholder} aria-label={l.label} />
        ))}
      </div>

      <div className="s-field">
        <span>Top beat</span>
        {beat ? (
          <>
            <TopBeat key={beat.url} beat={beat} />
            <Button title={busy === "beat" ? "Removing…" : "Remove top beat"} variant="secondary" size="md" disabled={!!busy} onClick={() => void removeBeat()} />
          </>
        ) : null}
        <Segmented
          compact
          value={mode}
          onChange={setMode}
          label="Top beat source"
          options={[
            { value: "youtube", label: "YouTube video" },
            { value: "audio", label: "Audio file" },
          ]}
        />
        <input className="s-input" value={beatTitle} onChange={(e) => setBeatTitle(e.target.value)} placeholder={mode === "youtube" ? "Title (optional, uses the video title)" : "Beat title (optional)"} />
        {mode === "youtube" ? (
          <>
            <input className="s-input" value={beatUrl} onChange={(e) => setBeatUrl(e.target.value)} placeholder="youtube.com/watch?v=… or youtu.be/…" />
            <Button title={busy === "beat" ? "Saving…" : "Use this video"} variant="secondary" size="md" disabled={!!busy || !beatUrl.trim()} onClick={() => void saveLink()} />
          </>
        ) : (
          <>
            <input ref={audioInput} type="file" accept="audio/*" hidden onChange={(e) => void uploadAudio(e.target.files?.[0])} />
            <Button title={busy === "beat" ? "Uploading…" : beat?.kind === "audio" ? "Replace audio file" : "Choose audio file"} variant="secondary" size="md" disabled={!!busy} onClick={() => audioInput.current?.click()} />
          </>
        )}
      </div>

      {error ? <span className="s-error">{error}</span> : null}
      <Button title={busy === "save" ? "Saving…" : "Save profile"} disabled={!!busy} onClick={() => void save()} />
    </Sheet>
  );
}
