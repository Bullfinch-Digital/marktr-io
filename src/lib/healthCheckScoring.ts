import type { DeterministicHealthCheckRun } from "./healthCheck";
import {
  applyDimensionDisplayCap,
  buildAbsentHealthCheckRun,
  DIMENSION_CAP_FRAMING_COPY,
  DIMENSION_DISPLAY_CAP,
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
  /**
   * Story System CTA — only set when Brand Story has a real weakness.
   * Null/undefined when strong/capped/maxed (do not pitch "find your story").
   */
  storySystemSignpost?: { copy: string } | null;
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

function formatGapList(gaps: string[]): string {
  if (gaps.length === 1) return gaps[0];
  if (gaps.length === 2) return `${gaps[0]} and ${gaps[1]}`;
  return `${gaps.slice(0, -1).join(", ")}, and ${gaps[gaps.length - 1]}`;
}

/**
 * Story-dimension weaknesses only (not Website Clarity facts like namesCustomer).
 * Used for missing-element chips and the Story System signpost.
 */
export function storyGapsFromFacts(facts: {
  founderStory: "present" | "partial" | "absent";
  storySpecific: "specific" | "mixed" | "boilerplate";
  pointOfView: "distinct" | "implied" | "absent";
  valuesMission: "concrete" | "generic" | "absent";
}): string[] {
  const gaps: string[] = [];
  if (facts.founderStory === "absent") gaps.push("your founding story");
  else if (facts.founderStory === "partial") gaps.push("a fuller founding story");
  if (facts.storySpecific === "boilerplate") gaps.push("specific, concrete story detail");
  else if (facts.storySpecific === "mixed") gaps.push("sharper story specificity");
  if (facts.pointOfView === "absent") gaps.push("a clear point of view / purpose");
  else if (facts.pointOfView === "implied") gaps.push("what makes you different");
  if (facts.valuesMission === "absent") gaps.push("concrete values or purpose");
  else if (facts.valuesMission === "generic") gaps.push("more concrete values or purpose");
  return gaps;
}

function storySystemSignpostFromGaps(
  gaps: string[],
  brandStoryRaw: number | null | undefined
): { copy: string } | null {
  // Strong / maxed / display-capped stories: never pitch.
  if (
    brandStoryRaw === null ||
    brandStoryRaw === undefined ||
    brandStoryRaw >= DIMENSION_DISPLAY_CAP
  ) {
    return null;
  }
  if (gaps.length === 0) return null;

  return {
    copy: `marktr's Story System can help you find and articulate ${formatGapList(gaps)} — free in under 5 minutes.`,
  };
}

function storyAssessmentFromFacts(
  run: DeterministicHealthCheckRun
): StoryAssessment {
  const { facts } = run;
  const brandStoryRaw = run.dimensions?.brandStory?.raw ?? run.scores.brandStory;
  const hasFounderStory = facts.founderStory !== "absent";
  let founderStoryQuality: StoryAssessment["founderStoryQuality"] = "none";
  if (facts.founderStory === "present") {
    founderStoryQuality =
      facts.storySpecific === "specific" ? "compelling" : "good";
  } else if (facts.founderStory === "partial") {
    founderStoryQuality = "basic";
  }

  const storyGaps = storyGapsFromFacts(facts);
  // Chip labels stay short; signpost copy uses the fuller gap phrases.
  const missingElements: string[] = [];
  if (!hasFounderStory) missingElements.push("founding moment");
  else if (facts.founderStory === "partial") missingElements.push("fuller founding story");
  if (facts.storySpecific === "boilerplate") missingElements.push("specific story detail");
  else if (facts.storySpecific === "mixed") missingElements.push("sharper story specificity");
  if (facts.pointOfView === "absent") missingElements.push("clear why/purpose");
  else if (facts.pointOfView === "implied") missingElements.push("what makes us different");
  if (facts.valuesMission === "absent") missingElements.push("concrete values/purpose");
  else if (facts.valuesMission === "generic") missingElements.push("more concrete values");

  return {
    hasFounderStory,
    founderStoryQuality,
    speaksToSpecificCustomer: facts.namesCustomer !== "absent",
    hasDistinctivePositioning: facts.pointOfView === "distinct",
    hasEmotionalHook: facts.storyNamesConcrete || facts.storySpecific === "specific",
    missingElements,
    storySystemSignpost: storySystemSignpostFromGaps(storyGaps, brandStoryRaw),
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
