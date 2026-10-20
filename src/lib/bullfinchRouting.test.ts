import { describe, expect, it } from "vitest";
import { absentApifyMetrics, absentHealthCheckFacts, buildHealthCheckRun } from "./healthCheck";
import {
  BF_THRESHOLDS,
  bullfinchRoute,
  isBfRoute,
  routePillarsChecked,
  type BullfinchRouteScores,
} from "./bullfinchRouting";

function scores(partial: Partial<BullfinchRouteScores>): BullfinchRouteScores {
  return {
    websiteClarity: 62,
    brandStory: 48,
    overall: 45,
    ...partial,
  };
}

describe("bullfinchRoute", () => {
  it("keeps the published thresholds", () => {
    expect(BF_THRESHOLDS).toEqual({
      diyWebsiteClarity: 40,
      diyBrandStory: 40,
      strongScore: 75,
    });
  });

  it("routes diy only when Website Clarity and Brand Story are both below 40", () => {
    expect(
      bullfinchRoute(scores({ websiteClarity: 39, brandStory: 39, overall: 20 })),
    ).toBe("diy");
    expect(
      bullfinchRoute(scores({ websiteClarity: 0, brandStory: 0, overall: 0 })),
    ).toBe("diy");
  });

  it("does not route diy when only one of Website Clarity or Brand Story is thin", () => {
    expect(
      bullfinchRoute(scores({ websiteClarity: 39, brandStory: 40, overall: 40 })),
    ).toBe("talk");
    expect(
      bullfinchRoute(scores({ websiteClarity: 40, brandStory: 39, overall: 40 })),
    ).toBe("talk");
  });

  it("never routes diy because Social or Content are low", () => {
    const withZeroSocialAndContent = {
      websiteClarity: 62,
      brandStory: 48,
      overall: 45,
      social: 0,
      content: 0,
    };
    expect(bullfinchRoute(withZeroSocialAndContent)).toBe("talk");
    expect(
      bullfinchRoute({
        websiteClarity: 88,
        brandStory: 80,
        overall: 81,
      }),
    ).toBe("polish");
  });

  it("routes polish only when overall is at least 75", () => {
    expect(
      bullfinchRoute(scores({ websiteClarity: 82, brandStory: 70, overall: 75 })),
    ).toBe("polish");
    expect(
      bullfinchRoute(scores({ websiteClarity: 82, brandStory: 70, overall: 74 })),
    ).toBe("talk");
  });

  it("routes a strong site with no social handles to talk even when the shown overall is 92", () => {
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 95,
          brandStory: 95,
          overall: 92,
          contentChecked: false,
          socialChecked: false,
        }),
      ),
    ).toBe("talk");
    expect(
      bullfinchRoute(scores({ websiteClarity: 95, brandStory: 95, overall: 92 })),
    ).toBe("polish");
  });

  it("counts a content 0 and routes talk for greencaravanpark.co.uk with no handles", () => {
    const metrics = absentApifyMetrics();
    const run = buildHealthCheckRun({
      facts: {
        ...absentHealthCheckFacts(),
        valueProp: "clear",
        namesCustomer: "clear",
        usesSecondPerson: true,
        primaryCTA: "competing",
        proofOnPage: "real",
        pathToBuyContact: "clear",
        founderStory: "present",
        storySpecific: "specific",
        storyNamesConcrete: true,
        pointOfView: "distinct",
        valuesMission: "concrete",
      },
      apifyMetrics: metrics,
      modelVersion: "test",
      inputs: {
        websiteUrl: "https://greencaravanpark.co.uk",
        instagramHandle: "",
        facebookUrl: "",
        domain: "greencaravanpark.co.uk",
      },
    });
    expect(run.scores.websiteClarity).toBe(90);
    expect(run.scores.brandStory).toBe(100);
    expect(run.scores.contentConsistency).toBe(0);
    // Website 0.30, story 0.30, content 0.25; social excluded. 57 / 0.85 = 67.
    expect(run.scores.overallRaw).toBe(67);
    expect(run.scores.overall).toBe(67);
    const checked = routePillarsChecked({ ...metrics, websiteAssessed: true });
    expect(checked).toEqual({ contentChecked: true, socialChecked: false });
    expect(
      bullfinchRoute({
        websiteClarity: run.scores.websiteClarity,
        brandStory: run.scores.brandStory,
        overall: run.scores.overall,
        ...checked,
      }),
    ).toBe("talk");
  });

  it("prefers diy over polish when the site itself is too thin", () => {
    expect(
      bullfinchRoute(scores({ websiteClarity: 10, brandStory: 12, overall: 80 })),
    ).toBe("diy");
  });

  it("routes talk for the remaining cases", () => {
    expect(bullfinchRoute(scores({ websiteClarity: 82, brandStory: 62, overall: 58 }))).toBe(
      "talk",
    );
  });

  it("narrows stored route strings", () => {
    expect(isBfRoute("talk")).toBe(true);
    expect(isBfRoute("polish")).toBe(true);
    expect(isBfRoute("diy")).toBe(true);
    expect(isBfRoute("marktr")).toBe(false);
    expect(isBfRoute(null)).toBe(false);
  });
});
