import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO_PAGES } from "@/lib/seoPages";
import {
  BLOG,
  BLOG_POSTS,
  GUIDES,
  STYLES,
  TAG_HUB_PATH,
  TAG_SETS,
  TOOL_PAGES,
  TRENDING_PAGE,
  artistsByLetter,
  blogPostList,
  freeTagLink,
  postDate,
  relatedBlocks,
  tagSetPath,
  tagsFor,
  withYear,
  youtubeTagChars,
} from "@/lib/seoModel";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

const YEAR = new Date().getFullYear();

// The box near the end of a guide when the page doesn't set its own "cta".
const DEFAULT_CTA = {
  heading: "Try it on your next beat",
  body: "Run the tag generator free, 3 times a day with no account. Sign up for 3 free generations and 3 uploads, no card needed.",
  links: [
    ["/free-tag-generator", "Free tag generator"],
    ["/?signup=1", "Sign up free"],
  ],
};

const copyTags = async (tags) => {
  try {
    await navigator.clipboard.writeText(tags.join(", "));
    toast.success("Tags copied");
  } catch {
    toast.error("Couldn't copy. Select the tags and copy them yourself.");
  }
};

// A post's ready-made tag set ("tagSet" in seoModel.js), the same one its tag page shows.
const TagSetBlock = ({ slug }) => {
  const set = TAG_SETS[slug];
  const tags = tagsFor(slug, YEAR);
  const query = `${set.name.toLowerCase()} type beat`;
  return (
    <section className="ftg-result" aria-label={`${set.name} type beat tags`}>
      <div className="ftg-result-head">
        <h2 className="policy-title">{set.name} type beat tags to copy</h2>
        <span className="smb-mono smb-t3 text-xs">
          {tags.length} tags, {youtubeTagChars(tags)} of 500 characters
        </span>
      </div>
      <ul className="ftg-tags">
        {tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => copyTags(tags)} className="smb-btn smb-btn--sec">
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy all tags
        </Button>
        <Link to={freeTagLink(query)} className="smb-btn smb-btn--pri">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate fresh tags free
        </Link>
        <Link to={tagSetPath(slug)} className="smb-btn smb-btn--sec">
          {set.name} tag page
        </Link>
      </div>
    </section>
  );
};

// One template for the guide pages and blog posts in lib/seoModel.js. The type beat tags guide
// also lists every artist (grouped by letter) and style tag set.
const TypeBeatSeoPage = () => {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "");
  const page = SEO_PAGES[path];
  if (!page) return null;
  const isPost = Boolean(BLOG_POSTS[path]);
  const isHub = path === TAG_HUB_PATH;
  const cta = page.cta || DEFAULT_CTA;
  const otherGuides = Object.entries(GUIDES).filter(([p]) => p !== path);
  const otherPosts = blogPostList().filter(([p]) => p !== path);

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          {isPost ? (
            <p className="smb-eyebrow">
              <Link to={BLOG.path}>Producer blog</Link> / <time dateTime={page.date}>{postDate(page.date)}</time>
            </p>
          ) : (
            <p className="smb-eyebrow">SendMyBeat guides</p>
          )}
          <h1 className="policy-title ftg-h1">{withYear(page.h1, YEAR)}</h1>
          <p className="policy-muted ftg-lede">{withYear(page.lede, YEAR)}</p>

          {page.tagSet && TAG_SETS[page.tagSet] ? <TagSetBlock slug={page.tagSet} /> : null}

          {isHub ? (
            <nav className="ftg-copy" aria-label="Tag sets">
              <h2 className="policy-title">Tags by artist</h2>
              <p>
                Not sure who to make a beat for? See the <Link to={TRENDING_PAGE.path}>type beats trending this week</Link>.
              </p>
              {artistsByLetter().map(([letter, list]) => (
                <div key={letter}>
                  <h3 className="policy-title ftg-q">{letter}</h3>
                  <p className="ftg-links">
                    {list.map(([slug, name]) => (
                      <Link key={slug} to={tagSetPath(slug)}>{name}</Link>
                    ))}
                  </p>
                </div>
              ))}
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
                <h2 className="policy-title">{withYear(heading, YEAR)}</h2>
                <p>{withYear(body, YEAR)}</p>
              </div>
            ))}
          </section>

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

          <section className="ftg-cta policy-feature-card u-cta">
            <h2 className="policy-title">{cta.heading}</h2>
            <p>{cta.body}</p>
            <div className="flex flex-wrap gap-3">
              {cta.links.map(([p, label], i) => (
                <Link key={p} to={p} className={`smb-btn ${i === 0 ? "smb-btn--pri" : "smb-btn--sec"} smb-btn--lg`}>{label}</Link>
              ))}
            </div>
          </section>

          {page.faq ? (
            <section className="ftg-copy">
              <h2 className="policy-title">Questions</h2>
              {page.faq.map(([q, a]) => (
                <div key={q}>
                  <h3 className="policy-title ftg-q">{withYear(q, YEAR)}</h3>
                  <p>{withYear(a, YEAR)}</p>
                </div>
              ))}
            </section>
          ) : null}

          <nav className="ftg-copy" aria-label="More guides">
            <h2 className="policy-title">Free tools, no sign-up</h2>
            <p className="ftg-links">
              <Link to="/free-tag-generator">Free tag generator</Link>
              {Object.entries(TOOL_PAGES)
                .filter(([, t]) => !t.account)
                .map(([p, t]) => (
                  <Link key={p} to={p}>{t.nav}</Link>
                ))}
            </p>
            <h2 className="policy-title">Free with an account</h2>
            <p className="ftg-links">
              {Object.entries(TOOL_PAGES)
                .filter(([, t]) => t.account)
                .map(([p, t]) => (
                  <Link key={p} to={p}>{t.nav}</Link>
                ))}
            </p>
            <h2 className="policy-title">{isPost ? "More from the blog" : "From the producer blog"}</h2>
            <ul>
              {otherPosts.map(([p, post]) => (
                <li key={p}><Link to={p}>{withYear(post.h1, YEAR)}</Link></li>
              ))}
              <li><Link to={BLOG.path}>All posts</Link></li>
            </ul>
            <h2 className="policy-title">{isPost ? "Guides" : "More guides"}</h2>
            <ul>
              {otherGuides.map(([p, other]) => (
                <li key={p}><Link to={p}>{withYear(other.h1, YEAR)}</Link></li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default TypeBeatSeoPage;
