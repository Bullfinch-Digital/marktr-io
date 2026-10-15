import { describe, expect, it } from "vitest";
import type { StrategyChannel } from "../types/icpStrategyPayload";
import {
  buildPostingRhythm,
  orderedStrategyChannels,
  spreadPostsAcrossWeek,
  strategyHasChannelRhythm,
} from "./strategyPostingRhythm";

describe("spreadPostsAcrossWeek", () => {
  it("is deterministic and unique within a channel", () => {
    const first = spreadPostsAcrossWeek(3, 0);
    const second = spreadPostsAcrossWeek(3, 0);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
    expect(first).toHaveLength(3);
    expect(first.every((day) => day >= 0 && day <= 6)).toBe(true);
  });

  it("avoids consecutive days when the count allows", () => {
    expect(spreadPostsAcrossWeek(1, 0)).toEqual([0]);
    expect(spreadPostsAcrossWeek(2, 0)).toEqual([0, 6]);
    expect(spreadPostsAcrossWeek(3, 0)).toEqual([0, 3, 6]);
    expect(spreadPostsAcrossWeek(4, 0)).toEqual([0, 2, 4, 6]);
    for (const count of [2, 3, 4]) {
      const days = spreadPostsAcrossWeek(count, 0);
      for (let i = 1; i < days.length; i++) {
        expect(days[i] - days[i - 1]).toBeGreaterThan(1);
      }
    }
  });

  it("offsets later channels so they do not clone the first pattern", () => {
    expect(spreadPostsAcrossWeek(3, 0)).not.toEqual(spreadPostsAcrossWeek(3, 1));
  });
});

describe("buildPostingRhythm", () => {
  const channels: StrategyChannel[] = [
    {
      name: "Instagram",
      role: "primary",
      posts_per_week: 3,
      best_times: ["Weekday mornings, 7-9am", "Friday 5pm"],
    },
    {
      name: "Email",
      role: "secondary",
      posts_per_week: 1,
      best_times: ["Tuesday 10am"],
    },
  ];

  it("places at most one post per channel per day and uses the first best_time", () => {
    const week = buildPostingRhythm(channels);
    expect(week).toHaveLength(7);
    expect(week[0].label).toBe("Monday");
    expect(week[6].label).toBe("Sunday");

    const instagramDays = week.filter((day) =>
      day.slots.some((slot) => slot.channelName === "Instagram")
    );
    expect(instagramDays).toHaveLength(3);
    instagramDays.forEach((day) => {
      expect(day.slots.filter((slot) => slot.channelName === "Instagram")).toHaveLength(1);
      expect(day.slots.find((slot) => slot.channelName === "Instagram")?.time).toBe(
        "Weekday mornings, 7-9am"
      );
    });
  });

  it("skips channels without posts_per_week", () => {
    const week = buildPostingRhythm([
      { name: "LinkedIn", role: "primary", why_platform: "B2B reach" },
    ]);
    expect(week.every((day) => day.slots.length === 0)).toBe(true);
  });
});

describe("strategyHasChannelRhythm", () => {
  it("is false when channels are missing or empty", () => {
    expect(strategyHasChannelRhythm(null)).toBe(false);
    expect(
      strategyHasChannelRhythm({
        channel_plan: {
          primary_channel: "Instagram",
          secondary_channels: [],
          first_14_days: [],
        },
      } as never)
    ).toBe(false);
  });
});

describe("orderedStrategyChannels", () => {
  it("lists primary before secondary", () => {
    const ordered = orderedStrategyChannels([
      { name: "Email", role: "secondary" },
      { name: "Instagram", role: "primary" },
    ]);
    expect(ordered.map((channel) => channel.name)).toEqual(["Instagram", "Email"]);
  });
});
