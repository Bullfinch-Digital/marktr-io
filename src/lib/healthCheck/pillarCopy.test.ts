import { describe, expect, it } from "vitest";
import { DIMENSION_CAP_FRAMING_COPY } from "./constants";
import { resolvePillarCopy } from "./pillarCopy";

describe("resolvePillarCopy", () => {
  it("keeps a high score observation and next step from the scorer", () => {
    const resolved = resolvePillarCopy({
      pillar: "Brand Story",
      score: 95,
      scoreRaw: 100,
      dimensionCapped: true,
      modelObservation: "The about page says the park is family-run.",
      modelNextStep: "Use that line on the gallery page too.",
      bandMeaning: "band meaning",
      bandAction: "band action",
    });
    expect(resolved.observation).toBe("The about page says the park is family-run.");
    expect(resolved.nextStep).toBe("Use that line on the gallery page too.");
    expect(resolved.fallbacks).toEqual([]);
  });

  it("uses the cap line only when a high score has no specific observation", () => {
    const resolved = resolvePillarCopy({
      pillar: "Brand Story",
      score: 95,
      scoreRaw: 100,
      modelObservation: "Analysis complete",
      bandMeaning: "band meaning",
      bandAction: "Make sure the main thing you want visitors to do — book, call or enquire — is the first button they see.",
    });
    expect(resolved.observation).toBe(DIMENSION_CAP_FRAMING_COPY);
    expect(resolved.nextStep).toContain("first button");
    expect(resolved.fallbacks.map((item) => item.reason)).toEqual([
      "high score had no specific observation",
      "no specific next step",
    ]);
  });

  it("uses the plain band line when a lower score has no specific observation", () => {
    const resolved = resolvePillarCopy({
      pillar: "Website Clarity",
      score: 62,
      scoreRaw: 62,
      modelObservation: "",
      bandMeaning: "The site explains the basics.",
      bandAction: "Rewrite the homepage headline.",
    });
    expect(resolved.observation).toBe("The site explains the basics.");
    expect(resolved.fallbacks[0]?.reason).toBe("no specific observation");
  });
});
