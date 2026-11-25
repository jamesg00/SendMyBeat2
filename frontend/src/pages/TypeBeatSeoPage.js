import { Link, useLocation } from "react-router-dom";
import { SEO_PAGES } from "@/lib/seoPages";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

// One template for the search pages in lib/seoPages.js.
const TypeBeatSeoPage = () => {
  const { pathname } = useLocation();
  const page = SEO_PAGES[pathname.replace(/\/+$/, "")];
  if (!page) return null;
  const others = Object.entries(SEO_PAGES).filter(([path]) => path !== pathname);

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">SendMyBeat guides</p>
          <h1 className="policy-title ftg-h1">{page.h1}</h1>
          <p className="policy-muted ftg-lede">{page.lede}</p>

          <section className="ftg-copy">
            {page.sections.map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{body}</p>
              </div>
            ))}
          </section>

          <section className="ftg-cta policy-feature-card">
            <h2 className="policy-title">Try it on your next beat</h2>
            <p>Run the tag generator once for free, no account. Sign up for 3 free generations and 3 uploads, no card needed.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/free-tag-generator" className="smb-btn smb-btn--pri smb-btn--lg">Free tag generator</Link>
              <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
            </div>
          </section>

          <nav className="ftg-copy" aria-label="More guides">
            <h2 className="policy-title">More guides</h2>
            <ul>
              {others.map(([path, other]) => (
                <li key={path}><Link to={path}>{other.h1}</Link></li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default TypeBeatSeoPage;
