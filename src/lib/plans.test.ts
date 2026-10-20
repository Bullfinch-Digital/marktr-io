import { describe, expect, it } from "vitest";
import { getPlanFocus, getTodayDayNumber, groupPlanDaysByWeek, planDayISODate } from "./plans";
import type { PlanDay } from "./plans";

function day(partial: Pick<PlanDay, "day_number" | "status">): PlanDay {
  return {
    id: `day-${partial.day_number}`,
    plan_id: "plan-1",
    user_id: "user-1",
    day_number: partial.day_number,
    kind: "post",
    title: `Day ${partial.day_number}`,
    task: "Write a post",
    channel: "Instagram",
    format: "Reel",
    minutes: 20,
    brief: null,
    why: null,
    status: partial.status,
    done_at: null,
    notes: "",
    results: "",
    created_at: "",
    updated_at: "",
  };
}

describe("getTodayDayNumber", () => {
  it("returns day 1 on the start date", () => {
    expect(getTodayDayNumber("2026-10-20", 7, new Date(2026, 9, 20))).toEqual({
      dayNumber: 1,
      ended: false,
    });
  });

  it("uses the local calendar date, not UTC", () => {
    expect(getTodayDayNumber("2026-10-20", 7, new Date(2026, 9, 21, 0, 30))).toEqual({
      dayNumber: 2,
      ended: false,
    });
  });

  it("clamps to day 1 before the start date", () => {
    expect(getTodayDayNumber("2026-10-20", 14, new Date(2026, 9, 10))).toEqual({
      dayNumber: 1,
      ended: false,
    });
  });

  it("returns the last in-range day on the final date", () => {
    expect(getTodayDayNumber("2026-10-20", 7, new Date(2026, 9, 26))).toEqual({
      dayNumber: 7,
      ended: false,
    });
  });

  it("returns lengthDays + 1 and ended after the plan finishes", () => {
    expect(getTodayDayNumber("2026-10-20", 7, new Date(2026, 9, 27))).toEqual({
      dayNumber: 8,
      ended: true,
    });
    expect(getTodayDayNumber("2026-10-01", 30, new Date(2026, 10, 1))).toEqual({
      dayNumber: 31,
      ended: true,
    });
  });
});

describe("getPlanFocus", () => {
  const days = [day({ day_number: 1, status: "todo" }), day({ day_number: 2, status: "todo" })];

  it("uses the first undone day on or before today", () => {
    expect(getPlanFocus("2026-10-20", 7, days, new Date(2026, 9, 21))).toEqual({
      kind: "today",
      day: days[0],
    });
  });

  it("returns next up when today is done", () => {
    const mixed = [day({ day_number: 1, status: "done" }), day({ day_number: 2, status: "todo" })];
    expect(getPlanFocus("2026-10-20", 7, mixed, new Date(2026, 9, 20))).toEqual({
      kind: "next",
      day: mixed[1],
    });
  });

  it("returns next up before the start date", () => {
    expect(getPlanFocus("2026-10-20", 7, days, new Date(2026, 9, 10))).toEqual({
      kind: "next",
      day: days[0],
    });
  });

  it("returns complete when every day is done", () => {
    const done = [day({ day_number: 1, status: "done" }), day({ day_number: 2, status: "done" })];
    expect(getPlanFocus("2026-10-20", 7, done, new Date(2026, 9, 21))).toEqual({
      kind: "complete",
    });
  });
});

describe("plan day helpers", () => {
  it("dates a day from the local start date", () => {
    expect(planDayISODate("2026-10-20", 1)).toBe("2026-10-20");
    expect(planDayISODate("2026-10-20", 3)).toBe("2026-10-22");
  });

  it("groups days into weeks of seven", () => {
    const days = [1, 7, 8, 14].map((n) => day({ day_number: n, status: "todo" }));
    expect(groupPlanDaysByWeek(days).map((group) => group.week)).toEqual([1, 2]);
    expect(groupPlanDaysByWeek(days)[0].days.map((item) => item.day_number)).toEqual([1, 7]);
  });
});
