import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as client from "./bullfinchRouting";
import * as edge from "../../supabase/functions/_shared/bullfinchRouting.ts";

const FIXTURES: client.BullfinchRouteScores[] = [
  { websiteClarity: 82, brandStory: 62, overall: 58 },
  { websiteClarity: 88, brandStory: 80, overall: 81 },
  { websiteClarity: 18, brandStory: 12, overall: 22 },
  { websiteClarity: 39, brandStory: 40, overall: 40 },
  { websiteClarity: 40, brandStory: 39, overall: 40 },
  { websiteClarity: 10, brandStory: 12, overall: 80 },
  { websiteClarity: 62, brandStory: 48, overall: 74 },
  { websiteClarity: 62, brandStory: 48, overall: 75 },
  { websiteClarity: 95, brandStory: 95, overall: 60 },
  { websiteClarity: 75, brandStory: 75, overall: 60 },
];

describe("bullfinchRoute parity (client module vs edge function)", () => {
  it("returns the same route for each fixture on both import paths", () => {
    for (const fixture of FIXTURES) {
      expect(client.bullfinchRoute(fixture)).toBe(edge.bullfinchRoute(fixture));
    }
  });

  it("keeps identical thresholds on both import paths", () => {
    expect(client.BF_THRESHOLDS).toEqual(edge.BF_THRESHOLDS);
  });

  it("has score-website persist the shared route and the report view never recalculate it", () => {
    const persist = readFileSync(
      path.join(process.cwd(), "supabase/functions/score-website/persistReport.ts"),
      "utf8",
    );
    expect(persist).toMatch(/from "\.\.\/_shared\/bullfinchRouting\.ts"/);
    expect(persist).toMatch(/bullfinchRoute\(/);
    expect(persist).toMatch(/bf_route:/);

    const view = readFileSync(
      path.join(process.cwd(), "src/components/healthCheck/HealthCheckReportView.tsx"),
      "utf8",
    );
    expect(view).not.toMatch(/bullfinchRoute\(/);
  });
});
