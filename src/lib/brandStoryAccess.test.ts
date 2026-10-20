import { describe, expect, it } from "vitest";
import { formatVisibleBrandStory, storyForViewer } from "./brandStoryAccess";
import type { BrandStoryOutput } from "./brandStory";

const story: BrandStoryOutput = {
  foundingStory: "We started in a kitchen.",
  pointOfView: "Coffee should be neighbourly.",
  positioningStatement: "For people who want a local cup.",
  brandPurpose: "Make the high street feel like home.",
  findings: [
    { title: "Say who it is for", recommendation: "Name the regulars in the first line." },
  ],
};

describe("brand story access", () => {
  it("keeps the full story for people with access", () => {
    const text = formatVisibleBrandStory(story, true);
    expect(text).toContain("Coffee should be neighbourly.");
    expect(text).toContain("Name the regulars in the first line.");
    expect(storyForViewer(story, true)).toBe(story);
  });

  it("exports only the founding story and locked titles", () => {
    const text = formatVisibleBrandStory(story, false);
    expect(text).toContain("FOUNDING STORY");
    expect(text).toContain("We started in a kitchen.");
    expect(text).toContain("YOUR POINT OF VIEW");
    expect(text).toContain("POSITIONING STATEMENT");
    expect(text).toContain("YOUR PURPOSE");
    expect(text).toContain("Where your story can go further");
    expect(text).toContain("Locked");
    expect(text).not.toContain("Coffee should be neighbourly.");
    expect(text).not.toContain("For people who want a local cup.");
    expect(text).not.toContain("Make the high street feel like home.");
    expect(text).not.toContain("Say who it is for");
    expect(text).not.toContain("Name the regulars");
  });

  it("does not copy locked section text into the taster object", () => {
    const visible = storyForViewer(story, false);
    expect(visible.foundingStory).toBe("We started in a kitchen.");
    expect(visible.pointOfView).toBe("");
    expect(visible.positioningStatement).toBe("");
    expect(visible.brandPurpose).toBe("");
    expect(visible.findings).toEqual([]);
    expect(JSON.stringify(visible)).not.toContain("neighbourly");
  });
});
