import { describe, expect, it } from "vitest";
import {
  findingsQualityIssues,
  mergePillarFindings,
  parsePillarFindings,
  polishPillarFindings,
  polishWebsiteBullets,
} from "../../supabase/functions/_shared/pillarFindings";
import { getDataSourceLabel } from "../components/healthCheck/HealthCheckReportView";

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

  it("drops off-pillar bullets, repeats, banned words, and a maintain step on a high score", () => {
    const polished = polishPillarFindings({
      findings: [
        {
          dimension: "Website Clarity",
          score: 62,
          observation: "The homepage headline says 'Marketing that works' and never names who it is for.",
          nextStep: "Enhance the clarity of the primary CTA.",
          finding: "The homepage headline says 'Marketing that works' and never names who it is for.",
        },
        {
          dimension: "Brand Story",
          score: 100,
          observation: "The About page tells how the founder started with one cabin.",
          nextStep: "Maintain this strong story.",
          finding: "The About page tells how the founder started with one cabin.",
        },
      ],
      strengths: [
        "The homepage headline says 'Marketing that works'",
        "Clear product photography above the fold",
        "Instagram posting is regular",
        "A second unused website point",
      ],
      gaps: ["The homepage never names who it is for", "The bio does not mention the story"],
    });
    expect(polished.findings[0].observation).toContain("homepage headline");
    expect(polished.findings[0].nextStep).toBe("");
    expect(polished.findings[1].observation).toContain("About page");
    expect(polished.findings[1].nextStep).toBe("");
    expect(polished.strengths).toEqual([
      "Clear product photography above the fold",
      "A second unused website point",
    ]);
    expect(polished.gaps).toEqual([]);
    expect(polishWebsiteBullets("Headline", ["One", "Two", "Three"])).toEqual(["One", "Two"]);
    const content = polishPillarFindings({
      findings: [
        {
          dimension: "Content Consistency",
          score: 75,
          observation: "The homepage mentions artisan building but the theme is uneven.",
          nextStep: "Post more often so people stay engaged.",
          finding: "The homepage mentions artisan building but the theme is uneven.",
        },
      ],
      strengths: [],
      gaps: [],
    });
    expect(content.findings[0].observation).toBe("");
    expect(content.findings[0].nextStep).toBe("");
  });

  it("asks for a retry when a banned word or a missing pillar is present", () => {
    const issues = findingsQualityIssues(
      {
        findings: [
          {
            dimension: "Website Clarity",
            score: 90,
            observation: "Fine homepage.",
            nextStep: "Maintain the homepage.",
            finding: "Fine homepage.",
          },
        ],
        strengths: [],
        gaps: [],
      },
      ["Website Clarity", "Brand Story"],
      { "Website Clarity": 90, "Brand Story": 40 },
    );
    expect(issues.some((issue) => issue.includes("Brand Story"))).toBe(true);
    expect(issues.some((issue) => issue.includes("maintain"))).toBe(true);
  });

  it("keeps a complete first answer when the retry drops a pillar", () => {
    const scores = {
      "Website Clarity": 88,
      "Brand Story": 40,
      "Content Consistency": 75,
      "Social Presence": 68,
    };
    const first = {
      findings: [
        {
          dimension: "Website Clarity",
          score: 88,
          observation: "The homepage headline says 'The Home of Log Building'.",
          nextStep: "Change the homepage button from 'Contact' to 'Book a site visit'.",
          finding: "The homepage headline says 'The Home of Log Building'.",
        },
        {
          dimension: "Content Consistency",
          score: 75,
          observation: "The last Instagram post was 4 days ago, with 1 post in the last 30 days.",
          nextStep: "Put a photo from this week's cabin build on Instagram before Friday.",
          finding: "The last Instagram post was 4 days ago, with 1 post in the last 30 days.",
        },
      ],
      strengths: [],
      gaps: [],
    };
    const retry = {
      findings: [first.findings[0]],
      strengths: [],
      gaps: [],
    };
    const merged = mergePillarFindings(first, retry, scores);
    expect(merged.findings.map((row) => row.dimension)).toEqual([
      "Website Clarity",
      "Content Consistency",
    ]);
  });

  it("names the site and the Instagram handle on Content and Social", () => {
    const input = {
      websiteUrl: "https://britishlogcabins.com",
      instagramHandle: "britishlogcabins",
      facebookUrl: "",
      websiteScore: null,
    };
    expect(getDataSourceLabel("Content Consistency", input, "britishlogcabins.com")).toBe(
      "britishlogcabins.com + @britishlogcabins",
    );
    expect(getDataSourceLabel("Social Presence", input, "britishlogcabins.com")).toBe(
      "britishlogcabins.com + @britishlogcabins",
    );
    expect(getDataSourceLabel("Website Clarity", input, "britishlogcabins.com")).toBe(
      "britishlogcabins.com",
    );
    expect(getDataSourceLabel("Brand Story", input, "britishlogcabins.com")).toBe(
      "britishlogcabins.com homepage and about pages",
    );
  });
});
