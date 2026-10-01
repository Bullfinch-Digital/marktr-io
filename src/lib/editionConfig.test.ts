import { describe, expect, it } from "vitest";
import { editionConfig } from "./editionConfig";

describe("editionConfig", () => {
  it("keeps marktr GA4 and sets the Bullfinch measurement ID", () => {
    expect(editionConfig.marktr.ga4Id).toBe("G-0EFXQPEYY6");
    expect(editionConfig.bullfinch.ga4Id).toBe("G-0TEERX8V1N");
  });

  it("uses after-results capture and hides marktr chrome for Bullfinch", () => {
    expect(editionConfig.bullfinch.captureTiming).toBe("after-results");
    expect(editionConfig.bullfinch.showBackToHome).toBe(false);
    expect(editionConfig.bullfinch.showStoryLinks).toBe(false);
    expect(editionConfig.bullfinch.privacyUrl).toBe("https://bullfinchdigital.com/privacy/");
  });

  it("keeps document titles and the Instagram placeholder in editionConfig", () => {
    expect(editionConfig.marktr.titles.healthCheck).toBe("Digital Health Check | marktr");
    expect(editionConfig.bullfinch.titles.healthCheck).toBe(
      "Free Marketing Health Check | Bullfinch Digital",
    );
    expect(editionConfig.bullfinch.titles.healthCheckReport).toBe(
      "Your Marketing Health Check | Bullfinch Digital",
    );
    expect(editionConfig.marktr.titles.reportEyebrow).toBe("Your Digital Health Report");
    expect(editionConfig.bullfinch.titles.reportEyebrow).toBe("Your Marketing Health Check");
    expect(editionConfig.marktr.placeholders.instagramHandle).toBe("marktr.io (or @marktr.io)");
    expect(editionConfig.bullfinch.placeholders.instagramHandle).toBe(
      "yourbusiness (or @yourbusiness)",
    );
    expect(editionConfig.marktr.scoreBands).toEqual({ high: 70, mid: 40 });
    expect(editionConfig.bullfinch.scoreBands).toEqual({ high: 75, mid: 50 });
  });
});
