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

/** True when a posting channel exists so the When-to-post rhythm can be shown. */
export function strategyHasChannelRhythm(
  strategy: ICPStrategyPayload | null | undefined
): boolean {
  const channels = strategy?.channel_plan?.channels;
  return Array.isArray(channels) && channels.some((channel) => !isNonPostingChannel(channel));
}

export function orderedStrategyChannels(channels: StrategyChannel[]): StrategyChannel[] {
  const primary = channels.filter((channel) => channel.role === "primary");
  const secondary = channels.filter((channel) => channel.role === "secondary");
  return [...primary, ...secondary];
}

/** Posting channels only — excludes websites, landing pages, and zero-post rows. */
export function strategyPostingChannels(channels: StrategyChannel[]): StrategyChannel[] {
  const seen = new Set<string>();
  const posting: StrategyChannel[] = [];
  for (const channel of orderedStrategyChannels(channels)) {
    const name = channel.name.trim();
    if (!name || !isPostingChannel(channel) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    posting.push(channel);
  }
  return posting;
}

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4] as const;

const DAY_WORD_INDEX: Record<string, number> = {
  monday: 0,
  mondays: 0,
  mon: 0,
  tuesday: 1,
  tuesdays: 1,
  tues: 1,
  tue: 1,
  wednesday: 2,
  wednesdays: 2,
  wed: 2,
  thursday: 3,
  thursdays: 3,
  thurs: 3,
  thu: 3,
  friday: 4,
  fridays: 4,
  fri: 4,
  saturday: 5,
  saturdays: 5,
  sat: 5,
  sunday: 6,
  sundays: 6,
  sun: 6,
};

const DAY_TOKEN_RE =
  /\b(weekdays?|weekends?|mondays?|mon|tuesdays?|tues|tue|wednesdays?|wed|thursdays?|thurs|thu|fridays?|fri|saturdays?|sat|sundays?|sun)\b/gi;

const NON_POSTING_PLATFORM_NAMES = new Set(["website", "landing page"]);

type DayToken = {
  days: number[];
  single: number | null;
  start: number;
  end: number;
};

/** Owned assets and zero-post channels are not part of the weekly rhythm. */
export function isNonPostingChannel(channel: StrategyChannel): boolean {
  if (channel.posts_per_week === 0) return true;
  return NON_POSTING_PLATFORM_NAMES.has(channel.name.trim().toLowerCase());
}

/** True for channels that count toward posting rhythm and the weekly target. */
export function isPostingChannel(
  channel: StrategyChannel
): channel is StrategyChannel & { posts_per_week: number } {
  if (NON_POSTING_PLATFORM_NAMES.has(channel.name.trim().toLowerCase())) return false;
  const posts = channel.posts_per_week;
  return typeof posts === "number" && Number.isInteger(posts) && posts > 0;
}

function dayTokenFromWord(word: string): Pick<DayToken, "days" | "single"> | null {
  const normalized = word.toLowerCase();
  if (normalized === "weekday" || normalized === "weekdays") {
    return { days: [...WEEKDAY_INDEXES], single: null };
  }
  if (normalized === "weekend" || normalized === "weekends") {
    return { days: [5, 6], single: null };
  }
  const index = DAY_WORD_INDEX[normalized];
  if (index === undefined) return null;
  return { days: [index], single: index };
}

function isRangeConnector(between: string): boolean {
  const text = between.trim().toLowerCase();
  if (!text) return false;
  if (/^(?:to|through|until|[-–—])$/.test(text)) return true;
  return /\b(?:to|through|until)\b/.test(text) && !/\b(?:or|and)\b/.test(text);
}

function addDayRange(target: Set<number>, start: number, end: number) {
  let day = start;
  target.add(day);
  let guard = 0;
  while (day !== end && guard < 7) {
    day = (day + 1) % 7;
    target.add(day);
    guard += 1;
  }
}

/** Days named by one best-time string. Empty when the string has no day hint. */
export function parseBestTimeDays(text: string): number[] {
  const tokens: DayToken[] = [];
  for (const match of text.matchAll(DAY_TOKEN_RE)) {
    const word = match[1];
    if (!word || match.index === undefined) continue;
    const parsed = dayTokenFromWord(word);
    if (!parsed) continue;
    tokens.push({
      ...parsed,
      start: match.index,
      end: match.index + word.length,
    });
  }
  if (tokens.length === 0) return [];

  const days = new Set<number>();
  let previous: DayToken | null = null;
  for (const token of tokens) {
    for (const day of token.days) days.add(day);
    if (token.single === null) {
      previous = null;
      continue;
    }
    if (previous?.single !== null && previous) {
      const between = text.slice(previous.end, token.start);
      if (isRangeConnector(between)) addDayRange(days, previous.single, token.single);
    }
    previous = token;
  }

  return [...days].sort((a, b) => a - b);
}

/**
 * Days a channel may post on.
 * Weekday words and named ranges count. No day hint means Monday–Friday.
 * Saturday and Sunday are included only when a time names them.
 */
export function allowedPostingDayIndexes(bestTimes: string[] | undefined): number[] {
  const days = new Set<number>();
  let sawHint = false;
  for (const raw of bestTimes ?? []) {
    const parsed = parseBestTimeDays(raw);
    if (parsed.length === 0) continue;
    sawHint = true;
    for (const day of parsed) days.add(day);
  }
  if (!sawHint) return [...WEEKDAY_INDEXES];
  return [...days].sort((a, b) => a - b);
}

/**
 * Spread `count` posts across `allowedDays`, or Mon–Sun when omitted.
 * At most one slot per day. Prefers non-consecutive days when the count allows.
 * `channelIndex` offsets the pattern so channels do not all land on the same days.
 */
export function spreadPostsAcrossWeek(
  count: number,
  channelIndex: number,
  allowedDays?: readonly number[]
): number[] {
  const days = (
    allowedDays ?? [0, 1, 2, 3, 4, 5, 6]
  )
    .filter((day, index, all) => day >= 0 && day <= 6 && all.indexOf(day) === index)
    .sort((a, b) => a - b);
  const n = Math.min(days.length, Math.max(0, Math.floor(count)));
  if (n <= 0) return [];
  const offset = ((channelIndex % days.length) + days.length) % days.length;
  if (n === 1) return [days[offset]];

  const used = new Set<number>();
  const picked: number[] = [];
  const span = days.length - 1;
  for (let i = 0; i < n; i++) {
    let pos = Math.round((i * span) / (n - 1));
    pos = (pos + offset) % days.length;
    let guard = 0;
    while (used.has(pos) && guard < days.length) {
      pos = (pos + 1) % days.length;
      guard += 1;
    }
    used.add(pos);
    picked.push(days[pos]);
  }
  return picked.sort((a, b) => a - b);
}

export function buildPostingRhythm(channels: StrategyChannel[]): RhythmDay[] {
  const days: RhythmDay[] = WEEKDAY_LABELS.map((label, dayIndex) => ({
    dayIndex,
    label,
    slots: [],
  }));

  let postingIndex = 0;
  for (const channel of orderedStrategyChannels(channels)) {
    if (!isPostingChannel(channel)) continue;
    const raw = channel.posts_per_week;
    const allowed = allowedPostingDayIndexes(channel.best_times);
    const n = Math.min(raw, allowed.length);
    const assigned = spreadPostsAcrossWeek(n, postingIndex, allowed);
    const time = channel.best_times?.find((item) => item.trim())?.trim() ?? null;
    for (const dayIndex of assigned) {
      days[dayIndex]?.slots.push({ channelName: channel.name, time });
    }
    postingIndex += 1;
  }

  return days;
}
