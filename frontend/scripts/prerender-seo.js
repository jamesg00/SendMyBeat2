#!/usr/bin/env node
// Runs after `craco build`. The app is one HTML file that React fills in, so a search
// engine that doesn't run JavaScript (or runs it late) sees an empty page with the
// homepage's title for every URL. This writes a real HTML file for each public page,
// build/<path>/index.html, with that page's title, description, canonical, structured
// data and its main copy and links already in the HTML. React replaces the copy with the
// live page as soon as it loads. It also writes sitemap.xml from the same page list.
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
const BUILD = path.join(ROOT, "build");
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
    [m.TAG_HUB_PATH, "Type beat tags"],
    ...Object.entries(m.GUIDES)
      .filter(([p]) => p !== m.TAG_HUB_PATH)
      .map(([p, g]) => [p, g.h1]),
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
      faqHtml(m, p.faq, year) +
      footer(m)
  );
}

function guideBody(m, pagePath) {
  const g = m.GUIDES[pagePath];
  const hub =
    pagePath === m.TAG_HUB_PATH
      ? `<nav class="ftg-copy" aria-label="Tag sets"><h2 class="policy-title">Tags by artist</h2>${linkRow(
          Object.entries(m.ARTISTS).map(([s, x]) => [m.tagSetPath(s), x.name])
        )}<h2 class="policy-title">Tags by style</h2>${linkRow(
          Object.entries(m.STYLES).map(([s, x]) => [m.tagSetPath(s), x.name])
        )}</nav>`
      : "";
  return shell(
    `<p class="smb-eyebrow">SendMyBeat guides</p><h1 class="policy-title ftg-h1">${esc(g.h1)}</h1>` +
      `<p class="policy-muted ftg-lede">${esc(g.lede)}</p>${hub}` +
      `<section class="ftg-copy">${sections(g.sections)}</section>` +
      `<section class="ftg-cta policy-feature-card"><h2 class="policy-title">Try it on your next beat</h2><p>Run the tag generator once for free, no account. Sign up for 3 free generations and 3 uploads, no card needed.</p><p>${a(
        "/free-tag-generator",
        "Free tag generator",
        "smb-btn smb-btn--pri smb-btn--lg"
      )}</p></section>` +
      footer(m)
  );
}

function tagSetBody(m, slug, year) {
  const p = m.tagSetPage(slug);
  const tags = m.tagsFor(slug, year);
  const others = Object.entries(m.TAG_SETS).filter(([s, x]) => s !== slug && x.kind === p.kind && !p.related.includes(s));
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

function setTag(html, re, replacement) {
  if (re.test(html)) return html.replace(re, replacement);
  return html.replace("</head>", `${replacement}</head>`);
}

function renderPage(m, template, pagePath, year) {
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
  else if (m.GUIDES[pagePath]) body = guideBody(m, pagePath);
  else if (pagePath.startsWith(`${m.TAG_HUB_PATH}/`)) body = tagSetBody(m, pagePath.slice(m.TAG_HUB_PATH.length + 1), year);
  if (body) {
    if (!/<div id="root"><\/div>/.test(html)) throw new Error('build/index.html has no empty <div id="root"></div> to fill');
    html = html.replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`);
  }
  return html;
}

async function main() {
  const m = await loadModel();
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
  fs.writeFileSync(path.join(BUILD, "sitemap.xml"), xml);

  let count = 0;
  m.PUBLIC_PATHS.forEach((p) => {
    if (p === "/") return; // index.html already carries the homepage's tags
    const out = path.join(BUILD, p.slice(1), "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderPage(m, template, p, year));
    count += 1;
  });
  console.log(`prerendered ${count} pages, sitemap.xml: ${m.PUBLIC_PATHS.length} pages`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { renderPage, sitemap, loadModel };
