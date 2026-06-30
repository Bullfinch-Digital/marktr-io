import { HEALTH_CHECK_SCORER_VERSION } from "./healthCheck";
import type { HealthCheckRow } from "./healthCheckPersistence";
import { summarizeHealthCheckRow } from "./healthCheckPersistence";

export type HealthProgressMetric =
  | "overall"
  | "website"
  | "brandStory"
  | "content"
  | "social";

export type HealthProgressChartMode = HealthProgressMetric | "all";

export type HealthProgressChartPoint = {
  id: string;
  createdAt: string;
  dateLabel: string;
  overall: number;
  website: number;
  brandStory: number;
  content: number;
  social: number;
};

/** Reads `scores.deterministic.scorerVersion` — absent on slim legacy rows. */
export function getHealthCheckRowScorerVersion(row: HealthCheckRow): string | null {
  const version = row.scores?.deterministic?.scorerVersion;
  return typeof version === "string" && version.trim() ? version.trim() : null;
}

/** Trend line only includes rows measured with the current scorer rules. */
export function isComparableHealthCheckRow(
  row: HealthCheckRow,
  currentVersion: string = HEALTH_CHECK_SCORER_VERSION
): boolean {
  return getHealthCheckRowScorerVersion(row) === currentVersion;
}

function shortChartDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Comparable points only, oldest → newest (chart left → right). */
export function buildComparableProgressPoints(
  rows: HealthCheckRow[],
  currentVersion: string = HEALTH_CHECK_SCORER_VERSION
): HealthProgressChartPoint[] {
  const points: HealthProgressChartPoint[] = [];

  for (const row of rows) {
    if (!isComparableHealthCheckRow(row, currentVersion)) continue;
    const summary = summarizeHealthCheckRow(row);
    if (!summary) continue;

    points.push({
      id: row.id,
      createdAt: row.created_at,
      dateLabel: shortChartDate(row.created_at),
      overall: summary.overall,
      website: summary.website,
      brandStory: summary.brandStory,
      content: summary.content,
      social: summary.social,
    });
  }

  return points.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export const HEALTH_PROGRESS_METRIC_LABELS: Record<HealthProgressMetric, string> = {
  overall: "Overall",
  website: "Website",
  brandStory: "Brand Story",
  content: "Content",
  social: "Social",
};

export const HEALTH_PROGRESS_LINE_COLORS: Record<HealthProgressMetric, string> = {
  overall: "#0D1833",
  website: "#2D7A5F",
  brandStory: "#e8650a",
  content: "#BA7517",
  social: "#5B6B8A",
};
