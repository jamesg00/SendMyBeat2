import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PUBLIC_PATHS, SITE, STATIC_PAGES, jsonLdFor, publicPage } from "@/lib/seoModel";

// The site is one HTML file, so without this every page shares the homepage's title,
// description and canonical link, and search engines treat /about, /spotlight and the
// rest as copies of the homepage. This gives each public page its own, and keeps
// private pages (dashboard, admin, unknown paths) out of search results.
// scripts/prerender-seo.js writes the same tags into each page's HTML at build time.
const HOME_TITLE = STATIC_PAGES["/"].title;
const YEAR = new Date().getFullYear();

export const PUBLIC_PAGES = Object.fromEntries(PUBLIC_PATHS.map((path) => [path, publicPage(path, YEAR)]));

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Page-level structured data is marked data-route-ld, so it's swapped on each navigation
// and never mixes with the site-wide block in index.html.
function setJsonLd(blocks) {
  document.head.querySelectorAll("script[data-route-ld]").forEach((el) => el.remove());
  blocks.forEach((block) => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-route-ld", "");
    el.textContent = JSON.stringify(block);
    document.head.appendChild(el);
  });
}

export function applyRouteMeta(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const page = PUBLIC_PAGES[path];
  if (page) {
    const url = `${SITE}${path === "/" ? "/" : path}`;
    document.title = page.title;
    setMeta("name", "description", page.description);
    setMeta("name", "robots", "index, follow");
    setMeta("property", "og:title", page.title);
    setMeta("property", "og:description", page.description);
    setMeta("property", "og:url", url);
    setMeta("property", "twitter:title", page.title);
    setMeta("property", "twitter:description", page.description);
    setMeta("property", "twitter:url", url);
    setCanonical(url);
    setJsonLd(jsonLdFor(path, YEAR));
  } else {
    document.title = HOME_TITLE;
    setMeta("name", "robots", "noindex, follow");
    setCanonical(null);
    setJsonLd([]);
  }
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    applyRouteMeta(pathname);
  }, [pathname]);
  return null;
}
