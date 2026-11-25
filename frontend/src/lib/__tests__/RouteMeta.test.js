import fs from "fs";
import path from "path";
import { applyRouteMeta, PUBLIC_PAGES } from "@/lib/RouteMeta";
import { SEO_PATHS } from "@/lib/seoPages";

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
    ["/free-tag-generator", ...SEO_PATHS].forEach((p) => {
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
});
