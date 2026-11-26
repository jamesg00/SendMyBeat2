#!/usr/bin/env node
// Runs after `craco build`. The app is one HTML file that React fills in, so a search
// engine that doesn't run JavaScript (or runs it late) sees an empty page with the
// homepage's title for every URL. This writes a real HTML file for each public page,
// build/<path>/index.html, with that page's title, description, canonical, structured
// data and its main copy and links already in the HTML. React replaces the copy with the
// live page as soon as it loads. It also writes sitemap.xml from the same page list.
// The homepage is written into build/index.html itself (last, since that file is the
// template), the untouched template is kept as build/app.html for every non-public path,
// and build/serve.json tells `serve` which file answers which path.
//
//   node scripts/prerender-seo.js                 sitemap + prerendered pages (needs build/)
//   node scripts/prerender-seo.js --sitemap-only  only public/sitemap.xml
//
// The page data lives in src/lib/seoModel.js, the same file the React pages render from.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
// PRERENDER_BUILD_DIR lets you run this against a scratch copy of the build.
const BUILD = process.env.PRERENDER_BUILD_DIR ? path.resolve(process.env.PRERENDER_BUILD_DIR) : path.join(ROOT, "build");
const PUBLIC = path.join(ROOT, "public");

async function loadModel() {
  // seoModel.js is an ES module with no imports; copy it to .mjs so Node loads it as one.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "smb-seo-"));
  const file = path.join(tmp, "seoModel.mjs");
  fs.copyFileSync(path.join(ROOT, "src/lib/seoModel.js"), file);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// JSON inside <script> must not be able to close the tag.
const ldScript = (block) =>
  `<script type="application/ld+json" data-route-ld>${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`;

function sitemap(m, year) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = m.PUBLIC_PATHS.map((p) => {
    const page = m.publicPage(p, year);
    return `  <url><loc>${m.SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

const shell = (inner) =>
  `<div class="policy-shell"><div class="policy-wrap container mx-auto px-4 py-6 md:px-6 md:py-10"><article class="policy-card ftg p-5 sm:p-8 md:p-10">${inner}</article></div></div>`;

const a = (href, text, cls) => `<a href="${esc(href)}"${cls ? ` class="${cls}"` : ""}>${esc(text)}</a>`;
const sections = (list) => list.map(([h, b]) => `<h2 class="policy-title">${esc(h)}</h2><p>${esc(b)}</p>`).join("");
const faqHtml = (m, faq, year) =>
  `<section class="ftg-copy"><h2 class="policy-title">Questions</h2>${faq
    .map(([q, ans]) => `<h3 class="policy-title ftg-q">${esc(m.withYear(q, year))}</h3><p>${esc(m.withYear(ans, year))}</p>`)
    .join("")}</section>`;
const linkRow = (items) => `<p class="ftg-links">${items.map(([href, text]) => a(href, text)).join(" ")}</p>`;
const tagList = (tags) => `<ul class="ftg-tags">${tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;

function footer(m) {
  const links = [
    ["/", "Home"],
    ["/free-tag-generator", "Free tag generator"],
    ...toolLinks(m),
    [m.TAG_HUB_PATH, "Type beat tags"],
    [m.TRENDING_PAGE.path, m.TRENDING_PAGE.nav],
    ...Object.entries(m.GUIDES)
      .filter(([p]) => p !== m.TAG_HUB_PATH)
      .map(([p, g]) => [p, g.h1]),
    [m.BLOG.path, "Producer blog"],
    ["/about", "About"],
    ["/?signup=1", "Sign up free"],
  ];
  return `<nav class="ftg-copy" aria-label="SendMyBeat">${linkRow(links)}</nav>`;
}

function freeTagBody(m, year) {
  const p = m.FREE_TAG_PAGE;
  return shell(
    `<p class="smb-eyebrow">Free tool, no account</p><h1 class="policy-title ftg-h1">${esc(p.h1)}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(p.lede)}</p>` +
      `<p>${a("/free-tag-generator", "Generate my tags", "smb-btn smb-btn--pri smb-btn--lg")}</p>` +
      `<section class="ftg-copy">${sections(p.how)}</section>` +
      `<section class="ftg-copy"><h2 class="policy-title">Ready-made tag sets</h2><ul class="ftg-examples">${p.featured
        .map((s) => `<li>${a(m.tagSetPath(s), `${m.TAG_SETS[s].name} type beat tags`)}<p>${esc(m.TAG_SETS[s].sound)}</p></li>`)
        .join("")}</ul><h2 class="policy-title">Tags by style</h2>${linkRow(
        Object.entries(m.STYLES).map(([s, st]) => [m.tagSetPath(s), st.name])
      )}</section>` +
      toolNav(m, "More free tools, no sign-up", (t) => t.tool !== "tags" && !t.account) +
      toolNav(m, "Free with an account", (t) => t.account) +
      faqHtml(m, p.faq, year) +
      footer(m)
  );
}

// Related link blocks ("related" in seoModel.js: one block or a list) and a CTA box whose
// first link is the main button. Shared by guides, blog posts and tool pages.
const relatedHtml = (m, related) =>
  m
    .relatedBlocks(related)
    .map((r) => `<section class="ftg-copy"><h2 class="policy-title">${esc(r.heading)}</h2><p>${esc(r.body)}</p>${linkRow(r.links)}</section>`)
    .join("");
const ctaBox = (c) =>
  `<section class="ftg-cta policy-feature-card u-cta"><h2 class="policy-title">${esc(c.heading)}</h2><p>${esc(c.body)}</p><p>${c.links
    .map(([href, text], i) => a(href, text, `smb-btn ${i === 0 ? "smb-btn--pri" : "smb-btn--sec"} smb-btn--lg`))
    .join(" ")}</p></section>`;

const GUIDE_CTA = {
  heading: "Try it on your next beat",
  body: "Run the tag generator free, 3 times a day with no account. Sign up for 3 free generations and 3 uploads, no card needed.",
  links: [
    ["/free-tag-generator", "Free tag generator"],
    ["/?signup=1", "Sign up free"],
  ],
};

// A blog post's ready-made tag set ("tagSet"), the same one its tag page shows.
function postTagSet(m, slug, year) {
  const set = m.TAG_SETS[slug];
  if (!set) return "";
  const tags = m.tagsFor(slug, year);
  const query = `${set.name.toLowerCase()} type beat`;
  return `<section class="ftg-result"><div class="ftg-result-head"><h2 class="policy-title">${esc(set.name)} type beat tags to copy</h2><span class="smb-mono smb-t3 text-xs">${
    tags.length
  } tags, ${m.youtubeTagChars(tags)} of 500 characters</span></div>${tagList(tags)}<p>${a(
    m.freeTagLink(query),
    "Generate fresh tags free",
    "smb-btn smb-btn--pri"
  )} ${a(m.tagSetPath(slug), `${set.name} tag page`, "smb-btn smb-btn--sec")}</p></section>`;
}

// Guides and blog posts share this template (pages/TypeBeatSeoPage.js).
function guideBody(m, pagePath, year) {
  const post = m.BLOG_POSTS[pagePath];
  const g = post || m.GUIDES[pagePath];
  const y = (text) => m.withYear(text, year);
  const hub =
    pagePath === m.TAG_HUB_PATH
      ? `<nav class="ftg-copy" aria-label="Tag sets"><h2 class="policy-title">Tags by artist</h2><p>Not sure who to make a beat for? See the ${a(
          m.TRENDING_PAGE.path,
          "type beats trending this week"
        )}.</p>${m
          .artistsByLetter()
          .map(([letter, list]) => `<h3 class="policy-title ftg-q">${esc(letter)}</h3>${linkRow(list.map(([s, name]) => [m.tagSetPath(s), name]))}`)
          .join("")}<h2 class="policy-title">Tags by style</h2>${linkRow(
          Object.entries(m.STYLES).map(([s, x]) => [m.tagSetPath(s), x.name])
        )}</nav>`
      : "";
  const eyebrow = post
    ? `<p class="smb-eyebrow">${a(m.BLOG.path, "Producer blog")} / <time datetime="${esc(post.date)}">${esc(m.postDate(post.date))}</time></p>`
    : `<p class="smb-eyebrow">SendMyBeat guides</p>`;
  const posts = m.blogPostList().filter(([p]) => p !== pagePath);
  return shell(
    `${eyebrow}<h1 class="policy-title ftg-h1">${esc(y(g.h1))}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(y(g.lede))}</p>` +
      (g.tagSet ? postTagSet(m, g.tagSet, year) : "") +
      hub +
      `<section class="ftg-copy">${sections(g.sections.map(([h, b]) => [y(h), y(b)]))}</section>` +
      relatedHtml(m, g.related) +
      ctaBox(g.cta || GUIDE_CTA) +
      (g.faq ? faqHtml(m, g.faq, year) : "") +
      toolNav(m, "Free tools, no sign-up", (t) => !t.account) +
      toolNav(m, "Free with an account", (t) => t.account) +
      `<nav class="ftg-copy" aria-label="Producer blog"><h2 class="policy-title">${post ? "More from the blog" : "From the producer blog"}</h2>${linkRow([
        ...posts.map(([p, x]) => [p, y(x.h1)]),
        [m.BLOG.path, "All posts"],
      ])}</nav>` +
      footer(m)
  );
}

function blogIndexBody(m, year) {
  const b = m.BLOG;
  return shell(
    `<p class="smb-eyebrow">SendMyBeat blog</p><h1 class="policy-title ftg-h1">${esc(b.h1)}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(b.lede)}</p>` +
      `<section class="ftg-copy"><ul class="ftg-examples">${m
        .blogPostList()
        .map(
          ([p, post]) =>
            `<li>${a(p, m.withYear(post.h1, year))}<p><time datetime="${esc(post.date)}">${esc(m.postDate(post.date))}</time>. ${esc(
              m.withYear(post.summary, year)
            )}</p></li>`
        )
        .join("")}</ul></section>` +
      ctaBox({
        heading: "Put it into practice",
        body: "SendMyBeat turns one search into scored tags, titles and a description, makes your beat into a video and uploads it to your channel. Sign up free for 3 generations and 3 uploads, no card needed.",
        links: [
          ["/?signup=1", "Sign up free"],
          ["/free-tag-generator", "Try the free tag generator"],
        ],
      }) +
      toolNav(m, "Free tools") +
      footer(m)
  );
}

// /trending-type-beats (pages/TrendingTypeBeats.js). The ranking is live data the page fetches
// in the browser, so the static page carries the explanation, popular artist tag pages, the
// FAQ and the links, never rows that could go stale.
function trendingBody(m, year) {
  const p = m.TRENDING_PAGE;
  const popular = m.trendingFallbackArtists(20);
  return shell(
    `<p class="smb-eyebrow">Refreshed twice a day</p><h1 class="policy-title ftg-h1">${esc(p.h1)}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(p.lede)}</p>` +
      `<section class="ftg-result trd"><div class="ftg-result-head"><h2 class="policy-title">This week's list</h2></div><p class="trd-note">The ranked list loads in your browser from the latest refresh. Until then, start from the artists below or ${a(
        m.TAG_HUB_PATH,
        "browse type beat tags for every artist"
      )}.</p></section>` +
      `<section class="ftg-copy">${sections(p.how)}</section>` +
      `<nav class="ftg-copy" aria-label="Popular artist tag pages"><h2 class="policy-title">Popular type beat tags</h2><p>Ready-made tag sets for the artists producers make the most type beats for. See every artist on the ${a(
        m.TAG_HUB_PATH,
        "type beat tags"
      )} page.</p>${linkRow(popular.map(([s, name]) => [m.tagSetPath(s), name]))}</nav>` +
      ctaBox({
        heading: "Make tags for the artist you picked",
        body: "The free tag generator reads today's YouTube searches for your artist and scores every tag. 3 free runs a day with no account, and signing up free adds 3 more AI generations and 3 YouTube uploads, no card needed.",
        links: [
          [m.FREE_TAG_PAGE.path, "Free tag generator"],
          ["/?signup=1", "Sign up free"],
        ],
      }) +
      faqHtml(m, p.faq, year) +
      toolNav(m, "Free tools") +
      footer(m)
  );
}

function tagSetBody(m, slug, year) {
  const p = m.tagSetPage(slug);
  const tags = m.tagsFor(slug, year);
  const others = m.moreTagSets(slug, 24);
  return shell(
    `<p class="smb-eyebrow">${a(m.TAG_HUB_PATH, "Type beat tags")} / ${esc(p.name)}</p>` +
      `<h1 class="policy-title ftg-h1">${esc(p.h1)}</h1><p class="policy-muted ftg-lede">${esc(p.lede)}</p>` +
      `<section class="ftg-result"><h2 class="policy-title">Tags to copy</h2><p class="smb-mono smb-t3 text-xs">${tags.length} tags, ${m.youtubeTagChars(
        tags
      )} of 500 characters</p>${tagList(tags)}<p>${a(m.freeTagLink(p.query), "Generate fresh tags free", "smb-btn smb-btn--pri")}</p></section>` +
      `<section class="ftg-copy"><h2 class="policy-title">What buyers expect from a ${esc(p.query)}</h2><p>${esc(p.sound)} Tempo is ${esc(
        p.bpm
      )}.</p><h2 class="policy-title">How to use these tags</h2><p>${esc(p.howTo)}</p></section>` +
      faqHtml(m, p.faq, year) +
      `<nav class="ftg-copy" aria-label="Related tag sets"><h2 class="policy-title">Related type beat tags</h2><ul>${p.related
        .map((s) => `<li>${a(m.tagSetPath(s), `${m.TAG_SETS[s].name} type beat tags`)}</li>`)
        .join("")}</ul><h2 class="policy-title">More ${p.kind === "artist" ? "artists" : "styles"}</h2>${linkRow(
        others.map(([s, x]) => [m.tagSetPath(s), x.name])
      )}</nav>` +
      footer(m)
  );
}

// ---- Free tool pages (TOOL_PAGES in seoModel.js) ------------------------------------
// The tools run in the browser; the static page carries the copy, a button down to the
// tool and the tool's output for the page's example, built with the same seoTools.js.
async function loadTools() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "smb-tools-"));
  const file = path.join(tmp, "seoTools.mjs");
  fs.copyFileSync(path.join(ROOT, "src/lib/seoTools.js"), file);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const toolLinks = (m) => Object.entries(m.TOOL_PAGES || {}).map(([p, t]) => [p, t.nav]);

const toolNav = (m, heading, keep = () => true) =>
  `<nav class="ftg-copy" aria-label="Free tools"><h2 class="policy-title">${esc(heading)}</h2>${linkRow(
    Object.entries(m.TOOL_PAGES || {})
      .filter(([, t]) => keep(t))
      .map(([p, t]) => [p, t.nav])
  )}</nav>`;

function toolExample(m, t, tools, year) {
  const ex = t.example || {};
  const head = (h, note) =>
    `<div class="ftg-result-head"><h2 class="policy-title">${esc(h)}</h2>${note ? `<span class="smb-mono smb-t3 text-xs">${esc(note)}</span>` : ""}</div>`;
  if (t.tool === "tags") {
    return `<section class="ftg-result" id="tool">${head("Or start from a ready-made tag set")}${linkRow(
      m.FREE_TAG_PAGE.featured.map((s) => [m.tagSetPath(s), `${m.TAG_SETS[s].name} type beat tags`])
    )}</section>`;
  }
  if (t.tool === "upload") {
    return `<section class="ftg-result mup" id="tool">${head("Upload your MP3 in four steps", "3 free uploads a day")}<ol class="mup-steps">${(t.steps || [])
      .map(([title, body]) => `<li><strong>${esc(title)}</strong><span>${esc(body)}</span></li>`)
      .join("")}</ol><p class="mup-actions">${a("/?signup=1", "Sign up free to upload", "smb-btn smb-btn--pri smb-btn--lg")} ${a(
      "/?login=1",
      "Log in",
      "smb-btn smb-btn--sec smb-btn--lg"
    )}</p></section>`;
  }
  if (!tools) return "";
  if (t.tool === "title") {
    const titles = tools.typeBeatTitles({ ...ex, year });
    return `<section class="ftg-result" id="tool">${head(`Example titles for ${ex.artists}`, `YouTube allows ${tools.YOUTUBE_TITLE_LIMIT} characters`)}<ul class="ftl-rows">${titles
      .map(
        (x) =>
          `<li class="ftl-row"><div class="ftl-row-main"><span class="ftl-row-text">${esc(x.title)}</span><span class="ftl-row-meta smb-mono">${x.length} of ${tools.YOUTUBE_TITLE_LIMIT} characters</span></div></li>`
      )
      .join("")}</ul></section>`;
  }
  if (t.tool === "description") {
    const d = tools.beatDescription({ ...ex, year });
    return `<section class="ftg-result" id="tool">${head(`Example description for a ${ex.artist} type beat`, `${d.bytes} of ${tools.DESCRIPTION_MAX_BYTES} bytes`)}<pre class="ftl-pre">${esc(d.content)}</pre></section>`;
  }
  if (t.tool === "hashtags") {
    const h = tools.beatHashtags(ex);
    return `<section class="ftg-result" id="tool">${head(`Example hashtags for a ${ex.artists} type beat`)}${tagList(h.hashtags)}</section>`;
  }
  if (t.tool === "counter") {
    const r = tools.analyzeTags(m.withYear(ex.tags || "", year));
    return `<section class="ftg-result" id="tool">${head("Example count", `${r.count} tags, ${r.chars} of ${r.limit} characters`)}<ul class="ftl-rows ftl-rows--tight">${r.rows
      .map(
        (row) =>
          `<li class="ftl-row"><span class="ftl-row-text">${esc(row.tag)}</span><span class="ftl-row-meta smb-mono">${row.duplicate ? "repeat · " : ""}${row.cost} chars</span></li>`
      )
      .join("")}</ul></section>`;
  }
  return "";
}

// The free uploader pages' pitch for a SendMyBeat account (UPLOAD_PITCH in seoModel.js).
function uploadPitch(m) {
  const p = m.UPLOAD_PITCH;
  return (
    `<section class="ftg-cta policy-feature-card u-cta mup-pitch"><h2 class="policy-title">${esc(p.heading)}</h2><p>${esc(p.body)}</p>` +
    `<ul class="mup-features">${p.features
      .map((f) => `<li><strong>${esc(f.title)}${f.pro ? ' <span class="smb-pill">Pro</span>' : ""}</strong><span>${esc(f.body)}</span></li>`)
      .join("")}</ul>` +
    `<ul class="mup-plans">${p.plans
      .map(
        (x) =>
          `<li><strong>${esc(x.name)} <span class="smb-mono">${esc(x.price)}${x.per.startsWith("/") ? esc(x.per) : ""}</span></strong><span>${esc(
            x.lines.slice(0, 2).join(", ")
          )}${x.id === "trial" ? ", no card" : ""}</span></li>`
      )
      .join("")}</ul>` +
    `<p>${a(p.signup[0], p.signup[1], "smb-btn smb-btn--pri smb-btn--lg")} ${a(p.home[0], p.home[1], "smb-btn smb-btn--sec smb-btn--lg")}</p></section>`
  );
}

function toolBody(m, pagePath, year, tools) {
  const t = m.TOOL_PAGES[pagePath];
  const others = Object.entries(m.TOOL_PAGES).filter(([p]) => p !== pagePath);
  const cta =
    t.tool === "upload"
      ? uploadPitch(m)
      : t.tool === "tags"
      ? ""
      : `<section class="ftg-cta policy-feature-card u-cta"><h2 class="policy-title">Need tags for this beat too?</h2><p>The tag generator pulls YouTube tags from live searches for your artist. You get 3 free runs a day with no account, and signing up free adds 3 more AI generations and 3 YouTube uploads, no card needed.</p><p>${a(
          "/free-tag-generator",
          "Free tag generator",
          "smb-btn smb-btn--pri smb-btn--lg"
        )} ${a("/?signup=1", "Sign up free", "smb-btn smb-btn--sec smb-btn--lg")}</p></section>`;
  return shell(
    `<p class="smb-eyebrow">${esc(t.eyebrow)}</p><h1 class="policy-title ftg-h1">${esc(m.withYear(t.h1, year))}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(m.withYear(t.lede, year))}</p>` +
      `<p>${a("#tool", t.cta, "smb-btn smb-btn--pri smb-btn--lg")}</p>` +
      toolExample(m, t, tools, year) +
      `<section class="ftg-copy">${sections([...t.how, ...(t.extra || [])].map(([h, b]) => [h, m.withYear(b, year)]))}</section>` +
      cta +
      (t.pitch ? ctaBox(t.pitch) : "") +
      relatedHtml(m, t.related) +
      faqHtml(m, t.faq, year) +
      `<nav class="ftg-copy" aria-label="Free tools"><h2 class="policy-title">More free tools</h2>${linkRow([
        ["/free-tag-generator", "Free tag generator"],
        ...others.map(([p, x]) => [p, x.nav]),
        [m.TAG_HUB_PATH, "Type beat tags"],
        [m.TRENDING_PAGE.path, m.TRENDING_PAGE.nav],
      ])}</nav>` +
      footer(m)
  );
}
// ---- end free tool pages --------------------------------------------------------------

// ---- homepage
// build/index.html is the homepage and also the template every other page starts from, so
// main() renders the other pages from the untouched template first and writes this last.
function homeBody(m, year) {
  const h = m.HOME;
  const tools = Object.entries(m.TOOL_PAGES || {}).map(([p, t]) => [p, t.nav]);
  const guides = Object.entries(m.GUIDES)
    .filter(([p]) => p !== m.TAG_HUB_PATH)
    .map(([p, g]) => [p, g.h1]);
  return shell(
    `<p class="smb-eyebrow">${esc(h.eyebrow)}</p><h1 class="policy-title ftg-h1">${esc(h.h1)}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(h.lede)}</p>` +
      `<p class="ftg-links">${a("/?signup=1", "Start free", "smb-btn smb-btn--pri smb-btn--lg")} ${a(
        "/free-tag-generator",
        "Try the free tag generator",
        "smb-btn smb-btn--sec smb-btn--lg"
      )}</p>` +
      `<section class="ftg-copy"><ul>${h.ticks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` +
      `<section class="ftg-copy"><h2 class="policy-title">How it works</h2>${h.steps
        .map((s, i) => `<h3 class="policy-title ftg-q">${i + 1}. ${esc(s.title)}</h3><p>${esc(s.body)}</p>`)
        .join("")}</section>` +
      `<section class="ftg-copy"><h2 class="policy-title">What's inside</h2>${h.features
        .map((f) => `<h3 class="policy-title ftg-q">${esc(f.title)}${f.pro ? " (Pro)" : ""}</h3><p>${esc(f.body)}</p>`)
        .join("")}</section>` +
      `<section class="ftg-copy"><h2 class="policy-title">Pricing</h2><p>Try it free, no card needed.</p><ul>${h.plans
        .map((p) => `<li><strong>${esc(p.name)}, ${esc(p.price)}${p.per.startsWith("/") ? esc(p.per) : ` (${esc(p.per)})`}:</strong> ${esc(p.lines.join(". "))}.</li>`)
        .join("")}</ul></section>` +
      `<section class="ftg-copy"><h2 class="policy-title">Free tools and guides</h2>${linkRow([
        ["/free-tag-generator", "Free tag generator"],
        [m.TAG_HUB_PATH, "Type beat tags"],
        [m.TRENDING_PAGE.path, m.TRENDING_PAGE.nav],
        ...tools,
        ...guides,
        [m.BLOG.path, "Producer blog"],
        ...m.blogPostList().map(([p, x]) => [p, m.withYear(x.h1, year)]),
      ])}<h2 class="policy-title">Popular type beat tags</h2>${linkRow(
        m.FREE_TAG_PAGE.featured.map((s) => [m.tagSetPath(s), `${m.TAG_SETS[s].name} type beat tags`])
      )}</section>` +
      faqHtml(m, h.faq, year) +
      footer(m)
  );
}

function renderHome(m, template, year) {
  const html = renderPage(m, template, "/", year);
  if (!/<div id="root"><\/div>/.test(html)) throw new Error('build/index.html has no empty <div id="root"></div> to fill');
  // Signed in, "/" is the app, not the landing page: drop the landing copy before it paints.
  const clear = `<script>try{if(sessionStorage.getItem("token")||localStorage.getItem("token"))document.getElementById("root").innerHTML=""}catch(e){}</script>`;
  return html.replace(/<div id="root"><\/div>/, `<div id="root">${homeBody(m, year)}</div>${clear}`);
}

// `serve -s` rewrites every path without a file extension to /index.html, so it never serves
// build/<path>/index.html. This config (build/serve.json, read by `serve build`) sends each
// prerendered path to its own file and every other path to app.html, the untouched app shell
// (no homepage copy or canonical, so /dashboard doesn't show the landing page first). The
// catch-all skips .html paths because serve applies the remaining rules to a rewritten path too.
const APP_SHELL = "app.html";
function serveConfig(m) {
  return {
    rewrites: [
      { source: "/", destination: "/index.html" },
      ...m.PUBLIC_PATHS.filter((p) => p !== "/").map((p) => ({ source: p, destination: `${p}/index.html` })),
      { source: "!**/*.html", destination: `/${APP_SHELL}` },
    ],
  };
}

function setTag(html, re, replacement) {
  if (re.test(html)) return html.replace(re, replacement);
  return html.replace("</head>", `${replacement}</head>`);
}

function renderPage(m, template, pagePath, year, tools) {
  const page = m.publicPage(pagePath, year);
  const url = `${m.SITE}${pagePath === "/" ? "/" : pagePath}`;
  let html = template;
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`);
  const metas = [
    ["name", "title", page.title],
    ["name", "description", page.description],
    ["name", "robots", "index, follow"],
    ["property", "og:url", url],
    ["property", "og:title", page.title],
    ["property", "og:description", page.description],
    ["property", "twitter:url", url],
    ["property", "twitter:title", page.title],
    ["property", "twitter:description", page.description],
  ];
  metas.forEach(([attr, key, content]) => {
    const re = new RegExp(`<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`);
    html = setTag(html, re, `<meta ${attr}="${key}" content="${esc(content)}"/>`);
  });
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}"/>`);
  const ld = m.jsonLdFor(pagePath, year).map(ldScript).join("");
  if (ld) html = html.replace("</head>", `${ld}</head>`);

  let body = "";
  if (pagePath === m.FREE_TAG_PAGE.path) body = freeTagBody(m, year);
  else if (m.GUIDES[pagePath] || m.BLOG_POSTS[pagePath]) body = guideBody(m, pagePath, year);
  else if (pagePath === m.BLOG.path) body = blogIndexBody(m, year);
  else if (pagePath === m.TRENDING_PAGE.path) body = trendingBody(m, year);
  else if (m.TOOL_PAGES && m.TOOL_PAGES[pagePath]) body = toolBody(m, pagePath, year, tools);
  else if (pagePath.startsWith(`${m.TAG_HUB_PATH}/`)) body = tagSetBody(m, pagePath.slice(m.TAG_HUB_PATH.length + 1), year);
  if (body) {
    if (!/<div id="root"><\/div>/.test(html)) throw new Error('build/index.html has no empty <div id="root"></div> to fill');
    html = html.replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`);
  }
  return html;
}

async function main() {
  const m = await loadModel();
  const tools = await loadTools();
  const year = new Date().getFullYear();
  const xml = sitemap(m, year);
  fs.writeFileSync(path.join(PUBLIC, "sitemap.xml"), xml);
  if (process.argv.includes("--sitemap-only")) {
    console.log(`sitemap.xml: ${m.PUBLIC_PATHS.length} pages`);
    return;
  }

  const indexFile = path.join(BUILD, "index.html");
  if (!fs.existsSync(indexFile)) throw new Error("build/index.html not found. Run the build first.");
  const template = fs.readFileSync(indexFile, "utf8");
  if (!template.includes('<div id="root"></div>')) {
    throw new Error("build/index.html is already prerendered (its #root isn't empty). Run the build again first.");
  }
  fs.writeFileSync(path.join(BUILD, "sitemap.xml"), xml);

  let count = 0;
  m.PUBLIC_PATHS.forEach((p) => {
    if (p === "/") return; // the homepage overwrites the template, so it's written last
    const out = path.join(BUILD, p.slice(1), "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderPage(m, template, p, year, tools));
    count += 1;
  });
  fs.writeFileSync(path.join(BUILD, APP_SHELL), template);
  fs.writeFileSync(indexFile, renderHome(m, template, year));
  count += 1;
  fs.writeFileSync(path.join(BUILD, "serve.json"), `${JSON.stringify(serveConfig(m), null, 2)}\n`);
  console.log(`prerendered ${count} pages (homepage included), sitemap.xml: ${m.PUBLIC_PATHS.length} pages, serve.json written`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { renderPage, renderHome, serveConfig, sitemap, loadModel, loadTools };
