import type { DeterministicHealthCheckRun } from "./healthCheck";
import { buildAbsentHealthCheckRun } from "./healthCheck";

export interface StoryAssessment {
  hasFounderStory: boolean;
  founderStoryQuality: "none" | "basic" | "good" | "compelling";
  speaksToSpecificCustomer: boolean;
  hasDistinctivePositioning: boolean;
  hasEmotionalHook: boolean;
  missingElements: string[];
}

export interface SocialScores {
  instagramFound?: boolean;
  facebookFound?: boolean;
  instagramFollowers?: string;
  instagramPostCount?: string;
  instagramBioScore?: number | null;
  contentConsistencyScore?: number;
  socialObservation?: string;
  audienceObservation?: string | null;
  engagementProxyScore?: number | null;
  engagementObservation?: string | null;
}

export interface HealthCheckInput {
  businessName?: string;
  websiteUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  email: string;
  websiteScore?: {
    score: number;
    observation: string;
    strengths?: string[];
    gaps?: string[];
    storyAssessment?: StoryAssessment | null;
    socialScores?: SocialScores | null;
    findings?: Array<{ dimension: string; score: number; finding: string }>;
    deterministic?: DeterministicHealthCheckRun | null;
  } | null;
}

export interface DimensionScore {
  name: string;
  score: number;
  observation: string;
  strengths?: string[];
  gaps?: string[];
  storyAssessment?: StoryAssessment | null;
}

export interface HealthCheckScores {
  websiteClarity: DimensionScore;
  brandStory: DimensionScore;
  contentConsistency: DimensionScore;
  socialPresence: DimensionScore;
  overall: number;
  lowestDimension: string;
  lowestScore: number;
  deterministic?: DeterministicHealthCheckRun;
}

function obs(score: number, high: string, mid: string, low: string) {
  if (score >= 70) return high;
  if (score >= 40) return mid;
  return low;
}

function storyAssessmentFromFacts(
  run: DeterministicHealthCheckRun
): StoryAssessment {
  const { facts } = run;
  const hasFounderStory = facts.founderStory !== "absent";
  let founderStoryQuality: StoryAssessment["founderStoryQuality"] = "none";
  if (facts.founderStory === "present") {
    founderStoryQuality =
      facts.storySpecific === "specific" ? "compelling" : "good";
  } else if (facts.founderStory === "partial") {
    founderStoryQuality = "basic";
  }

  const missingElements: string[] = [];
  if (!hasFounderStory) missingElements.push("founding moment");
  if (facts.pointOfView === "absent") missingElements.push("clear why/purpose");
  if (facts.namesCustomer === "absent")
    missingElements.push("specific customer named");
  if (facts.pointOfView !== "distinct")
    missingElements.push("what makes us different");

  return {
    hasFounderStory,
    founderStoryQuality,
    speaksToSpecificCustomer: facts.namesCustomer !== "absent",
    hasDistinctivePositioning: facts.pointOfView === "distinct",
    hasEmotionalHook: facts.storyNamesConcrete || facts.storySpecific === "specific",
    missingElements,
  };
}

function scoresFromDeterministicRun(
  run: DeterministicHealthCheckRun,
  input: HealthCheckInput
): HealthCheckScores {
  const { scores } = run;
  const instagramNotFound =
    Boolean(input.instagramHandle?.trim()) && !run.apifyMetrics.instagramFound;

  const websiteObservation = obs(
    scores.websiteClarity,
    "Your homepage communicates clearly",
    "Your value proposition could be sharper",
    "Visitors may struggle to understand what you do"
  );

  const storyObservation = obs(
    scores.brandStory,
    "Strong brand story with clear positioning",
    "Basic story present but missing key elements",
    "Brand story needs significant development"
  );

  const consistencyObservation = instagramNotFound
    ? "We could not verify your Instagram profile — social activity scored as absent"
    : obs(
        scores.contentConsistency,
        "You're maintaining a consistent presence",
        "Some gaps in your content schedule",
        "Irregular posting is limiting your reach"
      );

  const socialObservation = instagramNotFound
    ? "Instagram handle provided but profile not found — social checks scored as absent"
    : obs(
        scores.socialPresence,
        "Strong social presence reaching the right audience",
        "Social presence is building but has room to grow",
        "Limited social presence restricting your reach"
      );

  const storyAssessment = storyAssessmentFromFacts(run);

  return {
    websiteClarity: {
      name: "Website Clarity",
      score: scores.websiteClarity,
      observation: input.websiteScore?.observation || websiteObservation,
      strengths: input.websiteScore?.strengths,
      gaps: input.websiteScore?.gaps,
    },
    brandStory: {
      name: "Brand Story",
      score: scores.brandStory,
      observation: storyObservation,
      storyAssessment,
    },
    contentConsistency: {
      name: "Content Consistency",
      score: scores.contentConsistency,
      observation: consistencyObservation,
    },
    socialPresence: {
      name: "Social Presence",
      score: scores.socialPresence,
      observation: socialObservation,
    },
    overall: scores.overall,
    lowestDimension: run.lowestDimension,
    lowestScore: run.lowestScore,
    deterministic: run,
  };
}

export function calculateScores(input: HealthCheckInput): HealthCheckScores {
  const deterministic = input.websiteScore?.deterministic;
  if (deterministic) {
    return scoresFromDeterministicRun(deterministic, input);
  }

  const absentRun = buildAbsentHealthCheckRun({
    websiteUrl: input.websiteUrl,
    instagramHandle: input.instagramHandle,
    facebookUrl: input.facebookUrl,
  });
  return scoresFromDeterministicRun(absentRun, input);
}
