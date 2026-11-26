import { TOOL_PAGES, TOOL_PATHS, jsonLdFor, publicPage, youtubeTagChars } from "@/lib/seoModel";
import {
  analyzeTags,
  beatDescription,
  beatHashtags,
  buildDescription,
  countHashtags,
  pyRound,
  scoreTitle,
  scoreTone,
  splitArtists,
  suggestTitles,
  tagListChars,
  trimToFit,
  typeBeatTitles,
  verdictFor,
} from "@/lib/seoTools";

describe("tool pages", () => {
  it("are public pages with an app, breadcrumb and FAQ in their structured data", () => {
    TOOL_PATHS.forEach((p) => {
      expect(publicPage(p, 2026).title).not.toMatch(/\{year\}/);
      expect(jsonLdFor(p, 2026).map((b) => b["@type"])).toEqual(["WebApplication", "BreadcrumbList", "FAQPage"]);
      expect(TOOL_PAGES[p].faq.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("tag counter", () => {
  it("counts the way YouTube does, quote marks included", () => {
    const tags = ["drake type beat", "drake", "dark r&b type beat"];
    expect(tagListChars(tags)).toBe(youtubeTagChars(tags));
    expect(tagListChars(["drake type beat"])).toBe(17);
  });

  it("finds repeats and over-long tags and drops < and >", () => {
    const report = analyzeTags(`drake type beat, "Drake Type Beat", <free> beat, ${"x".repeat(101)}`);
    expect(report.duplicates).toEqual(["Drake Type Beat"]);
    expect(report.tooLong).toHaveLength(1);
    expect(report.rows[2].tag).toBe("free beat");
  });

  it("trims a list to fit in order", () => {
    const { kept, dropped } = trimToFit(Array.from({ length: 60 }, (_, i) => `drake type beat ${i}`));
    expect(tagListChars(kept)).toBeLessThanOrEqual(500);
    expect(kept[0]).toBe("drake type beat 0");
    expect(kept.length + dropped.length).toBe(60);
  });
});

describe("titles", () => {
  it("match the app's formats and scores (tag_titles.py)", () => {
    const titles = suggestTitles({
      artist: "drake",
      scoredTags: [
        { tag: "drake type beat", score: 90 },
        { tag: "drake x future type beat", score: 80 },
        { tag: "future type beat", score: 70 },
        { tag: "dark r&b", score: 60 },
        { tag: "drake type beat 2026", score: 75 },
      ],
      beatName: "midnight",
      year: 2026,
    });
    expect(titles[0]).toMatchObject({ title: 'Drake Type Beat 2026 - "MIDNIGHT"', coverage: 165, score: 80 });
    expect(titles.map((t) => t.title)).toContain('Drake x Future Type Beat - "MIDNIGHT"');
    expect(scoreTitle("[FREE] drake beat <x>", { artist: "drake" }).score).toBe(19);
  });

  it("build type beat titles from what a visitor types", () => {
    const titles = typeBeatTitles({ artists: "Drake x Future", beatName: "Midnight", style: "dark r&b", bpm: "140", free: true, year: 2026 });
    expect(titles.length).toBe(8);
    titles.forEach((t) => {
      expect(t.title.startsWith("[FREE] Drake")).toBe(true);
      expect(t.length).toBeLessThanOrEqual(100);
    });
    expect(titles.map((t) => t.title)).toContain('[FREE] Drake Type Beat 2026 - "MIDNIGHT" | Dark R&B Instrumental');
    expect(typeBeatTitles({ artists: "" })).toEqual([]);
  });

  it("split collabs", () => {
    expect(splitArtists("Drake x Future, 21 Savage & Metro")).toEqual(["drake", "future", "21 savage", "metro"]);
  });
});

describe("descriptions and hashtags", () => {
  it("match the app's builder (description_builder.py)", () => {
    const { content, hashtags } = buildDescription({
      artist: "Drake",
      beatName: "midnight",
      tags: ["drake type beat 2026", "dark r&b type beat"],
      topKeyword: "dark r&b",
      buyLink: "https://x.example/b",
      bpm: 140.5,
      key: "C minor",
    });
    expect(content.split("\n")[0]).toBe('Drake type beat | drake type beat 2026 | dark r&b type beat - "MIDNIGHT"');
    expect(content).toContain("BPM: 140 | Key: C minor");
    expect(hashtags[0]).toBe("#draketypebeat");
  });

  it("write a description with credits, terms and contact", () => {
    const { content } = beatDescription({ artist: "drake", producer: "Kay", instagram: "kay", free: true, year: 2026 });
    expect(content).toContain("Prod. by Kay");
    expect(content).toContain("Free for profit");
    expect(content).toContain("Instagram: @kay");
  });

  it("pick 3 to 5 hashtags and warn past 15", () => {
    const result = beatHashtags({ artists: "Drake", style: "dark r&b", existing: "#a ".repeat(12) });
    expect(result.hashtags.length).toBeGreaterThanOrEqual(3);
    expect(result.hashtags.length).toBeLessThanOrEqual(5);
    expect(result.over).toBe(true);
    expect(countHashtags("#a #b##c x#d")).toBe(2);
  });
});

describe("tag scores", () => {
  it("use the logged-in tool's colours and words", () => {
    expect([30, 45, 60, 0].map(scoreTone)).toEqual(["weak", "ok", "good", ""]);
    expect(verdictFor(80)).toBe("Strong tag");
    expect(pyRound(62.5)).toBe(62);
  });
});
