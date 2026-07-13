import type { DeterministicHealthCheckRun } from "./healthCheck";
import {
  applyDimensionDisplayCap,
  buildAbsentHealthCheckRun,
  DIMENSION_CAP_FRAMING_COPY,
  shouldSuppressDimensionGaps,
  SOCIAL_INCOMPLETE_COPY,
} from "./healthCheck";

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
    findings?: Array<{ dimension: string; score: number | null; finding: string }>;
    deterministic?: DeterministicHealthCheckRun | null;
  } | null;
}

export interface DimensionScore {
  name: string;
  /** Displayed score (capped). Null when unmeasured this run. */
  score: number | null;
  /** Uncapped raw points. Null when unmeasured. */
  scoreRaw?: number | null;
  dimensionCapped?: boolean;
  unmeasured?: boolean;
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
  overallRaw?: number;
  capped?: boolean;
  overallSummary?: string;
  socialIncomplete?: boolean;
  socialIncompleteSummary?: string;
  lowestDimension: string;
  lowestScore: number;
  deterministic?: DeterministicHealthCheckRun;
}

function obs(score: number, high: string, mid: string, low: string) {
  if (score >= 70) return high;
  if (score >= 40) return mid;
  return low;
}

function findingObservation(
  dimensionName: string,
  fallback: string,
  websiteScore?: HealthCheckInput["websiteScore"]
): string {
  const finding = websiteScore?.findings
    ?.find((f) => f.dimension === dimensionName)
    ?.finding?.trim();
  return finding || fallback;
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
  const dims = run.dimensions;
  const socialIncomplete = run.socialIncomplete;

  const websiteObservation = obs(
    dims.websiteClarity.raw ?? 0,
    "Your homepage communicates clearly",
    "Your value proposition could be sharper",
    "Visitors may struggle to understand what you do"
  );

  const storyObservation = obs(
    dims.brandStory.raw ?? 0,
    "Strong brand story with clear positioning",
    "Basic story present but missing key elements",
    "Brand story needs significant development"
  );

  const consistencyObservation = socialIncomplete
    ? SOCIAL_INCOMPLETE_COPY
    : obs(
        dims.contentConsistency.raw ?? 0,
        "You're maintaining a consistent presence",
        "Some gaps in your content schedule",
        "Irregular posting is limiting your reach"
      );

  const socialObservation = socialIncomplete
    ? SOCIAL_INCOMPLETE_COPY
    : obs(
        dims.socialPresence.raw ?? 0,
        "Strong social presence reaching the right audience",
        "Social presence is building but has room to grow",
        "Limited social presence restricting your reach"
      );

  const storyAssessment = storyAssessmentFromFacts(run);

  const suppressWebsiteGaps = shouldSuppressDimensionGaps(dims.websiteClarity);
  const websiteObservationFinal = suppressWebsiteGaps
    ? DIMENSION_CAP_FRAMING_COPY
    : findingObservation(
        "Website Clarity",
        input.websiteScore?.observation || websiteObservation,
        input.websiteScore
      );

  const brandObservationFinal = shouldSuppressDimensionGaps(dims.brandStory)
    ? DIMENSION_CAP_FRAMING_COPY
    : findingObservation("Brand Story", storyObservation, input.websiteScore);

  return {
    websiteClarity: {
      name: "Website Clarity",
      score: dims.websiteClarity.score,
      scoreRaw: dims.websiteClarity.raw,
      dimensionCapped: dims.websiteClarity.capped,
      unmeasured: false,
      observation: websiteObservationFinal,
      strengths: suppressWebsiteGaps ? undefined : input.websiteScore?.strengths,
      gaps: suppressWebsiteGaps ? undefined : input.websiteScore?.gaps,
    },
    brandStory: {
      name: "Brand Story",
      score: dims.brandStory.score,
      scoreRaw: dims.brandStory.raw,
      dimensionCapped: dims.brandStory.capped,
      unmeasured: false,
      observation: brandObservationFinal,
      storyAssessment,
    },
    contentConsistency: {
      name: "Content Consistency",
      score: dims.contentConsistency.score,
      scoreRaw: dims.contentConsistency.raw,
      dimensionCapped: dims.contentConsistency.capped,
      unmeasured: dims.contentConsistency.unmeasured,
      observation: socialIncomplete
        ? SOCIAL_INCOMPLETE_COPY
        : shouldSuppressDimensionGaps(dims.contentConsistency)
          ? DIMENSION_CAP_FRAMING_COPY
          : findingObservation(
              "Content Consistency",
              consistencyObservation,
              input.websiteScore
            ),
    },
    socialPresence: {
      name: "Social Presence",
      score: dims.socialPresence.score,
      scoreRaw: dims.socialPresence.raw,
      dimensionCapped: dims.socialPresence.capped,
      unmeasured: dims.socialPresence.unmeasured,
      observation: socialIncomplete
        ? SOCIAL_INCOMPLETE_COPY
        : shouldSuppressDimensionGaps(dims.socialPresence)
          ? DIMENSION_CAP_FRAMING_COPY
          : findingObservation("Social Presence", socialObservation, input.websiteScore),
    },
    overall: run.scores.overall,
    overallRaw: run.scores.overallRaw,
    capped: run.scores.capped,
    overallSummary: run.overallSummary,
    socialIncomplete,
    socialIncompleteSummary: run.socialIncompleteSummary,
    lowestDimension: run.lowestDimension,
    lowestScore: run.lowestScore,
    deterministic: run,
  };
}

export function calculateScores(input: HealthCheckInput): HealthCheckScores {
  const deterministic = input.websiteScore?.deterministic;
  if (deterministic) {
    // Back-compat: older stored runs may lack dimensions/socialIncomplete.
    if (!deterministic.dimensions) {
      const legacyScores = deterministic.scores;
      const patched: DeterministicHealthCheckRun = {
        ...deterministic,
        socialIncomplete: deterministic.socialIncomplete ?? false,
        dimensions: {
          websiteClarity: applyDimensionDisplayCap(legacyScores.websiteClarity),
          brandStory: applyDimensionDisplayCap(legacyScores.brandStory),
          contentConsistency: applyDimensionDisplayCap(
            legacyScores.contentConsistency ?? 0
          ),
          socialPresence: applyDimensionDisplayCap(
            legacyScores.socialPresence ?? 0
          ),
        },
      };
      return scoresFromDeterministicRun(patched, input);
    }
    return scoresFromDeterministicRun(deterministic, input);
  }

  const absentRun = buildAbsentHealthCheckRun({
    websiteUrl: input.websiteUrl,
    instagramHandle: input.instagramHandle,
    facebookUrl: input.facebookUrl,
  });
  return scoresFromDeterministicRun(absentRun, input);
}
