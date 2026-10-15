import { describe, expect, it } from "vitest";
import type { StrategyChannel } from "../types/icpStrategyPayload";
import {
  computeWeeklyProgress,
  nextUnloggedRhythmSlot,
  streakFromWeekFlags,
  weeklyPostTarget,
  weeklyProgressCopy,
} from "./weeklyProgress";

const channels: StrategyChannel[] = [
  { name: "Instagram", role: "primary", posts_per_week: 3, best_times: ["Thursday"] },
  { name: "Website", role: "primary", posts_per_week: 0, best_times: [] },
  { name: "Email", role: "secondary", posts_per_week: 1, best_times: ["Tuesday"] },
];

describe("weeklyPostTarget", () => {
  it("sums posts_per_week and ignores zeros", () => {
    expect(weeklyPostTarget(channels)).toBe(4);
    expect(weeklyPostTarget([])).toBe(0);
    expect(weeklyPostTarget([{ name: "Site", role: "primary", posts_per_week: 0 }])).toBe(0);
  });

  it("excludes Website even when it stores posts_per_week (target 5)", () => {
    expect(
      weeklyPostTarget([
        { name: "Instagram", role: "primary", posts_per_week: 3 },
        { name: "Website", role: "primary", posts_per_week: 1 },
        { name: "YouTube", role: "secondary", posts_per_week: 1 },
        { name: "Email newsletter", role: "secondary", posts_per_week: 1 },
      ])
    ).toBe(5);
  });
});

describe("streakFromWeekFlags", () => {
  it("counts consecutive met weeks ending at the given index", () => {
    expect(streakFromWeekFlags([true, true, true], 2)).toEqual({ streak: 3, restWeekUsed: false });
  });

  it("forgives a single gap between counted weeks", () => {
    expect(streakFromWeekFlags([true, false, true], 2)).toEqual({ streak: 2, restWeekUsed: true });
  });

  it("breaks on two missed weeks in a row", () => {
    expect(streakFromWeekFlags([true, false, false, true], 3)).toEqual({
      streak: 1,
      restWeekUsed: false,
    });
  });

  it("does not treat a trailing oldest miss as a rest week", () => {
    expect(streakFromWeekFlags([false, true, true], 2)).toEqual({ streak: 2, restWeekUsed: false });
  });

  it("returns zero when the end week is unmet", () => {
    expect(streakFromWeekFlags([true, true, false], 2)).toEqual({ streak: 0, restWeekUsed: false });
  });
});

describe("weeklyProgressCopy", () => {
  it("uses the empty, partway, met, and at-risk lines exactly", () => {
    expect(
      weeklyProgressCopy({
        everLogged: false,
        remaining: 4,
        postsThisWeek: 0,
        currentWeekMet: false,
        streak: 0,
        fridayOrLater: false,
      }).text
    ).toBe("Mark your first post to start your streak.");

    expect(
      weeklyProgressCopy({
        everLogged: true,
        remaining: 2,
        postsThisWeek: 2,
        currentWeekMet: false,
        streak: 2,
        fridayOrLater: false,
      }).text
    ).toBe("2 to go this week. You've got this.");

    expect(
      weeklyProgressCopy({
        everLogged: true,
        remaining: 0,
        postsThisWeek: 4,
        currentWeekMet: true,
        streak: 2,
        fridayOrLater: true,
      }).text
    ).toBe("Goal reached. Nice work, 4 posts this week.");

    expect(
      weeklyProgressCopy({
        everLogged: true,
        remaining: 1,
        postsThisWeek: 3,
        currentWeekMet: false,
        streak: 2,
        fridayOrLater: true,
      }).text
    ).toBe("1 more post keeps your 2-week streak going.");

    expect(
      weeklyProgressCopy({
        everLogged: true,
        remaining: 2,
        postsThisWeek: 2,
        currentWeekMet: false,
        streak: 2,
        fridayOrLater: true,
      }).text
    ).toBe("2 more posts keeps your 2-week streak going.");
  });
});

describe("computeWeeklyProgress", () => {
  it("hides when there is no weekly target", () => {
    expect(computeWeeklyProgress([], [], new Date(2026, 9, 15)).visible).toBe(false);
  });

  it("ends the streak on the current week when the goal is already met", () => {
    const rows = [
      { channel: "Instagram", posted_on: "2026-10-05" },
      { channel: "Instagram", posted_on: "2026-10-06" },
      { channel: "Instagram", posted_on: "2026-10-07" },
      { channel: "Email", posted_on: "2026-10-08" },
      { channel: "Instagram", posted_on: "2026-10-12" },
      { channel: "Instagram", posted_on: "2026-10-13" },
      { channel: "Instagram", posted_on: "2026-10-14" },
      { channel: "Email", posted_on: "2026-10-15" },
    ];
    const snapshot = computeWeeklyProgress(channels, rows, new Date(2026, 9, 15));
    expect(snapshot.visible).toBe(true);
    expect(snapshot.postsThisWeek).toBe(4);
    expect(snapshot.streak).toBe(2);
    expect(snapshot.restWeekUsed).toBe(false);
    expect(snapshot.copy).toBe("Goal reached. Nice work, 4 posts this week.");
  });

  it("ends the streak last week when the current week is still open, and notes a rest week", () => {
    const rows = [
      { channel: "Instagram", posted_on: "2026-09-21" },
      { channel: "Instagram", posted_on: "2026-09-22" },
      { channel: "Instagram", posted_on: "2026-09-23" },
      { channel: "Email", posted_on: "2026-09-24" },
      { channel: "Instagram", posted_on: "2026-10-05" },
      { channel: "Instagram", posted_on: "2026-10-06" },
      { channel: "Instagram", posted_on: "2026-10-07" },
      { channel: "Email", posted_on: "2026-10-08" },
      { channel: "Instagram", posted_on: "2026-10-14" },
    ];
    const wednesday = computeWeeklyProgress(channels, rows, new Date(2026, 9, 14));
    expect(wednesday.postsThisWeek).toBe(1);
    expect(wednesday.streak).toBe(2);
    expect(wednesday.restWeekUsed).toBe(true);
    expect(wednesday.copy).toBe("3 to go this week. You've got this.");

    const friday = computeWeeklyProgress(channels, rows, new Date(2026, 9, 16));
    expect(friday.copy).toBe("3 more posts keeps your 2-week streak going.");
  });
});

describe("nextUnloggedRhythmSlot", () => {
  it("returns the next remaining slot from today", () => {
    const rows = [{ channel: "Email", posted_on: "2026-10-13" }];
    expect(nextUnloggedRhythmSlot(channels, rows, new Date(2026, 9, 14))).toEqual({
      channelName: "Instagram",
      weekday: "Thursday",
    });
  });

  it("returns null when no remaining slots are known", () => {
    expect(nextUnloggedRhythmSlot([], [], new Date(2026, 9, 15))).toBeNull();
  });
});
