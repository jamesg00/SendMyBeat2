import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as api from "@/app/api";
import { TAG_CHAR_LIMIT, TagEditor, tagChars } from "@/app/editors";

jest.mock("@/app/api");

const run = {
  id: "r1",
  query: "capoxxo",
  tags: ["capoxxo type beat", "plugg", "dreamcache type beat"],
  scored_tags: [
    { tag: "capoxxo type beat", score: 87, reason: "Searched a lot.", signals: { demand: "high", competition: "low" } },
    { tag: "plugg", score: 41, signals: { demand: "low", competition: "high" } },
    { tag: "dreamcache type beat", score: 79, signals: { demand: "high", competition: "medium" } },
  ],
};

describe("tagChars", () => {
  it("counts commas between tags and quotes around tags with spaces, like YouTube", () => {
    expect(tagChars([])).toBe(0);
    expect(tagChars(["plugg"])).toBe(5);
    // "type beat" (9 + 2 quotes) + comma + plugg (5)
    expect(tagChars(["type beat", "plugg"])).toBe(17);
  });
});

describe("TagEditor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the run, its tags with scores and the YouTube limit", () => {
    render(<TagEditor run={run} onSaved={() => {}} />);
    expect(screen.getByText("capoxxo")).toBeInTheDocument();
    expect(screen.getByText("3 tags")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText(`${tagChars(run.tags)} / ${TAG_CHAR_LIMIT}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save tags" })).toBeDisabled();
  });

  it("removes a tag, then saves the run with what was removed", async () => {
    const saved = { ...run, tags: ["capoxxo type beat", "dreamcache type beat"] };
    api.updateTags.mockResolvedValue(saved);
    const onSaved = jest.fn();
    render(<TagEditor run={run} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove tag plugg" }));
    expect(screen.getByText("2 tags · 1 removed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save tags" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(api.updateTags).toHaveBeenCalledWith("r1", ["capoxxo type beat", "dreamcache type beat"], ["plugg"], []);
    expect(screen.getByText("Tags saved ✓")).toBeInTheDocument();
  });

  it("adds typed tags, skipping duplicates", () => {
    render(<TagEditor run={run} onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText("Add tags"), { target: { value: "PLUGG, rage beat" } });
    fireEvent.submit(screen.getByLabelText("Add tags").closest("form"));
    expect(screen.getByText("4 tags · 1 added")).toBeInTheDocument();
    expect(screen.getByText("+ rage beat")).toBeInTheDocument();
  });

  it("doesn't add tags that would pass YouTube's limit", () => {
    render(<TagEditor run={run} onSaved={() => {}} />);
    fireEvent.change(screen.getByLabelText("Add tags"), { target: { value: "x".repeat(TAG_CHAR_LIMIT) } });
    fireEvent.submit(screen.getByLabelText("Add tags").closest("form"));
    expect(screen.getByText("3 tags")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("doesn’t fit in YouTube’s 500 characters");
  });

  it("opens a tag's details and ranks tags best first", () => {
    render(<TagEditor run={run} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /^capoxxo type beat, score 87/ }));
    expect(screen.getByRole("dialog", { name: "Tag details" })).toBeInTheDocument();
    expect(screen.getByText("#1 IN THIS RUN")).toBeInTheDocument();
    expect(screen.getByText("Strong tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    fireEvent.click(screen.getByRole("tab", { name: "Ranking" }));
    const rows = screen.getAllByText(/type beat$|^plugg$/).map((el) => el.textContent);
    expect(rows).toEqual(["capoxxo type beat", "dreamcache type beat", "plugg"]);
  });
});
