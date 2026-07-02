import type { DeterministicHealthCheckRun } from "./healthCheck";
import type {
  DimensionScore,
  HealthCheckInput,
  HealthCheckScores,
  StoryAssessment,
} from "./healthCheckScoring";

export const HEALTH_CHECK_DETAIL_FALLBACK =
  "Run your health check again to see detailed recommendations.";

export type StoredHealthCheckScores = HealthCheckScores & {
  websiteScore?: HealthCheckInput["websiteScore"] | null;
  deterministic?: DeterministicHealthCheckRun | null;
  inputs?: DeterministicHealthCheckRun["inputs"] | null;
};

function normalizeDimension(
  name: string,
  raw: unknown
): DimensionScore {
  if (raw && typeof raw === "object") {
    const entry = raw as Record<string, unknown>;
    const score = typeof entry.score === "number" ? entry.score : 0;
    const observation =
      typeof entry.observation === "string" && entry.observation.trim()
        ? entry.observation
        : HEALTH_CHECK_DETAIL_FALLBACK;

    return {
      name,
      score,
      observation,
      strengths: Array.isArray(entry.strengths)
        ? entry.strengths.map((s) => String(s))
        : undefined,
      gaps: Array.isArray(entry.gaps) ? entry.gaps.map((g) => String(g)) : undefined,
      storyAssessment: (entry.storyAssessment as StoryAssessment | null | undefined) ?? null,
    };
  }

  if (typeof raw === "number") {
    return { name, score: raw, observation: HEALTH_CHECK_DETAIL_FALLBACK };
  }

  return { name, score: 0, observation: HEALTH_CHECK_DETAIL_FALLBACK };
}

export function serializeScoresForDb(
  scores: HealthCheckScores,
  websiteScore?: HealthCheckInput["websiteScore"] | null
): StoredHealthCheckScores {
  const deterministic =
    scores.deterministic ?? websiteScore?.deterministic ?? null;
  return {
    websiteClarity: scores.websiteClarity,
    brandStory: scores.brandStory,
    contentConsistency: scores.contentConsistency,
    socialPresence: scores.socialPresence,
    overall: scores.overall,
    overallRaw: scores.overallRaw,
    capped: scores.capped,
    overallSummary: scores.overallSummary,
    lowestDimension: scores.lowestDimension,
    lowestScore: scores.lowestScore,
    websiteScore: websiteScore ?? null,
    deterministic: deterministic ?? undefined,
    inputs: deterministic?.inputs ?? undefined,
  };
}

export function parseStoredScores(raw: unknown): {
  scores: HealthCheckScores;
  websiteScore: HealthCheckInput["websiteScore"] | null;
} | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;

  const websiteClarity = normalizeDimension(
    "Website Clarity",
    data.websiteClarity
  );
  const brandStory = normalizeDimension("Brand Story", data.brandStory);
  const contentConsistency = normalizeDimension(
    "Content Consistency",
    data.contentConsistency
  );
  const socialPresence = normalizeDimension("Social Presence", data.socialPresence);

  const overall =
    typeof data.overall === "number"
      ? data.overall
      : Math.round(
          (websiteClarity.score +
            brandStory.score +
            contentConsistency.score +
            socialPresence.score) /
            4
        );

  const lowestDimension =
    typeof data.lowestDimension === "string"
      ? data.lowestDimension
      : [
          websiteClarity,
          brandStory,
          contentConsistency,
          socialPresence,
        ].reduce((a, b) => (b.score < a.score ? b : a)).name;

  const lowestScore =
    typeof data.lowestScore === "number"
      ? data.lowestScore
      : Math.min(
          websiteClarity.score,
          brandStory.score,
          contentConsistency.score,
          socialPresence.score
        );

  return {
    scores: {
      websiteClarity,
      brandStory,
      contentConsistency,
      socialPresence,
      overall,
      overallRaw:
        typeof data.overallRaw === "number"
          ? data.overallRaw
          : (data.deterministic as DeterministicHealthCheckRun | null | undefined)?.scores
              ?.overallRaw,
      capped:
        typeof data.capped === "boolean"
          ? data.capped
          : (data.deterministic as DeterministicHealthCheckRun | null | undefined)?.scores
              ?.capped,
      overallSummary:
        typeof data.overallSummary === "string" && data.overallSummary.trim()
          ? data.overallSummary
          : (data.deterministic as DeterministicHealthCheckRun | null | undefined)
              ?.overallSummary,
      lowestDimension,
      lowestScore,
      deterministic:
        (data.deterministic as DeterministicHealthCheckRun | null | undefined) ??
        undefined,
    },
    websiteScore: (data.websiteScore as HealthCheckInput["websiteScore"]) ?? null,
  };
}
