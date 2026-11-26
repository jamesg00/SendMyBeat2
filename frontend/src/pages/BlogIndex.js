import { Link } from "react-router-dom";
import { BLOG, GUIDES, TOOL_PAGES, blogPostList, postDate, withYear } from "@/lib/seoModel";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

const YEAR = new Date().getFullYear();

// /blog: every post in lib/seoModel.js (BLOG_POSTS), newest first. The posts themselves use
// the guide template (pages/TypeBeatSeoPage.js).
const BlogIndex = () => (
  <div className="policy-shell">
    <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
      <article className="policy-card ftg p-5 sm:p-8 md:p-10">
        <p className="smb-eyebrow">SendMyBeat blog</p>
        <h1 className="policy-title ftg-h1">{BLOG.h1}</h1>
        <p className="policy-muted ftg-lede">{BLOG.lede}</p>

        <section className="ftg-copy" aria-label="Posts">
          <ul className="ftg-examples">
            {blogPostList().map(([p, post]) => (
              <li key={p}>
                <Link to={p}>{withYear(post.h1, YEAR)}</Link>
                <p>
                  <time dateTime={post.date}>{postDate(post.date)}</time>. {withYear(post.summary, YEAR)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ftg-cta policy-feature-card u-cta">
          <h2 className="policy-title">Put it into practice</h2>
          <p>
            SendMyBeat turns one search into scored tags, titles and a description, makes your beat into a video and uploads it to
            your channel. Sign up free for 3 generations and 3 uploads, no card needed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/?signup=1" className="smb-btn smb-btn--pri smb-btn--lg">Sign up free</Link>
            <Link to="/free-tag-generator" className="smb-btn smb-btn--sec smb-btn--lg">Try one free tag run</Link>
          </div>
        </section>

        <nav className="ftg-copy" aria-label="Guides and tools">
          <h2 className="policy-title">Guides</h2>
          <ul>
            {Object.entries(GUIDES).map(([p, g]) => (
              <li key={p}><Link to={p}>{withYear(g.h1, YEAR)}</Link></li>
            ))}
          </ul>
          <h2 className="policy-title">Free tools</h2>
          <p className="ftg-links">
            <Link to="/free-tag-generator">Free tag generator</Link>
            {Object.entries(TOOL_PAGES).map(([p, t]) => (
              <Link key={p} to={p}>{t.nav}</Link>
            ))}
          </p>
        </nav>
      </article>
    </div>
  </div>
);

export default BlogIndex;
