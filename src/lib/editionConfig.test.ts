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
});
