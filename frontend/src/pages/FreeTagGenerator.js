import { Link, useSearchParams } from "react-router-dom";
import FreeTagTool from "@/components/seo/FreeTagTool";
import { BLOG, FREE_TAG_PAGE, GUIDES, STYLES, TAG_HUB_PATH, TAG_SETS, TOOL_PAGES, tagSetPath, withYear } from "@/lib/seoModel";
import "@/pages/PolicyPages.css";
import "@/pages/FreeTagGenerator.css";

const YEAR = new Date().getFullYear();

const FreeTagGenerator = () => {
  // Tag set pages link here with ?q= so the search is already typed in.
  const [params] = useSearchParams();

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10">
        <div className="policy-card ftg p-5 sm:p-8 md:p-10">
          <p className="smb-eyebrow">Free tool, no account</p>
          <h1 className="policy-title ftg-h1">{FREE_TAG_PAGE.h1}</h1>
          <p className="policy-muted ftg-lede">{FREE_TAG_PAGE.lede}</p>

          <FreeTagTool initialQuery={params.get("q") || ""} />

          <section className="ftg-copy">
            {FREE_TAG_PAGE.how.map(([heading, body]) => (
              <div key={heading}>
                <h2 className="policy-title">{heading}</h2>
                <p>{body}</p>
              </div>
            ))}
          </section>

          <section className="ftg-copy">
            <h2 className="policy-title">Ready-made tag sets</h2>
            <p>
              Want a look first? These sets are free to copy. See all of them in <Link to={TAG_HUB_PATH}>type beat tags</Link>.
            </p>
            <ul className="ftg-examples">
              {FREE_TAG_PAGE.featured.map((slug) => (
                <li key={slug}>
                  <Link to={tagSetPath(slug)}>{TAG_SETS[slug].name} type beat tags</Link>
                  <p>{TAG_SETS[slug].sound}</p>
                </li>
              ))}
            </ul>
            <h2 className="policy-title">Tags by style</h2>
            <p className="ftg-links">
              {Object.entries(STYLES).map(([slug, st]) => (
                <Link key={slug} to={tagSetPath(slug)}>{st.name}</Link>
              ))}
            </p>
          </section>

          <nav className="ftg-copy" aria-label="Free tools">
            <h2 className="policy-title">More free tools, no sign-up</h2>
            <p>These run in your browser, so there's no limit on how often you use them.</p>
            <p className="ftg-links">
              {Object.entries(TOOL_PAGES)
                .filter(([, t]) => t.tool !== "tags" && !t.account)
                .map(([path, t]) => (
                  <Link key={path} to={path}>{t.nav}</Link>
                ))}
            </p>
            <p>
              Need to get a beat onto YouTube? The <Link to="/upload-mp3-to-youtube">free MP3 to YouTube uploader</Link> turns your
              MP3 and a picture or GIF into a video on your channel, 3 a day with a free account.
            </p>
          </nav>

          <section className="ftg-copy">
            <h2 className="policy-title">Questions</h2>
            {FREE_TAG_PAGE.faq.map(([q, a]) => (
              <div key={q}>
                <h3 className="policy-title ftg-q">{withYear(q, YEAR)}</h3>
                <p>{withYear(a, YEAR)}</p>
              </div>
            ))}
          </section>

          <nav className="ftg-copy" aria-label="Guides">
            <h2 className="policy-title">What else SendMyBeat does</h2>
            <p>
              With an account you can write descriptions, turn your beat and artwork into a video with a visualizer, and upload it
              straight to your YouTube channel. See <Link to="/">how it works</Link> or read <Link to="/about">about SendMyBeat</Link>.
            </p>
            <ul>
              {Object.entries(TOOL_PAGES).map(([path, t]) => (
                <li key={path}><Link to={path}>{t.h1}</Link></li>
              ))}
              {Object.entries(GUIDES).map(([path, g]) => (
                <li key={path}><Link to={path}>{g.h1}</Link></li>
              ))}
              <li><Link to={BLOG.path}>Producer blog: guides for type beat channels</Link></li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default FreeTagGenerator;
