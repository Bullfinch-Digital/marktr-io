import type { HealthCheckScores } from "./healthCheckScoring";

export type HealthDimensionFinding = {
  dimension: string;
  score: number;
  finding: string;
};

const DIMENSION_ORDER = [
  "Website Clarity",
  "Brand Story",
  "Content Consistency",
  "Social Presence",
] as const;

export function mergeHealthFindings(
  scores: HealthCheckScores,
  apiFindings?: HealthDimensionFinding[] | null
): HealthDimensionFinding[] {
  const byDimension = new Map(
    (apiFindings ?? []).map((f) => [f.dimension, f] as const)
  );

  const rows: HealthDimensionFinding[] = [
    {
      dimension: "Website Clarity",
      score: scores.websiteClarity.score,
      finding:
        byDimension.get("Website Clarity")?.finding?.trim() ||
        scores.websiteClarity.observation ||
        `Scored ${scores.websiteClarity.score}/100 on your last check.`,
    },
    {
      dimension: "Brand Story",
      score: scores.brandStory.score,
      finding:
        byDimension.get("Brand Story")?.finding?.trim() ||
        scores.brandStory.observation ||
        `Scored ${scores.brandStory.score}/100 on your last check.`,
    },
    {
      dimension: "Content Consistency",
      score: scores.contentConsistency.score,
      finding:
        byDimension.get("Content Consistency")?.finding?.trim() ||
        scores.contentConsistency.observation ||
        `Scored ${scores.contentConsistency.score}/100 on your last check.`,
    },
    {
      dimension: "Social Presence",
      score: scores.socialPresence.score,
      finding:
        byDimension.get("Social Presence")?.finding?.trim() ||
        scores.socialPresence.observation ||
        `Scored ${scores.socialPresence.score}/100 on your last check.`,
    },
  ];

  return rows.sort((a, b) => {
    const ai = DIMENSION_ORDER.indexOf(a.dimension as (typeof DIMENSION_ORDER)[number]);
    const bi = DIMENSION_ORDER.indexOf(b.dimension as (typeof DIMENSION_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function parseApiFindings(raw: unknown): HealthDimensionFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const dimension = typeof row.dimension === "string" ? row.dimension.trim() : "";
      const score = Number(row.score);
      const finding = typeof row.finding === "string" ? row.finding.trim() : "";
      if (!dimension || !finding || Number.isNaN(score)) return null;
      return { dimension, score, finding };
    })
    .filter((item): item is HealthDimensionFinding => item !== null);
}
