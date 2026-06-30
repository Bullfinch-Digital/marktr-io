import type { HealthCheckScores, HealthCheckInput } from "./healthCheckScoring";
import type { HealthCheckPriorRunPayload } from "./healthCheckPriorRun";

export type HealthCheckWebsiteScore = NonNullable<HealthCheckInput["websiteScore"]>;

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

const PRIOR_SCORE_KEYS: Record<
  (typeof DIMENSION_ORDER)[number],
  keyof HealthCheckPriorRunPayload["scores"]
> = {
  "Website Clarity": "website",
  "Brand Story": "brandStory",
  "Content Consistency": "content",
  "Social Presence": "social",
};

/** Generic tier fallbacks from healthCheckScoring — not prior-aware LLM prose. */
const STATIC_OBSERVATION_PREFIXES = [
  "Your homepage communicates clearly",
  "Your value proposition could be sharper",
  "Visitors may struggle to understand what you do",
  "Strong brand story with clear positioning",
  "Basic story present but missing key elements",
  "Brand story needs significant development",
  "You're maintaining a consistent presence",
  "Some gaps in your content schedule",
  "Irregular posting is limiting your reach",
  "Strong social presence reaching the right audience",
  "Social presence is building but has room to grow",
  "Limited social presence restricting your reach",
  "We could not verify your Instagram profile",
  "Instagram handle provided but profile not found",
  "Analysis complete",
];

export function getLlmFindingForDimension(
  dimensionName: string,
  websiteScore?: { findings?: HealthDimensionFinding[] | null } | null
): string | undefined {
  const finding = websiteScore?.findings
    ?.find((f) => f.dimension === dimensionName)
    ?.finding?.trim();
  return finding || undefined;
}

export function hasLlmFindings(
  websiteScore?: { findings?: HealthDimensionFinding[] | null } | null
): boolean {
  return Boolean(websiteScore?.findings?.some((f) => f.finding?.trim()));
}

function mentionsContinuity(text: string): boolean {
  return /\b(since your last|last check|last run|compared to|previously|rose|fell|lifted|dropped|from \d+|to \d+|now live|now present|unchanged|no change|same score|still \d+\/100)\b/i.test(
    text
  );
}

function isStaticObservation(finding: string): boolean {
  return STATIC_OBSERVATION_PREFIXES.some((prefix) => finding.startsWith(prefix));
}

function deltaContext(
  dimension: string,
  priorScore: number,
  currentScore: number,
  priorRun: HealthCheckPriorRunPayload
): string {
  if (dimension === "Brand Story" && priorScore < 40 && currentScore >= 70) {
    const hadMissing = (priorRun.missingElements?.length ?? 0) > 0;
    return hadMissing
      ? "Your founder story and positioning are now live on the site — the gaps we flagged last time are addressed."
      : "Your founder story and positioning are now live on the site.";
  }
  if (dimension === "Brand Story" && priorScore >= 70 && currentScore < 40) {
    return "Your about/story content is missing or thin again — restore the narrative that was scoring well before.";
  }
  if (dimension === "Website Clarity" && currentScore > priorScore) {
    return "Your homepage reads clearer against what we saw last time.";
  }
  if (dimension === "Website Clarity" && currentScore < priorScore) {
    return "Something on the homepage is less clear than on your last check.";
  }
  if (currentScore === priorScore) {
    return "Nothing material changed on the live site for this dimension.";
  }
  if (currentScore > priorScore) {
    return "What’s live now is stronger than on your last check.";
  }
  return "What’s live now is weaker than on your last check.";
}

function continuityLead(dimension: string, priorScore: number, currentScore: number): string {
  if (priorScore === currentScore) {
    return `Still ${currentScore}/100 since your last check.`;
  }
  const verb = currentScore > priorScore ? "rose" : "fell";
  return `${dimension} ${verb} from ${priorScore} to ${currentScore} since your last check.`;
}

/** Ensures prior-run score deltas appear in advice when the LLM returned generic tier copy. */
export function augmentFindingsWithPriorRun(
  apiFindings: HealthDimensionFinding[] | undefined,
  priorRun: HealthCheckPriorRunPayload | undefined,
  scores: HealthCheckScores
): HealthDimensionFinding[] {
  const merged = mergeHealthFindings(scores, apiFindings);
  if (!priorRun) return merged;

  return merged.map((row) => {
    const priorKey = PRIOR_SCORE_KEYS[row.dimension as (typeof DIMENSION_ORDER)[number]];
    if (!priorKey) return row;

    const priorScore = priorRun.scores[priorKey];
    const currentScore = row.score;
    const finding = row.finding.trim();

    if (mentionsContinuity(finding) && !isStaticObservation(finding)) {
      return row;
    }

    const lead = continuityLead(row.dimension, priorScore, currentScore);
    const context = deltaContext(row.dimension, priorScore, currentScore, priorRun);

    if (isStaticObservation(finding) || !apiFindings?.some((f) => f.dimension === row.dimension)) {
      return { ...row, finding: `${lead} ${context}` };
    }

    return { ...row, finding: `${lead} ${finding}` };
  });
}

export function applyFindingsToWebsiteScore(
  websiteScore: HealthCheckWebsiteScore,
  findings: HealthDimensionFinding[]
): HealthCheckWebsiteScore {
  return { ...websiteScore, findings };
}

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
