export const REPORT_RETENTION_MONTHS = 24;

/**
 * Cutoff matching `now() - interval '24 months'` for dates the target month can hold.
 * A report is due when its created_at is strictly earlier than this instant.
 */
export function reportRetentionCutoff(now: Date): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - REPORT_RETENTION_MONTHS);
  return cutoff;
}

export function reportIdsPastRetention(
  rows: readonly { id: string; createdAt: string }[],
  now: Date,
): string[] {
  const cutoffMs = reportRetentionCutoff(now).getTime();
  return rows
    .filter((row) => {
      const created = Date.parse(row.createdAt);
      return !Number.isNaN(created) && created < cutoffMs;
    })
    .map((row) => row.id);
}
