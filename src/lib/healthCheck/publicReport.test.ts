import { describe, expect, it } from "vitest";
import {
  healthCheckReportFixtureInput,
  healthCheckReportFixtureScores,
} from "../../test/fixtures/healthCheckReport";
import { mapPublicHealthCheckReport } from "./publicReport";

describe("mapPublicHealthCheckReport", () => {
  it("maps a saved report snapshot onto HealthCheckReportView props", () => {
    const mapped = mapPublicHealthCheckReport({
      public_token: "tok",
      url: "https://confires.co.uk",
      overall: 45,
      scores: {
        ...healthCheckReportFixtureScores,
        websiteScore: healthCheckReportFixtureInput.websiteScore,
        inputs: {
          websiteUrl: "https://confires.co.uk",
          instagramHandle: "confires",
          facebookUrl: "",
        },
      },
    });
    expect(mapped).not.toBeNull();
    expect(mapped?.scores.overall).toBe(45);
    expect(mapped?.input.websiteUrl).toBe("https://confires.co.uk");
    expect(mapped?.input.instagramHandle).toBe("confires");
    expect(mapped?.scores.websiteClarity.name).toBe("Website Clarity");
  });

  it("returns null when scores are missing", () => {
    expect(mapPublicHealthCheckReport({ public_token: "tok", url: "https://x.com" })).toBeNull();
    expect(mapPublicHealthCheckReport(null)).toBeNull();
  });
});
