import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// The site is one HTML file, so without this every page shares the homepage's title,
// description and canonical link, and search engines treat /about, /spotlight and the
// rest as copies of the homepage. This gives each public page its own, and keeps
// private pages (dashboard, admin, unknown paths) out of search results.
const SITE = "https://www.sendmybeat.com";
const HOME_TITLE = "SendMyBeat: tags, video and upload for type-beat producers";
const HOME_DESCRIPTION =
  "SendMyBeat turns a finished beat into a YouTube upload: tags that rank, a description, a visualizer video and the upload itself. Try it free for 3 days.";

export const PUBLIC_PAGES = {
  "/": { title: HOME_TITLE, description: HOME_DESCRIPTION },
  "/spotlight": {
    title: "Producer Spotlight: trending type-beat producers | SendMyBeat",
    description: "See which beat producers are trending on SendMyBeat this week, who's new, and who's featured.",
  },
  "/about": {
    title: "About SendMyBeat: YouTube tools for beat producers",
    description: "Why SendMyBeat exists and what it does: YouTube tags, descriptions, visualizer videos and uploads for type-beat producers.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | SendMyBeat",
    description: "How SendMyBeat collects, uses and protects your data.",
  },
  "/terms": {
    title: "Terms and Conditions | SendMyBeat",
    description: "The terms for using SendMyBeat.",
  },
};

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
  } else {
    document.title = HOME_TITLE;
    setMeta("name", "robots", "noindex, follow");
    setCanonical(null);
  }
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    applyRouteMeta(pathname);
  }, [pathname]);
  return null;
}
