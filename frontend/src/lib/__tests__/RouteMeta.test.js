import { applyRouteMeta } from "@/lib/RouteMeta";

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
});
