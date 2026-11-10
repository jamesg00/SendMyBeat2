import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import { ProHero, ProPaywall } from "@/components/pros/ProsGallery";
import { compactNumber, fetchPro, fetchStyleMatch, plansHref, useLoad, useProAccess, useStylePlan } from "@/components/pros/prosData";

// A pro producer's page: why they blew up, how their channel works, and how close you are to their
// style (the app's pro/[id] screen).

const safeLink = (url) => (url && /^https?:\/\/\S+$/i.test(String(url).trim()) ? String(url).trim() : undefined);
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

const SECTIONS = [
  { id: "story", label: "Story" },
  { id: "breakdown", label: "Breakdown" },
  { id: "you", label: "You vs them" },
];

const ProPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pro = useLoad(() => fetchPro(id), [id]);
  const { plan } = useStylePlan();
  const { status } = useProAccess();
  const [section, setSection] = useState("story");

  const handleShellSelect = (tab) => {
    if (tab === "spotlight") navigate("/spotlight?view=pros");
    else navigate(`/dashboard?tab=${tab}`);
  };

  const p = pro.data;
  const locked = !!p?.locked;
  const following = p && plan?.pro_id === p.id;
  const copy = (moves) => {
    if (locked) navigate(plansHref("pro"));
    else navigate(`/pros/${p.id}/plan${moves?.length ? `?moves=${moves.join(",")}` : ""}`);
  };

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <AppShell active="spotlight" onSelect={handleShellSelect} title={p?.name || "Pros"} crumb="Spotlight · Pros" onAdmin={(path) => navigate(path)}>
        <div className="space-y-6">
          <Link to="/spotlight?view=pros" className="inline-flex items-center gap-2 smb-t2 text-sm">
            <ArrowLeft className="h-4 w-4" /> All pros
          </Link>

          {!p ? (
            pro.error ? <p className="smb-danger text-sm">{pro.error}</p> : <p className="smb-t3 text-sm">Loading…</p>
          ) : locked ? (
            // Without Pro: who they are and why they blew up, then the way in.
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
              <div className="pro-card pro-card--hero">
                <ProHero pro={p} tall>
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="pro-hero-name truncate">{p.name}</h2>
                    {p.verified ? <BadgeCheck className="h-6 w-6 flex-shrink-0" aria-label="Verified channel" /> : null}
                  </div>
                </ProHero>
              </div>
              <div className="space-y-4">
                {p.why ? (
                  <section className="pro-quote">
                    <p className="smb-eyebrow smb-acc">Why they blew up</p>
                    <p className="pro-quote-text">{p.why}</p>
                  </section>
                ) : null}
                <ProPaywall status={status} title={`See how ${p.name} did it`} lead={`Pro opens ${p.name}'s full story, their channel breakdown, and a plan to copy their moves.`} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
                <div className="pro-card pro-card--hero">
                  <ProHero pro={p} tall>
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="pro-hero-name truncate">{p.name}</h2>
                      {p.verified ? <BadgeCheck className="h-6 w-6 flex-shrink-0" aria-label="Verified channel" /> : null}
                    </div>
                    <p className="smb-mono text-xs smb-t2">
                      {[p.channel_title, p.subscribers ? `${compactNumber.format(p.subscribers)} subscribers` : null, p.total_views ? `${compactNumber.format(p.total_views)} views` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </ProHero>
                </div>

                <div className="space-y-4">
                  {p.why ? (
                    <section className="pro-quote">
                      <p className="smb-eyebrow smb-acc">Why they blew up</p>
                      <p className="pro-quote-text">{p.why}</p>
                    </section>
                  ) : null}
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Subscribers" value={p.subscribers ? compactNumber.format(p.subscribers) : "–"} />
                    <Stat label="Channel views" value={p.total_views ? compactNumber.format(p.total_views) : "–"} />
                    <Stat label="Your match" value={p.match != null ? `${p.match}%` : "–"} accent />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.sound || []).map((s) => (
                      <span key={s} className="smb-pill">{s}</span>
                    ))}
                  </div>
                  <div className="smb-row-2">
                    <Button onClick={() => copy()} className="smb-btn smb-btn--pri">
                      {locked ? <Lock className="h-4 w-4" /> : null}
                      {following ? "Your plan is on" : `Copy ${p.name}'s style`}
                    </Button>
                    <Button asChild className="smb-btn smb-btn--sec">
                      <a href={safeLink(p.channel_url)} target="_blank" rel="noopener noreferrer">
                        YouTube <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pro-seg" role="tablist" aria-label="Sections">
                {SECTIONS.map((s) => (
                  <button key={s.id} type="button" role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)} className={section === s.id ? "is-active" : ""}>
                    {s.label}
                    {s.id !== "story" && locked ? <Lock className="h-3 w-3" /> : null}
                  </button>
                ))}
              </div>

              {section === "story" ? (
                <Story p={p} onCopy={copy} />
              ) : locked ? (
                <ProLock name={p.name} what={section === "breakdown" ? "how their channel works" : "how close you are to their style"} />
              ) : section === "breakdown" ? (
                <Breakdown p={p} />
              ) : (
                <YouVsThem p={p} onCopy={copy} />
              )}
            </>
          )}
        </div>
      </AppShell>
    </div>
  );
};

const Stat = ({ label, value, accent }) => (
  <div className="smb-card pro-stat">
    <span className="smb-eyebrow">{label}</span>
    <b className={accent ? "smb-acc" : ""}>{value}</b>
  </div>
);

// Breakdowns and You vs them are Pro; the story stays free to read.
const ProLock = ({ name, what }) => (
  <section className="smb-card text-center justify-items-center py-8">
    <Lock className="h-6 w-6 smb-t2" aria-hidden="true" />
    <h3 className="text-lg font-semibold">See {what}</h3>
    <p className="smb-t2 text-sm max-w-md">
      Pro shows {name}'s title formula, upload rhythm and best days, and compares your uploads with theirs.
    </p>
    <Button asChild className="smb-btn smb-btn--pri">
      <a href={plansHref("pro")}>See Pro</a>
    </Button>
  </section>
);

// ---- Story: why they blew up, then how it happened.
const Story = ({ p, onCopy }) => (
  <div className="grid gap-6 lg:grid-cols-2 items-start">
    <div className="space-y-6">
      <section className="smb-card">
        <h3 className="smb-card-title">How it happened</h3>
        <ol className="pro-timeline">
          {p.story.map((line, i) => (
            <li key={line} className={i === p.story.length - 1 ? "is-last" : ""}>
              {line}
            </li>
          ))}
        </ol>
      </section>

      {p.notable?.length ? (
        <section className="smb-card">
          <h3 className="smb-card-title">Notable</h3>
          <div className="pro-rows">
            {p.notable.map((n) => (
              <div key={n.text} className="pro-row">
                <span className="smb-mono smb-t3 w-12 flex-shrink-0">{n.year || "–"}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="smb-card">
        <h3 className="smb-card-title">Sources</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {p.sources.map((src) => (
            <a key={src.url} href={safeLink(src.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              {src.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
        <p className="smb-t3 text-xs">
          {p.photo_source === "press" ? `Photo: ${p.photo_credit || "press photo, used with permission"}. ` : ""}
          Stats and uploads from {p.name}'s YouTube channel{p.verified ? ", confirmed by SendMyBeat" : ""}.
        </p>
        {p.claimed_by ? (
          <p className="text-sm">
            <BadgeCheck className="inline h-4 w-4 mr-1" />
            {p.name} is on SendMyBeat. <Link to="/spotlight" className="underline">See their Spotlight profile</Link>
          </p>
        ) : (
          <p className="smb-t2 text-sm">
            Are you {p.name}? <Link to="/spotlight" className="underline">Request verification from your Spotlight profile</Link> to claim this page.
          </p>
        )}
      </section>
    </div>

    <div className="space-y-6">
      <section className="smb-card">
        <div className="smb-card-head">
          <h3 className="smb-card-title">Their moves</h3>
          <span className="smb-mono smb-t3 text-xs">click one to start a plan with it</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {p.moves.map((m, i) => (
            <button key={m.id} type="button" className="pro-move" onClick={() => onCopy([m.id])}>
              <span className="smb-eyebrow smb-acc">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-semibold">{m.title}</span>
              <span className="smb-t2 text-sm">{m.body}</span>
              <span className="smb-eyebrow smb-acc mt-auto">Copy →</span>
            </button>
          ))}
        </div>
      </section>

      {p.latest_uploads?.length ? (
        <section className="smb-card">
          <h3 className="smb-card-title">Latest uploads</h3>
          <div className="pro-rows">
            {p.latest_uploads.slice(0, 5).map((u) => (
              <a key={u.video_id} href={watchUrl(u.video_id)} target="_blank" rel="noopener noreferrer" className="pro-row pro-row--link">
                {u.thumbnail ? <img src={u.thumbnail} alt="" className="pro-thumb" loading="lazy" /> : <span className="pro-thumb" />}
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 text-sm">{u.title}</span>
                  <span className="smb-mono smb-t3 text-xs">{u.views != null ? `${compactNumber.format(u.views)} views` : ""}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  </div>
);

// ---- Breakdown: how their channel works, from their last 50 uploads.

// Split a type-beat title into the parts the formula is made of.
const anatomy = (title) => {
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
};

const Breakdown = ({ p }) => {
  const b = p.breakdown;
  const t = p.patterns;
  if (!t?.uploads) return <p className="smb-t2">Their uploads haven't loaded from YouTube yet. Check back soon.</p>;
  const example = b.breakouts[0]?.title || p.latest_uploads?.[0]?.title || "";
  const bars = [
    ["Artist named first", t.lead_artist_pct],
    ["Two artists paired", t.pair_pct],
    ["Beat name in quotes", t.quotes_pct],
    ["Year in the title", t.year_pct],
  ];
  const top = Math.max(1, ...b.views);
  const breakouts = new Set(b.breakout_index);
  const grid = t.heatmap || [];
  const most = Math.max(1, ...grid.flat());

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <section className="smb-card">
        <h3 className="smb-card-title">Title anatomy</h3>
        {example ? (
          <div className="flex flex-wrap gap-1">
            {anatomy(example).map((part, i) => (
              <span key={i} className={`pro-part pro-part--${part.kind}`}>{part.text}</span>
            ))}
          </div>
        ) : null}
        <div className="space-y-3">
          {bars.map(([label, value]) => (
            <div key={label} className="smb-meter">
              <div className="smb-meter-row">
                <span className="smb-meter-label">{label}</span>
                <span className="smb-meter-value">{value == null ? "–" : `${value}%`}</span>
              </div>
              <span className="smb-bar">
                <span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${value || 0}%` }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="smb-card">
        <div className="smb-card-head">
          <h3 className="smb-card-title">Views per upload</h3>
          {b.top_share_pct != null ? (
            <span className="smb-acc text-sm font-semibold">
              {b.breakouts.length} uploads = {b.top_share_pct}% of views
            </span>
          ) : null}
        </div>
        <div className="pro-views" role="img" aria-label="Views per upload; the bright bars are their breakout uploads">
          {b.views.map((v, i) => (
            <span key={i} className={breakouts.has(i) ? "is-breakout" : ""} style={{ height: `${Math.max(3, (v / top) * 100)}%` }} />
          ))}
        </div>
        <div className="pro-rows">
          {b.breakouts.map((u) => (
            <a key={u.video_id} href={watchUrl(u.video_id)} target="_blank" rel="noopener noreferrer" className="pro-row pro-row--link">
              <span className="truncate flex-1 text-sm">{u.title}</span>
              <span className="smb-mono text-xs">
                {compactNumber.format(u.views)}
                {u.times_median ? ` · ${u.times_median}×` : ""}
              </span>
            </a>
          ))}
        </div>
        <p className="smb-t3 text-xs">× = times their typical upload ({compactNumber.format(b.median_views)} views). Their hits are what to study.</p>
      </section>

      <section className="smb-card lg:col-span-2">
        <div className="smb-card-head">
          <h3 className="smb-card-title">When they upload</h3>
          <span className="smb-mono smb-t3 text-xs">{t.per_week != null ? `${t.per_week} a week` : ""}</span>
        </div>
        <div className="pro-heat">
          <div className="pro-heat-row pro-heat-head">
            <span />
            {["Night", "Morning", "Afternoon", "Evening"].map((h) => (
              <span key={h} className="smb-mono smb-t3 text-xs">{h}</span>
            ))}
          </div>
          {grid.map((row, d) => (
            <div key={d} className="pro-heat-row">
              <span className="smb-mono smb-t3 text-xs">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]}</span>
              {row.map((n, i) => (
                <i key={i} title={`${n} uploads`} style={n ? { background: "var(--c-acc)", opacity: 0.25 + 0.75 * (n / most) } : undefined} />
              ))}
            </div>
          ))}
        </div>
        <p className="smb-t3 text-xs">Times are UTC.</p>
      </section>
    </div>
  );
};

// ---- You vs them: your style match and the gaps worth closing.
const fmt = (id, v) => (v == null ? "–" : id === "per_week" ? `${v}/wk` : `${v}%`);
const gapText = (trait, name) =>
  ({
    per_week: `Upload as often as ${name}`,
    lead_artist: "Put the artist's name first",
    pair: "Pair two artists in the title",
    quotes: "Put the beat name in quotes",
  })[trait] || trait;

const YouVsThem = ({ p, onCopy }) => {
  const res = useLoad(() => fetchStyleMatch(p.id), [p.id]);
  if (!res.data) return res.error ? <p className="smb-t2">{res.error}</p> : <p className="smb-t3 text-sm">Comparing your uploads…</p>;
  const r = res.data;
  const verdict =
    r.match == null
      ? "Upload through SendMyBeat to see your match"
      : r.match >= 85
        ? `You already upload like ${p.name}`
        : r.match >= 60
          ? `You're close to ${p.name}'s style`
          : r.match >= 35
            ? `You're halfway to ${p.name}'s style`
            : `${p.name} works very differently`;

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <section className="smb-card">
        <div className="flex items-center gap-5">
          <span className="pro-big-match">
            <b>{r.match != null ? `${r.match}%` : "–"}</b>
            <small>match</small>
          </span>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">{verdict}</h3>
            <p className="smb-t3 text-sm">
              Your {r.you.uploads} SendMyBeat uploads vs their last {r.them.uploads}.
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-xs smb-t2">
          <span className="inline-flex items-center gap-2"><i className="pro-dot pro-dot--you" /> You</span>
          <span className="inline-flex items-center gap-2"><i className="pro-dot pro-dot--them" /> {p.name}</span>
        </div>
        <div className="space-y-4">
          {r.traits.map((t) => (
            <div key={t.id} className="space-y-2">
              <div className="smb-meter-row">
                <span className="smb-meter-label">{t.label}</span>
                <span className="smb-meter-value">{fmt(t.id, t.you)} vs {fmt(t.id, t.them)}</span>
              </div>
              <div className="pro-track">
                <i className="pro-dot pro-dot--them" style={{ left: `${t.them_pos * 100}%` }} />
                <i className="pro-dot pro-dot--you" style={{ left: `${t.you_pos * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="smb-card">
        <h3 className="smb-card-title">Biggest gaps</h3>
        {r.gaps.length ? (
          <div className="pro-rows">
            {r.gaps.map((g) => (
              <div key={g.trait} className="pro-row">
                <span className="flex-1 text-sm">{gapText(g.trait, p.name)}</span>
                {g.move_id ? (
                  <Button onClick={() => onCopy([g.move_id])} className="smb-btn smb-btn--sec smb-btn--sm" aria-label={`Copy: ${g.move}`}>
                    Copy move
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="smb-t2 text-sm">{r.match != null ? "No big gaps. Keep going." : "Your gaps show up once you've uploaded through SendMyBeat."}</p>
        )}
      </section>
    </div>
  );
};

export default ProPage;
