import { Link } from "react-router-dom";
import { BLOG, FREE_TAG_PAGE, TAG_HUB_PATH, TOOL_PAGES, TRENDING_PAGE, freeTagLink, tagSetPath, trendingFallbackArtists, withYear } from "@/lib/seoModel";
import { formatUpdated, trendingHeading, useTrending } from "@/components/seo/useTrending";
import { changeLabel, changeTone } from "@/components/seo/TrendingArtistsBox";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";
import "@/components/seo/TrendingArtists.css";

const YEAR = new Date().getFullYear();
const SKELETON_ROWS = [92, 84, 77, 70, 64, 58];
const POPULAR = trendingFallbackArtists(20);

// Links to the artist tag pages, for the empty and failed states.
const PopularLinks = () => (
  <p className="ftg-links">
    {POPULAR.slice(0, 12).map(([slug, name]) => (
      <Link key={slug} to={tagSetPath(slug)}>{name}</Link>
    ))}
  </p>
);

// The live list from GET /api/seo/trending: rank, artist (to their tag page), a demand bar
// from the 0-100 score, and the change vs last week once the server has one.
const TrendingList = () => {
  const { status, data } = useTrending();

  if (status === "loading") {
    return (
      <section className="ftg-result trd" aria-busy="true" aria-label="Loading the trending list">
        <div className="ftg-result-head">
          <h2 className="policy-title">Loading this week's list</h2>
        </div>
        <ol className="trd-list" aria-hidden="true">
          {SKELETON_ROWS.map((w, i) => (
            <li key={w} className="trd-row trd-row--skeleton">
              <span className="trd-rank smb-mono">{i + 1}</span>
              <div className="trd-main">
                <span className="trd-skel motion-safe:animate-pulse" style={{ width: `${w * 0.5}%` }} />
                <span className="trd-bar"><i style={{ width: `${w}%` }} /></span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (status !== "ready") {
    const failed = status === "error";
    return (
      <section className="ftg-result trd trd--empty">
        <div className="ftg-result-head">
          <h2 className="policy-title">{failed ? "The list didn't load" : "The first list is being built"}</h2>
        </div>
        <p className="policy-muted">
          {failed
            ? "We couldn't reach the trending list just now. Refresh in a minute, or "
            : "We're reading this week's YouTube search suggestions now. Check back soon. Meanwhile, "}
          browse the <Link to={TAG_HUB_PATH}>type beat tags for every artist</Link>.
        </p>
        <PopularLinks />
      </section>
    );
  }

  const rising = data.rankedBy === "change";
  const updated = formatUpdated(data.updatedAt);
  return (
    <section className="ftg-result trd" aria-label={trendingHeading(data.rankedBy)}>
      <div className="ftg-result-head">
        <h2 className="policy-title">{rising ? "Rising this week" : "Most in-demand this week"}</h2>
        {updated ? (
          <span className="smb-mono smb-t3 text-xs">
            Updated <time dateTime={data.updatedAt}>{updated}</time>
          </span>
        ) : null}
      </div>
      <p className="trd-note">
        {rising
          ? `Ranked by how much each artist's demand score rose against about ${data.windowDays} days ago.`
          : "Ranked by demand score: how strongly YouTube suggests the artist's type beat search. Week-on-week changes show once there's a week of data."}
      </p>
      <ol className="trd-list">
        {data.artists.map((a, i) => {
          const score = Math.round(a.score);
          return (
            <li key={a.slug} className="trd-row">
              <span className="trd-rank smb-mono">{i + 1}</span>
              <div className="trd-main">
                <div className="trd-line">
                  <Link to={tagSetPath(a.slug)} className="trd-name">{a.name}</Link>
                  <span className="trd-meta smb-mono">
                    <span title="Demand score, 0 to 100. Not a search count.">{score}/100</span>
                    {a.change !== null ? (
                      <span className="trd-delta">
                        <span className={`tab-change tab-change--${changeTone(a.change)}`}>{changeLabel(a.change)}</span> vs last week
                      </span>
                    ) : null}
                  </span>
                </div>
                <span className="trd-bar" role="img" aria-label={`Demand score ${score} of 100`}>
                  <i style={{ width: `${Math.max(score, 2)}%` }} />
                </span>
              </div>
              <Link to={freeTagLink(a.query)} className="trd-gen" aria-label={`Generate tags for ${a.query}`}>Tags</Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const TrendingTypeBeats = () => {
  const page = TRENDING_PAGE;
  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">Refreshed twice a day</p>
          <h1 className="policy-title ftg-h1">{page.h1}</h1>
          <p className="policy-muted ftg-lede">{page.lede}</p>

          <TrendingList />

          <section className="ftg-copy">
            {page.how.map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{body}</p>
              </div>
            ))}
          </section>

          <nav className="ftg-copy" aria-label="Popular artist tag pages">
            <h2 className="policy-title">Popular type beat tags</h2>
            <p>
              Ready-made tag sets for the artists producers make the most type beats for. See every artist on the{" "}
              <Link to={TAG_HUB_PATH}>type beat tags</Link> page.
            </p>
            <p className="ftg-links">
              {POPULAR.map(([slug, name]) => (
                <Link key={slug} to={tagSetPath(slug)}>{name}</Link>
              ))}
            </p>
          </nav>

          <section className="ftg-cta policy-feature-card u-cta">
            <h2 className="policy-title">Make tags for the artist you picked</h2>
            <p>
              The free tag generator reads today's YouTube searches for your artist and scores every tag. 3 free runs a day with no
              account, and signing up free adds 3 more AI generations and 3 YouTube uploads, no card needed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={FREE_TAG_PAGE.path} className="smb-btn smb-btn--pri smb-btn--lg">Free tag generator</Link>
              <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
            </div>
          </section>

          <section className="ftg-copy">
            <h2 className="policy-title">Questions</h2>
            {page.faq.map(([q, a]) => (
              <div key={q}>
                <h3 className="policy-title ftg-q">{withYear(q, YEAR)}</h3>
                <p>{withYear(a, YEAR)}</p>
              </div>
            ))}
          </section>

          <nav className="ftg-copy" aria-label="Free tools">
            <h2 className="policy-title">Free tools</h2>
            <p className="ftg-links">
              <Link to={FREE_TAG_PAGE.path}>Free tag generator</Link>
              {Object.entries(TOOL_PAGES).map(([p, t]) => (
                <Link key={p} to={p}>{t.nav}</Link>
              ))}
              <Link to={TAG_HUB_PATH}>Type beat tags</Link>
              <Link to={BLOG.path}>Producer blog</Link>
            </p>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default TrendingTypeBeats;
