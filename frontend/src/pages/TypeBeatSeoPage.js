import { Link, useLocation } from "react-router-dom";
import { SEO_PAGES } from "@/lib/seoPages";
import { ARTISTS, STYLES, TAG_HUB_PATH, TOOL_PAGES, tagSetPath } from "@/lib/seoModel";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

// One template for the guide pages in lib/seoModel.js. The type beat tags guide also
// lists every artist and style tag set.
const TypeBeatSeoPage = () => {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "");
  const page = SEO_PAGES[path];
  if (!page) return null;
  const others = Object.entries(SEO_PAGES).filter(([p]) => p !== path);
  const isHub = path === TAG_HUB_PATH;

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">SendMyBeat guides</p>
          <h1 className="policy-title ftg-h1">{page.h1}</h1>
          <p className="policy-muted ftg-lede">{page.lede}</p>

          {isHub ? (
            <nav className="ftg-copy" aria-label="Tag sets">
              <h2 className="policy-title">Tags by artist</h2>
              <p className="ftg-links">
                {Object.entries(ARTISTS).map(([slug, a]) => (
                  <Link key={slug} to={tagSetPath(slug)}>{a.name}</Link>
                ))}
              </p>
              <h2 className="policy-title">Tags by style</h2>
              <p className="ftg-links">
                {Object.entries(STYLES).map(([slug, s]) => (
                  <Link key={slug} to={tagSetPath(slug)}>{s.name}</Link>
                ))}
              </p>
            </nav>
          ) : null}

          <section className="ftg-copy">
            {page.sections.map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{body}</p>
              </div>
            ))}
          </section>

          <section className="ftg-cta policy-feature-card u-cta">
            <h2 className="policy-title">Try it on your next beat</h2>
            <p>Run the tag generator once for free, no account. Sign up for 3 free generations and 3 uploads, no card needed.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/free-tag-generator" className="smb-btn smb-btn--pri smb-btn--lg">Free tag generator</Link>
              <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
            </div>
          </section>

          <nav className="ftg-copy" aria-label="More guides">
            <h2 className="policy-title">Free tools, no sign-up</h2>
            <p className="ftg-links">
              <Link to="/free-tag-generator">Free tag generator</Link>
              {Object.entries(TOOL_PAGES).map(([p, t]) => (
                <Link key={p} to={p}>{t.nav}</Link>
              ))}
            </p>
            <h2 className="policy-title">More guides</h2>
            <ul>
              {others.map(([p, other]) => (
                <li key={p}><Link to={p}>{other.h1}</Link></li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default TypeBeatSeoPage;
