import type { BfRoute } from "../bullfinchRouting";
import { isBfRoute } from "../bullfinchRouting";
import type { HealthCheckInput, HealthCheckScores } from "../healthCheckScoring";

export type PublicHealthCheckReportView = {
  scores: HealthCheckScores;
  input: Pick<
    HealthCheckInput,
    "websiteUrl" | "instagramHandle" | "facebookUrl" | "websiteScore"
  >;
  bfRoute: BfRoute | null;
  publicToken: string;
};

function isDimension(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const dim = value as { name?: unknown; observation?: unknown; score?: unknown };
  if (typeof dim.name !== "string") return false;
  if (typeof dim.observation === "string") return true;
  return dim.score === null || typeof dim.score === "number";
}

const UNASSESSED_CONTENT = {
  name: "Content Consistency",
  score: null,
  scoreRaw: null,
  unmeasured: true,
  observation: "",
};

export function mapPublicHealthCheckReport(
  report: unknown,
): PublicHealthCheckReportView | null {
  if (!report || typeof report !== "object") return null;
  const row = report as Record<string, unknown>;
  const scoresRaw = row.scores;
  if (!scoresRaw || typeof scoresRaw !== "object") return null;
  const scores = scoresRaw as HealthCheckScores & {
    websiteScore?: HealthCheckInput["websiteScore"];
    inputs?: {
      websiteUrl?: string;
      instagramHandle?: string;
      facebookUrl?: string;
    };
  };
  const contentConsistency = isDimension(scores.contentConsistency)
    ? scores.contentConsistency
    : scores.contentConsistency == null
      ? UNASSESSED_CONTENT
      : null;
  if (
    !isDimension(scores.websiteClarity) ||
    !isDimension(scores.brandStory) ||
    !contentConsistency ||
    !isDimension(scores.socialPresence) ||
    typeof scores.overall !== "number"
  ) {
    return null;
  }

  const url =
    typeof row.url === "string" && row.url.trim()
      ? row.url
      : scores.inputs?.websiteUrl ?? "";

  return {
    scores: { ...scores, contentConsistency },
    input: {
      websiteUrl: url,
      instagramHandle: scores.inputs?.instagramHandle ?? "",
      facebookUrl: scores.inputs?.facebookUrl ?? "",
      websiteScore: scores.websiteScore ?? null,
    },
    bfRoute: isBfRoute(row.bf_route) ? row.bf_route : null,
    publicToken: typeof row.public_token === "string" ? row.public_token : "",
  };
}
