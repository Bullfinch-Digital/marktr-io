import { describe, expect, it } from "vitest";
import { labeledStoryAnswers, padStoryAnswers } from "./brandStoryAnswers";

describe("brandStoryAnswers", () => {
  it("pads stored answers to seven slots", () => {
    expect(padStoryAnswers(["a", "", "c"])).toEqual(["a", "", "c", "", "", "", ""]);
  });

  it("sends only answered questions, labeled by index", () => {
    expect(labeledStoryAnswers(["What we do", "", "", "Best customer"])).toEqual([
      { question: 1, text: "What we do" },
      { question: 4, text: "Best customer" },
    ]);
  });
});
