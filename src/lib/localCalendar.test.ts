import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  currentLocalWeekDates,
  lastNLocalWeekRanges,
  localISODate,
  startOfLocalMondayWeek,
} from "./localCalendar";

describe("localCalendar", () => {
  it("formats the local calendar date", () => {
    expect(localISODate(new Date(2026, 9, 15))).toBe("2026-10-15");
  });

  it("starts the week on Monday, including when today is Sunday", () => {
    expect(localISODate(startOfLocalMondayWeek(new Date(2026, 9, 15)))).toBe("2026-10-12");
    expect(localISODate(startOfLocalMondayWeek(new Date(2026, 9, 18)))).toBe("2026-10-12");
  });

  it("lists seven local dates for the current week", () => {
    expect(currentLocalWeekDates(new Date(2026, 9, 15))).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(localISODate(addLocalDays(new Date(2026, 9, 15), 1))).toBe("2026-10-16");
  });

  it("lists the last 12 local weeks oldest-first, ending on the current week", () => {
    const weeks = lastNLocalWeekRanges(12, new Date(2026, 9, 15));
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toEqual({ start: "2026-07-27", end: "2026-08-02" });
    expect(weeks[11]).toEqual({ start: "2026-10-12", end: "2026-10-18" });
    expect(weeks[10]).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });
});
