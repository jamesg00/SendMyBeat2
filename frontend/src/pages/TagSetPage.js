import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TAG_HUB_PATH, TAG_SETS, freeTagLink, tagSetPage, tagSetPath, tagsFor, withYear, youtubeTagChars } from "@/lib/seoModel";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

const YEAR = new Date().getFullYear();

// One page per artist or style: a ready tag set to copy, what buyers expect from the sound,
// and a one-tap route into the free generator with the search already filled in.
const TagSetPage = () => {
  const { slug } = useParams();
  const page = tagSetPage(slug);

  if (!page) {
    return (
      <div className="policy-shell">
        <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
          <div className="policy-card ftg p-5 sm:p-8 md:p-10">
            <h1 className="policy-title ftg-h1">No tag set for that one yet</h1>
            <p className="policy-muted ftg-lede">
              Generate tags for any artist with the <Link to="/free-tag-generator">free tag generator</Link>, or pick one from{" "}
              <Link to={TAG_HUB_PATH}>type beat tags</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tags = tagsFor(slug, YEAR);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(tags.join(", "));
      toast.success("Tags copied");
    } catch {
      toast.error("Couldn't copy. Select the tags and copy them yourself.");
    }
  };
  const others = Object.entries(TAG_SETS).filter(([s, set]) => s !== slug && set.kind === page.kind && !page.related.includes(s));

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <article className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">
            <Link to={TAG_HUB_PATH}>Type beat tags</Link> / {page.name}
          </p>
          <h1 className="policy-title ftg-h1">{page.h1}</h1>
          <p className="policy-muted ftg-lede">{page.lede}</p>

          <section className="ftg-result" aria-label={`${page.name} type beat tags`}>
            <div className="ftg-result-head">
              <h2 className="policy-title">Tags to copy</h2>
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
              <Button type="button" onClick={copyAll} className="smb-btn smb-btn--sec">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy all tags
              </Button>
              <Link to={freeTagLink(page.query)} className="smb-btn smb-btn--pri">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate fresh tags free
              </Link>
            </div>
          </section>

          <section className="ftg-copy">
            <h2 className="policy-title">What buyers expect from a {page.query}</h2>
            <p>
              {page.sound} Tempo is {page.bpm}.
            </p>
            <h2 className="policy-title">How to use these tags</h2>
            <p>{page.howTo}</p>
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

          <section className="ftg-cta policy-feature-card u-cta">
            <h2 className="policy-title">Get tags for your exact beat</h2>
            <p>
              This set is a starting point. The free generator checks today's YouTube searches and the tags on {page.query}s that already
              rank, then scores and trims them for you. One run free, no account.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={freeTagLink(page.query)} className="smb-btn smb-btn--pri smb-btn--lg">Try the free generator</Link>
              <Link to="/?signup=1" className="smb-btn smb-btn--sec smb-btn--lg">Sign up free</Link>
            </div>
          </section>

          <nav className="ftg-copy" aria-label="Related tag sets">
            <h2 className="policy-title">Related type beat tags</h2>
            <ul>
              {page.related.map((s) => (
                <li key={s}><Link to={tagSetPath(s)}>{TAG_SETS[s].name} type beat tags</Link></li>
              ))}
            </ul>
            <h2 className="policy-title">More {page.kind === "artist" ? "artists" : "styles"}</h2>
            <p className="ftg-links">
              {others.map(([s, set]) => (
                <Link key={s} to={tagSetPath(s)}>{set.name}</Link>
              ))}
            </p>
          </nav>
        </article>
      </div>
    </div>
  );
};

export default TagSetPage;
