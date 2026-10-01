import { describe, expect, it } from "vitest";
import {
  BF_THRESHOLDS,
  bullfinchRoute,
  isBfRoute,
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
      noSocialWebsiteClarity: 75,
      noSocialBrandStory: 75,
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

  it("routes polish when overall is at least 75 and the site is not thin", () => {
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 82,
          brandStory: 70,
          overall: 75,
          socialHandlesProvided: true,
        }),
      ),
    ).toBe("polish");
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 82,
          brandStory: 70,
          overall: 74,
          socialHandlesProvided: true,
        }),
      ),
    ).toBe("talk");
  });

  it("routes polish when no social handles were provided and the site scores are both at least 75", () => {
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 95,
          brandStory: 95,
          overall: 60,
          socialHandlesProvided: false,
        }),
      ),
    ).toBe("polish");
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 75,
          brandStory: 75,
          overall: 60,
          socialHandlesProvided: false,
        }),
      ),
    ).toBe("polish");
  });

  it("does not use the no-handles polish rule when a handle was entered or a site score is below 75", () => {
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 95,
          brandStory: 95,
          overall: 60,
          socialHandlesProvided: true,
        }),
      ),
    ).toBe("talk");
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 74,
          brandStory: 95,
          overall: 60,
          socialHandlesProvided: false,
        }),
      ),
    ).toBe("talk");
    expect(
      bullfinchRoute(
        scores({
          websiteClarity: 95,
          brandStory: 74,
          overall: 60,
          socialHandlesProvided: false,
        }),
      ),
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
