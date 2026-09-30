/** Columns returned to clients. Never include PII, ids, or utm. */
export const REPORT_PUBLIC_COLUMNS = [
  "public_token",
  "edition",
  "url",
  "overall",
  "capped",
  "website_score",
  "brand_story_score",
  "content_score",
  "social_score",
  "findings",
  "scores",
  "bf_route",
  "scoring_version",
  "created_at",
] as const;

export type ReportPublicColumn = (typeof REPORT_PUBLIC_COLUMNS)[number];

const PUBLIC_COLUMN_SET = new Set<string>(REPORT_PUBLIC_COLUMNS);

export function sanitizeHealthCheckReportRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of REPORT_PUBLIC_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      out[key] = row[key];
    }
  }
  return out;
}

export function reportResponseHasOnlyPublicKeys(
  report: Record<string, unknown>,
): boolean {
  return Object.keys(report).every((key) => PUBLIC_COLUMN_SET.has(key));
}
