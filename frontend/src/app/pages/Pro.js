import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import * as api from "@/app/api";
import { VerifiedBadge } from "@/app/producer";
import { ProHero, useCopyPro, usePlan } from "@/app/pros";
import { openPaywall, useRequest, useSubscription } from "@/app/store";
import { Button, Ring, Segmented, Spinner, compact, safeLink } from "@/app/ui";

// A pro producer's page: why they blew up, how their channel works, and how close you are to their style.

export default function Pro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pro = useRequest(() => api.pro(id), [id]);
  const { plan } = usePlan();
  const copyPro = useCopyPro();
  const [tab, setTab] = useState("story");

  if (!pro.data) {
    return (
      <main className="s-screen" style={{ alignItems: "center", paddingTop: 80 }}>
        {pro.error ? <span className="s-body">{pro.error}</span> : <Spinner />}
      </main>
    );
  }
  const p = pro.data;
  const following = plan?.pro_id === p.id;
  const locked = !!p.locked;

  return (
    <main className="s-screen" style={{ gap: 22 }}>
      <button type="button" className="s-link s-sub" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/spotlight?tab=pros")}>
        ‹ Pros
      </button>
      <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid var(--line)", marginTop: -8 }}>
        <ProHero pro={p} height={380}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="s-display s-truncate" style={{ fontSize: 46, lineHeight: "50px", letterSpacing: -1.5 }}>
              {p.name}
            </h1>
            {p.verified ? <VerifiedBadge size={22} /> : null}
          </div>
          <span className="s-mono" style={{ fontSize: 12 }}>
            {[p.channel_title, p.subscribers ? `${compact.format(p.subscribers)} subscribers` : null, p.total_views ? `${compact.format(p.total_views)} views` : null].filter(Boolean).join(" · ")}
          </span>
        </ProHero>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button title={following ? "Your plan is on" : `Copy ${p.name}’s style${locked ? " · Pro" : ""}`} onClick={() => copyPro(p.id)} style={{ flex: 1, minWidth: 0 }} />
        <Button title="YouTube ↗" variant="secondary" href={safeLink(p.channel_url)} target="_blank" rel="noopener noreferrer" />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        label="Sections"
        options={[
          { value: "story", label: "Story" },
          { value: "breakdown", label: "Breakdown" },
          { value: "you", label: "You vs them" },
        ]}
      />
      {tab === "story" ? (
        <Story p={p} />
      ) : locked ? (
        <ProLock name={p.name} what={tab === "breakdown" ? "how their channel works" : "how close you are to their style"} />
      ) : tab === "breakdown" ? (
        <Breakdown p={p} />
      ) : (
        <YouVsThem p={p} />
      )}
    </main>
  );
}

// Breakdowns and You vs them are Pro; the story stays free to read.
function ProLock({ name, what }) {
  const sub = useSubscription();
  return (
    <div className="s-card" style={{ alignItems: "center", gap: 10, padding: 22, textAlign: "center" }}>
      <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
        <rect x={5} y={11} width={14} height={10} rx={2} fill="none" stroke="var(--t2)" strokeWidth={1.8} />
        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" fill="none" stroke="var(--t2)" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
      <span className="s-display" style={{ fontSize: 18 }}>
        See {what}
      </span>
      <span className="s-muted">Pro shows {name}’s title formula, upload rhythm and best days, and compares your uploads with theirs.</span>
      <Button title={sub?.trial_available ? "Try it free, then see Pro" : "See Pro"} onClick={() => openPaywall("needs_pro")} />
    </div>
  );
}

// ---- Story: why they blew up, then how it happened.
function Story({ p }) {
  const copyPro = useCopyPro();
  return (
    <>
      {p.why ? (
        <div className="s-accent-panel" style={{ gap: 8 }}>
          <span className="s-kicker">WHY THEY BLEW UP</span>
          <p className="s-display" style={{ fontSize: 21, lineHeight: "27px", letterSpacing: -0.3 }}>
            {p.why}
          </p>
        </div>
      ) : null}

      <div>
        <div className="s-label" style={{ paddingBottom: 10 }}>
          How it happened
        </div>
        {p.story.map((line, i) => {
          const last = i === p.story.length - 1;
          return (
            <div key={line} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                <span style={{ width: 12, height: 12, flex: "none", borderRadius: "50%", marginTop: 4, border: `2px solid ${last ? "var(--acc)" : "var(--line)"}`, background: last ? "var(--acc)" : "var(--bg)" }} />
                {!last ? <span style={{ flex: 1, width: 2, background: "var(--line-soft)", marginTop: 2 }} /> : null}
              </div>
              <p style={{ flex: 1, fontSize: 14.5, lineHeight: "21px", paddingBottom: last ? 0 : 16 }}>{line}</p>
            </div>
          );
        })}
      </div>

      <div>
        <div className="s-label" style={{ paddingBottom: 8 }}>
          Notable
        </div>
        {p.notable.map((n) => (
          <div key={n.text} className="s-hair" style={{ minHeight: 46 }}>
            <span className="s-mono" style={{ width: 40, fontSize: 12, fontWeight: 500, color: "var(--t3)" }}>
              {n.year || "–"}
            </span>
            <span style={{ flex: 1, fontSize: 14, lineHeight: "19px", padding: "8px 0" }}>{n.text}</span>
          </div>
        ))}
      </div>

      <div className="s-stack" style={{ gap: 8 }}>
        <span className="s-label">Their moves</span>
        <div className="s-scroll-x" style={{ gap: 8 }}>
          {p.moves.map((m, i) => (
            <button key={m.id} type="button" className="s-move" onClick={() => copyPro(p.id, [m.id])} title="Start a plan with this move">
              <span className="s-kicker">{String(i + 1).padStart(2, "0")}</span>
              <span className="s-display" style={{ fontSize: 15 }}>
                {m.title}
              </span>
              <span style={{ color: "var(--t2)", fontSize: 12.5, lineHeight: "17px" }}>{m.body}</span>
              <span className="s-kicker" style={{ marginTop: "auto" }}>
                COPY →
              </span>
            </button>
          ))}
        </div>
      </div>

      {p.latest_uploads.length ? (
        <div>
          <div className="s-label" style={{ paddingBottom: 8 }}>
            Latest uploads
          </div>
          {p.latest_uploads.slice(0, 5).map((u) => (
            <a key={u.video_id} className="s-hair" style={{ padding: "10px 0" }} href={`https://www.youtube.com/watch?v=${u.video_id}`} target="_blank" rel="noopener noreferrer">
              {u.thumbnail ? <img className="s-thumb s-thumb--lg" src={u.thumbnail} alt="" loading="lazy" /> : <span className="s-thumb s-thumb--lg" />}
              <span className="s-row-main">
                <span className="s-clamp2" style={{ fontSize: 14, lineHeight: "19px" }}>
                  {u.title}
                </span>
                <span className="s-mono" style={{ fontSize: 12 }}>
                  {u.views != null ? `${compact.format(u.views)} views` : ""}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : null}

      <div className="s-stack" style={{ gap: 6 }}>
        <span className="s-label">Sources</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {p.sources.map((src) => (
            <a key={src.url} className="s-link" href={safeLink(src.url)} target="_blank" rel="noopener noreferrer">
              {src.label} ↗
            </a>
          ))}
        </div>
        <p className="s-muted">
          {p.photo_source === "press" ? `Photo: ${p.photo_credit ?? "press photo, used with permission"}. ` : ""}
          Stats and uploads from {p.name}’s YouTube channel{p.verified ? ", confirmed by SendMyBeat" : ""}.
        </p>
      </div>

      {p.claimed_by ? (
        <Link to={`/producer/${p.claimed_by}`} className="s-card" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, color: "inherit", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
          <VerifiedBadge size={16} />
          <span style={{ flex: 1 }}>{p.name} is on SendMyBeat</span>
          <span>Profile ›</span>
        </Link>
      ) : (
        <Link to={`/profile?verify=${encodeURIComponent(p.id)}`} className="s-card" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, color: "inherit", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
          <span style={{ flex: 1 }}>Are you {p.name}? Claim this profile</span>
          <span>›</span>
        </Link>
      )}
    </>
  );
}

// ---- Breakdown: how their channel works, from their last 50 uploads.

// Split a type-beat title into the parts the formula is made of.
function anatomy(title) {
  const m = title.match(/^(.*?)\s+(type\s+beat)\b(.*)$/i);
  if (!m) return [{ text: title, kind: "rest" }];
  const parts = [];
  m[1].split(/\s+(x|X|×|&)\s+/).forEach((chunk) => {
    if (!chunk.trim()) return;
    parts.push({ text: chunk.trim(), kind: /^(x|×|&)$/i.test(chunk.trim()) ? "rest" : "artist" });
  });
  parts.push({ text: m[2], kind: "formula" });
  const tail = m[3].trim();
  const quoted = tail.match(/["“](.+?)["”]/);
  if (quoted) parts.push({ text: `"${quoted[1]}"`, kind: "name" });
  else if (tail) parts.push({ text: tail.replace(/^[-–|]\s*/, ""), kind: "rest" });
  return parts;
}

const PART = {
  artist: { background: "var(--acc-soft)", color: "var(--acc)" },
  formula: { background: "var(--card2)", color: "var(--text)" },
  name: { background: "var(--card2)", color: "var(--t2)" },
  rest: { background: "transparent", color: "var(--t3)" },
};

function Breakdown({ p }) {
  const b = p.breakdown;
  const t = p.patterns;
  if (!t?.uploads) return <p className="s-body">Their uploads haven’t loaded from YouTube yet. Check back soon.</p>;
  const example = b.breakouts[0]?.title ?? p.latest_uploads[0]?.title ?? "";
  const bars = [
    ["Artist named first", t.lead_artist_pct],
    ["Two artists paired", t.pair_pct],
    ["Beat name in quotes", t.quotes_pct],
    ["Year in the title", t.year_pct],
  ];
  const top = Math.max(1, ...b.views);
  const breakouts = new Set(b.breakout_index);
  const grid = t.heatmap ?? [];
  const most = Math.max(1, ...grid.flat());

  return (
    <>
      <div className="s-card s-panel">
        <span className="s-label">Title anatomy</span>
        {example ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {anatomy(example).map((part, i) => (
              <span key={i} className="s-part" style={PART[part.kind]}>
                {part.text}
              </span>
            ))}
          </div>
        ) : null}
        <div className="s-stack" style={{ gap: 10 }}>
          {bars.map(([label, value]) => (
            <div key={label} className="s-stack" style={{ gap: 4 }}>
              <div className="s-row-between">
                <span className="s-sub">{label}</span>
                <span className="s-mono" style={{ color: "var(--text)", fontWeight: 500 }}>
                  {value == null ? "–" : `${value}%`}
                </span>
              </div>
              <span className="s-bar" style={{ flex: "none" }}>
                <span style={{ width: `${value ?? 0}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="s-card s-panel">
        <div className="s-row-between">
          <span className="s-label">Views per upload</span>
          {b.top_share_pct != null ? (
            <span className="s-display" style={{ color: "var(--acc)", fontSize: 14 }}>
              {b.breakouts.length} uploads = {b.top_share_pct}% of views
            </span>
          ) : null}
        </div>
        <div role="img" aria-label="Views per upload; the brightest bars are their breakout uploads" style={{ height: 110, display: "flex", alignItems: "flex-end", gap: "0.3%", borderBottom: "1px solid var(--line-soft)" }}>
          {b.views.map((v, i) => (
            <span key={i} style={{ flex: 1, height: `${Math.max(3, (v / top) * 100)}%`, borderRadius: "2px 2px 0 0", background: breakouts.has(i) ? "var(--acc)" : "var(--wave)" }} />
          ))}
        </div>
        {b.breakouts.map((u) => (
          <a key={u.video_id} href={`https://www.youtube.com/watch?v=${u.video_id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 32, color: "inherit", textDecoration: "none" }}>
            <span className="s-truncate" style={{ flex: 1, fontSize: 13 }}>
              {u.title}
            </span>
            <span className="s-mono" style={{ color: "var(--text)", fontWeight: 500 }}>
              {compact.format(u.views)}
              {u.times_median ? ` · ${u.times_median}×` : ""}
            </span>
          </a>
        ))}
        <p className="s-muted">× = times their typical upload ({compact.format(b.median_views)} views). Their hits are what to study.</p>
      </div>

      <div className="s-stack" style={{ gap: 8 }}>
        <div className="s-row-between">
          <span className="s-label">When they upload</span>
          <span className="s-mono" style={{ fontSize: 12 }}>
            {t.per_week != null ? `${t.per_week} a week` : ""}
          </span>
        </div>
        <div className="s-heat">
          {grid.map((row, d) => (
            <div key={d}>
              <span className="s-mono" style={{ width: 16, fontSize: 12 }}>
                {"MTWTFSS".charAt(d)}
              </span>
              {row.map((n, i) => (
                <i key={i} style={n ? { background: "var(--acc)", opacity: 0.25 + 0.75 * (n / most) } : undefined} />
              ))}
            </div>
          ))}
        </div>
        <p className="s-muted">Night · morning · afternoon · evening, UTC.</p>
      </div>
    </>
  );
}

// ---- You vs them: your style match and the gaps worth closing.

const fmt = (id, v) => (v == null ? "–" : id === "per_week" ? `${v}/wk` : `${v}%`);
const gapText = (trait, name) =>
  ({
    per_week: `Upload as often as ${name}`,
    lead_artist: "Put the artist’s name first",
    pair: "Pair two artists in the title",
    quotes: "Put the beat name in quotes",
  })[trait] ?? trait;

function YouVsThem({ p }) {
  const res = useRequest(() => api.analyzePro(p.id), [p.id]);
  const copyPro = useCopyPro();
  if (!res.data) return res.error ? <p className="s-body">{res.error}</p> : <Spinner />;
  const r = res.data;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Ring value={(r.match ?? 0) / 100} size={112} stroke={10} label={r.match != null ? `${r.match}%` : "–"} sub="match" />
        <div className="s-row-main" style={{ gap: 4 }}>
          <span className="s-display" style={{ fontSize: 20, lineHeight: "25px", letterSpacing: -0.3 }}>
            {r.match == null
              ? "Upload through SendMyBeat to see your match"
              : r.match >= 85
                ? `You already upload like ${p.name}`
                : r.match >= 60
                  ? `You’re close to ${p.name}’s style`
                  : r.match >= 35
                    ? `You’re halfway to ${p.name}’s style`
                    : `${p.name} works very differently`}
          </span>
          <span className="s-muted">
            Your {r.you.uploads} SendMyBeat uploads vs their last {r.them.uploads}.
          </span>
        </div>
      </div>

      <div className="s-stack" style={{ gap: 16 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Legend color="var(--text)" label="You" />
          <Legend color="var(--acc)" label={p.name} />
        </div>
        {r.traits.map((t) => (
          <div key={t.id} className="s-stack" style={{ gap: 8 }}>
            <div className="s-row-between">
              <span className="s-sub">{t.label}</span>
              <span className="s-mono" style={{ color: "var(--text)", fontWeight: 500 }}>
                {fmt(t.id, t.you)} vs {fmt(t.id, t.them)}
              </span>
            </div>
            <div className="s-track" style={{ margin: "5px 8px" }}>
              <i style={{ left: `${t.them_pos * 100}%`, background: "var(--acc)" }} />
              <i style={{ left: `${t.you_pos * 100}%`, background: "var(--text)", border: "2px solid var(--bg)" }} />
            </div>
          </div>
        ))}
      </div>

      {r.gaps.length ? (
        <div className="s-card s-panel">
          <span className="s-kicker">BIGGEST GAPS</span>
          {r.gaps.map((g) => (
            <div key={g.trait} className="s-row-between" style={{ minHeight: 44 }}>
              <span style={{ flex: 1, fontSize: 14 }}>{gapText(g.trait, p.name)}</span>
              {g.move_id ? (
                <button type="button" className="s-copy-pill" onClick={() => copyPro(p.id, [g.move_id])} aria-label={`Copy: ${g.move}`}>
                  Copy
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : r.match != null ? (
        <span className="s-label">No big gaps. Keep going.</span>
      ) : null}
    </>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} className="s-muted">
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}
