import type { ICPStrategyPayload } from "../types/icpStrategyPayload";

const SCHEDULE_FIELDS = ["schedule", "posting_schedule", "content_schedule"] as const;

function hasScheduleValue(value: unknown): boolean {
  if (value == null || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some((item) => hasScheduleValue(item));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasScheduleValue(item));
  }
  return false;
}

/** True when a later task has attached non-empty posting schedule data. */
export function strategyHasPostingSchedule(strategy: ICPStrategyPayload | null | undefined): boolean {
  if (!strategy || typeof strategy !== "object") return false;
  const record = strategy as unknown as Record<string, unknown>;
  return SCHEDULE_FIELDS.some((key) => hasScheduleValue(record[key]));
}
