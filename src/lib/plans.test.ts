import { describe, expect, it } from "vitest";
import { getTodayDayNumber } from "./plans";

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
