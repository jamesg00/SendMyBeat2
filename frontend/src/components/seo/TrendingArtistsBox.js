import { Link } from "react-router-dom";
import { TRENDING_PAGE, tagSetPath } from "@/lib/seoModel";
import { trendingHeading, useTrending } from "@/components/seo/useTrending";
import "@/components/seo/TrendingArtists.css";

// "+4" / "-2" / "0" score points against last week. Only called when change isn't null.
export const changeLabel = (change) => {
  const rounded = Math.round(change);
  return rounded > 0 ? `+${rounded}` : String(rounded);
};
export const changeTone = (change) => (Math.round(change) > 0 ? "up" : Math.round(change) < 0 ? "down" : "flat");

// The top artists from GET /api/seo/trending as chips, for the tag generators. With onPick,
// a chip puts the artist's search ("ken carson type beat") into the generator's box; without
// it, a chip opens the artist's tag page. Nothing renders while loading, when the list is
// empty (the server hasn't built one yet) or when the request fails.
const TrendingArtistsBox = ({ onPick, limit = 8, className = "" }) => {
  const { status, data } = useTrending();
  if (status !== "ready") return null;
  const artists = data.artists.slice(0, limit);
  const rising = data.rankedBy === "change";

  return (
    <section className={`tab ${className}`.trim()} aria-label={trendingHeading(data.rankedBy)}>
      <div className="tab-head">
        <h2 className="tab-title">{trendingHeading(data.rankedBy)}</h2>
        <Link to={TRENDING_PAGE.path} className="tab-all">See all</Link>
      </div>
      <p className="tab-sub">
        {onPick ? "Tap one to search it. " : ""}
        {rising ? "Biggest gains in YouTube search suggestions vs last week." : "Ranked by YouTube search suggestions this week."}
      </p>
      <ul className="tab-chips">
        {artists.map((a) => {
          const change = rising && a.change !== null ? (
            <span className={`tab-change tab-change--${changeTone(a.change)}`}>{changeLabel(a.change)}</span>
          ) : null;
          return (
            <li key={a.slug}>
              {onPick ? (
                <button type="button" className="tab-chip" onClick={() => onPick(a.query)} title={`Search "${a.query}"`}>
                  {a.name}
                  {change}
                </button>
              ) : (
                <Link to={tagSetPath(a.slug)} className="tab-chip" title={`${a.name} type beat tags`}>
                  {a.name}
                  {change}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default TrendingArtistsBox;
