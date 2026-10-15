import type { StrategyChannel } from "../types/icpStrategyPayload";
import { lastNLocalWeekRanges, localISODate, startOfLocalMondayWeek } from "./localCalendar";
import { WEEKDAY_LABELS, buildPostingRhythm, isPostingChannel } from "./strategyPostingRhythm";

export const WEEKLY_PROGRESS_LOOKBACK_WEEKS = 12;

export type PostLogLike = {
  channel: string;
  posted_on: string;
};

export type WeeklyProgressCopyKind = "empty" | "partway" | "met" | "at_risk";

export type NextRhythmStep = {
  channelName: string;
  weekday: (typeof WEEKDAY_LABELS)[number];
};

export type WeeklyProgressSnapshot = {
  visible: boolean;
  target: number;
  postsThisWeek: number;
  remaining: number;
  ratio: number;
  streak: number;
  restWeekUsed: boolean;
  everLogged: boolean;
  copyKind: WeeklyProgressCopyKind;
  copy: string;
  nextStep: NextRhythmStep | null;
};

/** Sum of posts_per_week on posting channels only. */
export function weeklyPostTarget(channels: StrategyChannel[] | undefined): number {
  if (!channels?.length) return 0;
  return channels.reduce((sum, channel) => {
    if (!isPostingChannel(channel)) return sum;
    return sum + channel.posts_per_week;
  }, 0);
}

export function countPostsInRange(rows: PostLogLike[], start: string, end: string): number {
  return rows.filter((row) => row.posted_on >= start && row.posted_on <= end).length;
}

/**
 * Consecutive counted weeks, walking back from `endIndex`.
 * A counted week has posts >= target. One unmet week between counted weeks is
 * forgiven and does not add to the streak; two unmet weeks in a row stop it.
 */
export function streakFromWeekFlags(met: boolean[], endIndex: number): {
  streak: number;
  restWeekUsed: boolean;
} {
  if (endIndex < 0 || endIndex >= met.length || !met[endIndex]) {
    return { streak: 0, restWeekUsed: false };
  }

  let streak = 0;
  let restWeekUsed = false;
  for (let i = endIndex; i >= 0; i--) {
    if (met[i]) {
      streak += 1;
      continue;
    }
    if (restWeekUsed) break;
    const older = i - 1;
    if (older < 0 || !met[older]) break;
    restWeekUsed = true;
  }
  return { streak, restWeekUsed };
}

export function isLocalFridayOrLater(date: Date): boolean {
  const weekday = date.getDay();
  return weekday === 0 || weekday >= 5;
}

export function weeklyProgressCopy(input: {
  everLogged: boolean;
  remaining: number;
  postsThisWeek: number;
  currentWeekMet: boolean;
  streak: number;
  fridayOrLater: boolean;
}): { kind: WeeklyProgressCopyKind; text: string } {
  if (!input.everLogged) {
    return { kind: "empty", text: "Mark your first post to start your streak." };
  }
  if (!input.currentWeekMet && input.fridayOrLater && input.streak > 0) {
    const n = input.remaining;
    const postWord = n === 1 ? "post" : "posts";
    return {
      kind: "at_risk",
      text: `${n} more ${postWord} keeps your ${input.streak}-week streak going.`,
    };
  }
  if (input.currentWeekMet) {
    return {
      kind: "met",
      text: `Goal reached. Nice work, ${input.postsThisWeek} posts this week.`,
    };
  }
  return {
    kind: "partway",
    text: `${input.remaining} to go this week. You've got this.`,
  };
}

/** Next unlogged rhythm slot from today through Sunday, or null if unknown. */
export function nextUnloggedRhythmSlot(
  channels: StrategyChannel[] | undefined,
  rows: PostLogLike[],
  date: Date = new Date()
): NextRhythmStep | null {
  if (!channels?.length) return null;
  const week = buildPostingRhythm(channels);
  const monday = startOfLocalMondayWeek(date);
  const todayKey = localISODate(date);
  for (const day of week) {
    const postedOn = localISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day.dayIndex));
    if (postedOn < todayKey) continue;
    for (const slot of day.slots) {
      const logged = rows.some((row) => row.channel === slot.channelName && row.posted_on === postedOn);
      if (!logged) {
        return { channelName: slot.channelName, weekday: day.label };
      }
    }
  }
  return null;
}

export function computeWeeklyProgress(
  channels: StrategyChannel[] | undefined,
  rows: PostLogLike[],
  date: Date = new Date()
): WeeklyProgressSnapshot {
  const target = weeklyPostTarget(channels);
  if (target <= 0) {
    return {
      visible: false,
      target: 0,
      postsThisWeek: 0,
      remaining: 0,
      ratio: 0,
      streak: 0,
      restWeekUsed: false,
      everLogged: false,
      copyKind: "empty",
      copy: "",
      nextStep: null,
    };
  }

  const weeks = lastNLocalWeekRanges(WEEKLY_PROGRESS_LOOKBACK_WEEKS, date);
  const met = weeks.map((week) => countPostsInRange(rows, week.start, week.end) >= target);
  const currentIndex = weeks.length - 1;
  const currentWeek = weeks[currentIndex];
  const postsThisWeek = countPostsInRange(rows, currentWeek.start, currentWeek.end);
  const currentWeekMet = met[currentIndex];
  const streakEnd = currentWeekMet ? currentIndex : currentIndex - 1;
  const { streak, restWeekUsed } = streakFromWeekFlags(met, streakEnd);
  const remaining = Math.max(0, target - postsThisWeek);
  const everLogged = rows.length > 0;
  const { kind, text } = weeklyProgressCopy({
    everLogged,
    remaining,
    postsThisWeek,
    currentWeekMet,
    streak,
    fridayOrLater: isLocalFridayOrLater(date),
  });

  return {
    visible: true,
    target,
    postsThisWeek,
    remaining,
    ratio: Math.min(1, postsThisWeek / target),
    streak,
    restWeekUsed,
    everLogged,
    copyKind: kind,
    copy: text,
    nextStep: nextUnloggedRhythmSlot(channels, rows, date),
  };
}
