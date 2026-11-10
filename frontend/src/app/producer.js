import { useEffect, useRef, useState } from "react";

import { followersOf, likesOf, toggleFollow, toggleLike, useSocial, useUser } from "@/app/store";
import { PlayPauseIcon, compact, cx, safeLink } from "@/app/ui";

// Producer parts shared by Spotlight and profile pages (mobile/src/components/producer.tsx).

// Producers Spotlight already loaded, so a profile can open at once before its stats arrive.
const known = new Map();
export const rememberProducers = (list) => list.forEach((p) => known.set(p.user_id, p));
export const knownProducer = (id) => known.get(id);

export const isVerified = (p) => p?.verification_status === "approved";

// The server fills in a generated SVG for producers without a picture.
const hasOwnPicture = (p) => !!p?.avatar_url && !p.avatar_url.startsWith("data:image/svg");

export function Avatar({ producer, size, ring }) {
  const style = { width: size, height: size, ...(ring ? { border: `2px solid ${ring}` } : null) };
  if (hasOwnPicture(producer)) return <img className="s-avatar" style={style} src={producer.avatar_url} alt={producer.username} loading="lazy" />;
  return (
    <span className="s-avatar" style={style} role="img" aria-label={`${producer?.username ?? "Producer"}, no profile picture yet`}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx={20} cy={15.5} r={7} fill="var(--t3)" />
        <path d="M6 38c1.8-7.6 7.4-11.6 14-11.6S32.2 30.4 34 38" fill="var(--t3)" />
      </svg>
    </span>
  );
}

export function VerifiedBadge({ size = 14 }) {
  return (
    <span className="s-verified" style={{ width: size, height: size, fontSize: size * 0.7 }} role="img" aria-label="Verified">
      ✓
    </span>
  );
}

/** Heart with the in-app like count. Your own profile shows the count without the button. */
export function LikeButton({ producer, size = "sm" }) {
  const social = useSocial();
  const user = useUser();
  const mine = user?.id === producer.user_id;
  const liked = social.liked.has(producer.user_id);
  const count = likesOf(social, producer);
  return (
    <button
      type="button"
      className="s-like"
      style={{ height: size === "md" ? 34 : 30 }}
      disabled={mine || !user}
      aria-pressed={liked}
      aria-label={`${liked ? "Unlike" : "Like"} ${producer.username}, ${count} likes`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleLike(producer);
      }}>
      <span>{liked ? "♥" : "♡"}</span>
      <span>{compact.format(count)}</span>
    </button>
  );
}

export function FollowButton({ producer }) {
  const social = useSocial();
  const user = useUser();
  if (!user || user.id === producer.user_id) return null;
  const following = social.following.has(producer.user_id);
  return (
    <button type="button" className={cx("s-btn s-btn--sm", following && "s-btn--secondary")} style={{ height: 34, borderRadius: 9 }} aria-pressed={following} onClick={() => void toggleFollow(producer)}>
      {following ? "Following" : "Follow"}
    </button>
  );
}

export const followerCount = (social, p) => followersOf(social, p);

const isYouTube = (url) => /(?:youtube\.com|youtu\.be)\//i.test(url);
const isAudioFile = (url) => /\.(mp3|m4a|wav|aac|ogg|flac)(\?|$)/i.test(url);

/** The producer's top beat, from the structured field or, for older profiles, the plain link. */
export function topBeatOf(p) {
  if (p?.top_beat?.url) return p.top_beat;
  const url = p?.top_beat_url?.trim();
  if (!url) return null;
  return { kind: isYouTube(url) ? "youtube" : isAudioFile(url) ? "audio" : "link", url, title: "Top beat" };
}

const clock = (sec) => {
  const t = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// YouTube top beats show their thumbnail and open YouTube; uploaded audio plays right here.
export function TopBeat({ beat }) {
  if (beat.kind === "audio" && (isAudioFile(beat.url) || beat.file_id || /\/top-beat\/audio/.test(beat.url))) {
    return <PlayableBeat url={beat.url} title={beat.title || "Top beat"} />;
  }
  return (
    <a className="s-beat" href={safeLink(beat.url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {beat.thumbnail ? (
        <img className="s-thumb" src={beat.thumbnail} alt="" loading="lazy" />
      ) : (
        <span className="s-beat-play" style={{ background: "var(--card)", color: "var(--text)", fontSize: 12, fontWeight: 700 }}>
          ↗
        </span>
      )}
      <span className="s-row-main">
        <span className="s-clamp2" style={{ fontSize: 13, fontWeight: 500 }}>
          {beat.title || "Top beat"}
        </span>
        <span className="s-hint s-truncate">{beat.kind === "youtube" ? "YouTube ↗" : beat.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
      </span>
    </a>
  );
}

function PlayableBeat({ url, title }) {
  const audio = useRef(null);
  const [state, setState] = useState({ playing: false, time: 0, duration: 0 });
  useEffect(() => {
    const el = audio.current;
    return () => el?.pause();
  }, []);
  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };
  const sync = () => {
    const el = audio.current;
    if (el) setState({ playing: !el.paused && !el.ended, time: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : 0 });
  };
  const played = state.duration > 0 ? state.time / state.duration : 0;
  return (
    <div className="s-beat">
      <audio ref={audio} src={url} preload="none" onPlay={sync} onPause={sync} onEnded={sync} onTimeUpdate={sync} onLoadedMetadata={sync} />
      <button type="button" className="s-beat-play" onClick={toggle} aria-label={state.playing ? `Pause ${title}` : `Play ${title}`}>
        <PlayPauseIcon playing={state.playing} />
      </button>
      <span className="s-row-main" style={{ gap: 5 }}>
        <span className="s-truncate" style={{ fontSize: 13, fontWeight: 500 }}>
          {title}
        </span>
        <span style={{ height: 2, background: "var(--line)", overflow: "hidden" }}>
          <span style={{ display: "block", height: 2, width: `${played * 100}%`, background: "var(--text)" }} />
        </span>
      </span>
      <span className="s-hint">{state.duration > 0 ? `${clock(state.time)} / ${clock(state.duration)}` : ""}</span>
    </div>
  );
}
