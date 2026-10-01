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
      bf_route: "talk",
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
    expect(mapped?.bfRoute).toBe("talk");
    expect(mapped?.publicToken).toBe("tok");
  });

  it("does not invent a route when bf_route is missing or invalid", () => {
    const mapped = mapPublicHealthCheckReport({
      public_token: "tok",
      url: "https://confires.co.uk",
      overall: 45,
      bf_route: "nope",
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
    expect(mapped?.bfRoute).toBeNull();
  });

  it("returns null when scores are missing", () => {
    expect(mapPublicHealthCheckReport({ public_token: "tok", url: "https://x.com" })).toBeNull();
    expect(mapPublicHealthCheckReport(null)).toBeNull();
  });
});
