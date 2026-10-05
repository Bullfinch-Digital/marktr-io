import { describe, expect, it } from "vitest";
import { parsePillarFindings } from "../../supabase/functions/_shared/pillarFindings";

describe("pillar findings", () => {
  it("keeps a specific observation and next step, and accepts the older finding field", () => {
    const parsed = parsePillarFindings(
      JSON.stringify({
        findings: [
          {
            dimension: "Website Clarity",
            score: 62,
            observation: "The homepage headline talks about quality without saying who it is for.",
            next_step: "Rewrite the headline so a new customer can tell it is for them.",
          },
          {
            dimension: "Brand Story",
            score: 48,
            finding: "The about page names the founder but not the customer.",
          },
        ],
        strengths: ["Clear photography"],
        gaps: ["Headline"],
      }),
    );
    expect(parsed?.findings[0]).toMatchObject({
      observation: "The homepage headline talks about quality without saying who it is for.",
      nextStep: "Rewrite the headline so a new customer can tell it is for them.",
      finding: "The homepage headline talks about quality without saying who it is for.",
    });
    expect(parsed?.findings[1].observation).toBe(
      "The about page names the founder but not the customer.",
    );
    expect(parsed?.findings[1].nextStep).toBe("");
  });
});
