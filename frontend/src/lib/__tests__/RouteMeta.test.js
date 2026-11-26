import fs from "fs";
import path from "path";
import { applyRouteMeta, PUBLIC_PAGES } from "@/lib/RouteMeta";
import { SEO_PATHS } from "@/lib/seoPages";
import { PUBLIC_PATHS, TAG_SETS, TAG_SET_SLUGS, tagSetPath, tagsFor, youtubeTagChars } from "@/lib/seoModel";

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");
const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content");

describe("applyRouteMeta", () => {
  it("gives a public page its own title and canonical", () => {
    applyRouteMeta("/about");
    expect(document.title).toMatch(/About SendMyBeat/);
    expect(canonical()).toBe("https://www.sendmybeat.com/about");
    expect(robots()).toBe("index, follow");
  });

  it("points the homepage canonical at the root", () => {
    applyRouteMeta("/");
    expect(canonical()).toBe("https://www.sendmybeat.com/");
  });

  it("keeps private and unknown pages out of search", () => {
    applyRouteMeta("/dashboard");
    expect(robots()).toBe("noindex, follow");
    expect(canonical()).toBeUndefined();
    applyRouteMeta("/no-such-page");
    expect(robots()).toBe("noindex, follow");
  });

  it("indexes the free tag page and every search page, and lists them in the sitemap", () => {
    const sitemap = fs.readFileSync(path.join(__dirname, "../../../public/sitemap.xml"), "utf8");
    ["/free-tag-generator", ...SEO_PATHS, ...TAG_SET_SLUGS.map(tagSetPath)].forEach((p) => {
      applyRouteMeta(p);
      expect(robots()).toBe("index, follow");
      expect(canonical()).toBe(`https://www.sendmybeat.com${p}`);
      expect(sitemap).toContain(`<loc>https://www.sendmybeat.com${p}</loc>`);
    });
  });

  it("gives every public page a different title", () => {
    const titles = Object.values(PUBLIC_PAGES).map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("lists every public page in the sitemap exactly once", () => {
    const sitemap = fs.readFileSync(path.join(__dirname, "../../../public/sitemap.xml"), "utf8");
    PUBLIC_PATHS.forEach((p) => {
      const loc = `<loc>https://www.sendmybeat.com${p}</loc>`;
      expect(sitemap.split(loc).length - 1).toBe(1);
    });
  });

  it("adds structured data to the free tag page and swaps it on navigation", () => {
    const ld = () => [...document.head.querySelectorAll("script[data-route-ld]")].map((el) => JSON.parse(el.textContent)["@type"]);
    applyRouteMeta("/free-tag-generator");
    expect(ld()).toEqual(expect.arrayContaining(["WebApplication", "FAQPage", "BreadcrumbList"]));
    applyRouteMeta("/type-beat-tags/drake");
    expect(ld()).toEqual(["BreadcrumbList", "FAQPage"]);
    applyRouteMeta("/dashboard");
    expect(ld()).toEqual([]);
  });

  it("keeps unknown tag set pages out of search", () => {
    applyRouteMeta("/type-beat-tags/not-an-artist");
    expect(robots()).toBe("noindex, follow");
  });
});

describe("tag sets", () => {
  it("fit YouTube's 500-character tag limit with no repeats", () => {
    TAG_SET_SLUGS.forEach((slug) => {
      const tags = tagsFor(slug, 2026);
      expect(tags.length).toBeGreaterThanOrEqual(10);
      expect(youtubeTagChars(tags)).toBeLessThanOrEqual(500);
      expect(new Set(tags).size).toBe(tags.length);
      expect(tags[0]).toBe(`${TAG_SETS[slug].name.toLowerCase()} type beat`);
    });
  });

  it("only link to tag sets that exist", () => {
    TAG_SET_SLUGS.forEach((slug) => {
      (TAG_SETS[slug].related || []).forEach((r) => expect(TAG_SETS[r]).toBeDefined());
    });
  });
});
