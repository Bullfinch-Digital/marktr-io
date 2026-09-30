import type { HealthCheckScores } from "../../lib/healthCheckScoring";
import type { HealthCheckInput } from "../../lib/healthCheckScoring";

const FINDINGS = [
  {
    dimension: "Website Clarity",
    score: 62,
    finding: "FIXTURE_FINDING_WEBSITE: homepage value proposition is hinted, not named.",
  },
  {
    dimension: "Brand Story",
    score: 48,
    finding: "FIXTURE_FINDING_STORY: founder story is present but missing a concrete customer.",
  },
  {
    dimension: "Content Consistency",
    score: 35,
    finding: "FIXTURE_FINDING_CONTENT: posting is irregular and the bio does not carry the story.",
  },
  {
    dimension: "Social Presence",
    score: 22,
    finding: "FIXTURE_FINDING_SOCIAL: Instagram profile is thin and Facebook is absent.",
  },
] as const;

export const HEALTH_CHECK_REPORT_FIXTURE_FINDINGS = FINDINGS.map((f) => f.finding);

export const healthCheckReportFixtureScores: HealthCheckScores = {
  websiteClarity: {
    name: "Website Clarity",
    score: 62,
    scoreRaw: 62,
    dimensionCapped: false,
    unmeasured: false,
    observation: FINDINGS[0].finding,
    strengths: ["Clear product photography above the fold"],
    gaps: ["Headline does not name who it is for"],
  },
  brandStory: {
    name: "Brand Story",
    score: 48,
    scoreRaw: 48,
    dimensionCapped: false,
    unmeasured: false,
    observation: FINDINGS[1].finding,
  },
  contentConsistency: {
    name: "Content Consistency",
    score: 35,
    scoreRaw: 35,
    dimensionCapped: false,
    unmeasured: false,
    observation: FINDINGS[2].finding,
  },
  socialPresence: {
    name: "Social Presence",
    score: 22,
    scoreRaw: 22,
    dimensionCapped: false,
    unmeasured: false,
    observation: FINDINGS[3].finding,
  },
  overall: 45,
  overallRaw: 45,
  capped: false,
  lowestDimension: "Social Presence",
  lowestScore: 22,
};

export const healthCheckReportFixtureInput: Pick<
  HealthCheckInput,
  "websiteUrl" | "instagramHandle" | "facebookUrl" | "websiteScore"
> = {
  websiteUrl: "https://confires.co.uk",
  instagramHandle: "confires",
  facebookUrl: "",
  websiteScore: {
    score: 62,
    observation: FINDINGS[0].finding,
    findings: FINDINGS.map((f) => ({
      dimension: f.dimension,
      score: f.score,
      finding: f.finding,
    })),
  },
};
