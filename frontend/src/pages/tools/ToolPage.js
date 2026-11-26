import { Link, useLocation, useSearchParams } from "react-router-dom";
import FreeTagTool from "@/components/seo/FreeTagTool";
import { FreeToolAd } from "@/components/AdBanner";
import { BLOG, GUIDES, TAG_HUB_PATH, TOOL_PAGES, TRENDING_PAGE, UPLOAD_PITCH, relatedBlocks, withYear } from "@/lib/seoModel";
import TitleTool from "@/pages/tools/TitleTool";
import DescriptionTool from "@/pages/tools/DescriptionTool";
import HashtagTool from "@/pages/tools/HashtagTool";
import TagCounterTool from "@/pages/tools/TagCounterTool";
import Mp3UploadTool from "@/pages/tools/Mp3UploadTool";
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
  upload: Mp3UploadTool,
};

// On the free uploader pages: what a SendMyBeat account adds, with the homepage's feature
// names and plans (UPLOAD_PITCH in seoModel.js).
const UploadPitch = () => (
  <section className="ftg-cta policy-feature-card u-cta mup-pitch">
    <h2 className="policy-title">{UPLOAD_PITCH.heading}</h2>
    <p>{UPLOAD_PITCH.body}</p>
    <ul className="mup-features">
      {UPLOAD_PITCH.features.map((f) => (
        <li key={f.id}>
          <strong>
            {f.title}
            {f.pro ? <span className="smb-pill">Pro</span> : null}
          </strong>
          <span>{f.body}</span>
        </li>
      ))}
    </ul>
    <ul className="mup-plans">
      {UPLOAD_PITCH.plans.map((p) => (
        <li key={p.id}>
          <strong>
            {p.name} <span className="smb-mono">{p.price}{p.per.startsWith("/") ? p.per : ""}</span>
          </strong>
          <span>{p.lines.slice(0, 2).join(", ")}{p.id === "trial" ? ", no card" : ""}</span>
        </li>
      ))}
    </ul>
    <div className="flex flex-wrap gap-3">
      <Link to={UPLOAD_PITCH.signup[0]} className="smb-btn smb-btn--pri smb-btn--lg">{UPLOAD_PITCH.signup[1]}</Link>
      <Link to={UPLOAD_PITCH.home[0]} className="smb-btn smb-btn--sec smb-btn--lg">{UPLOAD_PITCH.home[1]}</Link>
    </div>
  </section>
);

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

          {page.tool === "tags" || page.tool === "upload" ? <FreeToolAd /> : null}

          <section className="ftg-copy">
            {[...page.how, ...(page.extra || [])].map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{withYear(body, YEAR)}</p>
              </div>
            ))}
          </section>

          {page.tool === "upload" ? <UploadPitch /> : null}

          {page.tool !== "tags" && page.tool !== "upload" ? (
            <section className="ftg-cta policy-feature-card u-cta">
              <h2 className="policy-title">Need tags for this beat too?</h2>
              <p>
                The tag generator pulls YouTube tags from live searches for your artist. You get 3 free runs a day with no account, and signing up
                free adds 3 more AI generations and 3 YouTube uploads, no card needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/free-tag-generator" className="smb-btn smb-btn--pri smb-btn--lg">Free tag generator</Link>
                <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
              </div>
            </section>
          ) : null}

          {page.pitch ? (
            <section className="ftg-cta policy-feature-card u-cta">
              <h2 className="policy-title">{page.pitch.heading}</h2>
              <p>{page.pitch.body}</p>
              <div className="flex flex-wrap gap-3">
                {page.pitch.links.map(([p, label], i) => (
                  <Link key={p} to={p} className={`smb-btn ${i === 0 ? "smb-btn--pri" : "smb-btn--sec"} smb-btn--lg`}>{label}</Link>
                ))}
              </div>
            </section>
          ) : null}

          {relatedBlocks(page.related).map((block) => (
            <section key={block.heading} className="ftg-copy">
              <h2 className="policy-title">{block.heading}</h2>
              <p>{block.body}</p>
              <p className="ftg-links">
                {block.links.map(([p, label]) => (
                  <Link key={p} to={p}>{label}</Link>
                ))}
              </p>
            </section>
          ))}

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
              <Link to={TRENDING_PAGE.path}>{TRENDING_PAGE.nav}</Link>
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
              <li><Link to={BLOG.path}>Producer blog: guides for type beat channels</Link></li>
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default ToolPage;
