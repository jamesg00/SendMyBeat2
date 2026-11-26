import { Link, useLocation, useSearchParams } from "react-router-dom";
import FreeTagTool from "@/components/seo/FreeTagTool";
import { GUIDES, TAG_HUB_PATH, TOOL_PAGES, withYear } from "@/lib/seoModel";
import TitleTool from "@/pages/tools/TitleTool";
import DescriptionTool from "@/pages/tools/DescriptionTool";
import HashtagTool from "@/pages/tools/HashtagTool";
import TagCounterTool from "@/pages/tools/TagCounterTool";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";
import "@/pages/tools/ToolPages.css";

const YEAR = new Date().getFullYear();

const TagsTool = () => {
  const [params] = useSearchParams();
  return <FreeTagTool initialQuery={params.get("q") || ""} placeholder="e.g. travis scott type beat" />;
};

const TOOLS = {
  tags: TagsTool,
  title: TitleTool,
  description: DescriptionTool,
  hashtags: HashtagTool,
  counter: TagCounterTool,
};

// One template for the free tool pages in lib/seoModel.js (TOOL_PAGES): the tool at the top,
// then how it works, questions and links to the other tools.
const ToolPage = () => {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "");
  const page = TOOL_PAGES[path];
  if (!page) return null;
  const Tool = TOOLS[page.tool];
  const others = Object.entries(TOOL_PAGES).filter(([p]) => p !== path);

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">{page.eyebrow}</p>
          <h1 className="policy-title ftg-h1">{withYear(page.h1, YEAR)}</h1>
          <p className="policy-muted ftg-lede">{withYear(page.lede, YEAR)}</p>

          {Tool ? <Tool page={page} /> : null}

          <section className="ftg-copy">
            {[...page.how, ...(page.extra || [])].map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{withYear(body, YEAR)}</p>
              </div>
            ))}
          </section>

          {page.tool !== "tags" ? (
            <section className="ftg-cta policy-feature-card u-cta">
              <h2 className="policy-title">Need tags for this beat too?</h2>
              <p>
                The tag generator pulls YouTube tags from live searches for your artist. One run is free with no account, and signing up
                free adds 3 more AI generations and 3 YouTube uploads, no card needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/free-tag-generator" className="smb-btn smb-btn--pri smb-btn--lg">Free tag generator</Link>
                <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
              </div>
            </section>
          ) : null}

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
            <h2 className="policy-title">More free tools</h2>
            <p className="ftg-links">
              <Link to="/free-tag-generator">Free tag generator</Link>
              {others.map(([p, t]) => (
                <Link key={p} to={p}>{t.nav}</Link>
              ))}
              <Link to={TAG_HUB_PATH}>Type beat tags</Link>
            </p>
            <h2 className="policy-title">What else SendMyBeat does</h2>
            <p>
              With an account, SendMyBeat writes your tags, title and description from one search, turns your beat and artwork into a
              video with a visualizer, and uploads it to your YouTube channel. See <Link to="/">how it works</Link>.
            </p>
            <ul>
              {Object.entries(GUIDES).map(([p, g]) => (
                <li key={p}><Link to={p}>{withYear(g.h1, YEAR)}</Link></li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default ToolPage;
