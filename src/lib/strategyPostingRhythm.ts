import type { ICPStrategyPayload, StrategyChannel } from "../types/icpStrategyPayload";

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type RhythmSlot = {
  channelName: string;
  time: string | null;
};

export type RhythmDay = {
  dayIndex: number;
  label: (typeof WEEKDAY_LABELS)[number];
  slots: RhythmSlot[];
};

/** True when structured channels exist so the When-to-post rhythm can be shown. */
export function strategyHasChannelRhythm(
  strategy: ICPStrategyPayload | null | undefined
): boolean {
  const channels = strategy?.channel_plan?.channels;
  return Array.isArray(channels) && channels.length > 0;
}

export function orderedStrategyChannels(channels: StrategyChannel[]): StrategyChannel[] {
  const primary = channels.filter((channel) => channel.role === "primary");
  const secondary = channels.filter((channel) => channel.role === "secondary");
  return [...primary, ...secondary];
}

/**
 * Spread `count` posts across Mon–Sun.
 * At most one slot per day. Prefers non-consecutive days when the count allows.
 * `channelIndex` offsets the pattern so channels do not all land on the same days.
 */
export function spreadPostsAcrossWeek(count: number, channelIndex: number): number[] {
  const n = Math.min(7, Math.max(0, Math.floor(count)));
  if (n <= 0) return [];
  const offset = ((channelIndex % 7) + 7) % 7;
  if (n === 1) return [offset];

  const used = new Set<number>();
  const days: number[] = [];
  const span = 6;
  for (let i = 0; i < n; i++) {
    let pos = Math.round((i * span) / (n - 1));
    pos = (pos + offset) % 7;
    let guard = 0;
    while (used.has(pos) && guard < 7) {
      pos = (pos + 1) % 7;
      guard += 1;
    }
    used.add(pos);
    days.push(pos);
  }
  return days.sort((a, b) => a - b);
}

export function buildPostingRhythm(channels: StrategyChannel[]): RhythmDay[] {
  const days: RhythmDay[] = WEEKDAY_LABELS.map((label, dayIndex) => ({
    dayIndex,
    label,
    slots: [],
  }));

  let postingIndex = 0;
  for (const channel of orderedStrategyChannels(channels)) {
    const raw = channel.posts_per_week;
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) continue;
    const n = Math.min(raw, 7);
    const assigned = spreadPostsAcrossWeek(n, postingIndex);
    const time = channel.best_times?.find((item) => item.trim())?.trim() ?? null;
    for (const dayIndex of assigned) {
      days[dayIndex].slots.push({ channelName: channel.name, time });
    }
    postingIndex += 1;
  }

  return days;
}
