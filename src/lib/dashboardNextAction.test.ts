import { describe, expect, it } from "vitest";
import { resolveActivePlanNextAction, resolveDashboardNextAction } from "./dashboardNextAction";
import type { PlanDay } from "./plans";

function day(partial: Pick<PlanDay, "day_number" | "status"> & { title?: string }): PlanDay {
  return {
    id: `day-${partial.day_number}`,
    plan_id: "plan-1",
    user_id: "user-1",
    day_number: partial.day_number,
    kind: "post",
    title: partial.title ?? `Day ${partial.day_number} title`,
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

const foundationReady = {
  hasHealth: true,
  hasStory: true,
  hasCustomers: true,
  hasAccess: true,
  isGuest: false,
  progressReady: true,
  hasAim: true,
  hasStrategy: true,
  strategyId: "strategy-1",
  planReady: true,
};

describe("resolveActivePlanNextAction", () => {
  const plan = {
    id: "plan-1",
    startDate: "2026-10-20",
    lengthDays: 7,
    days: [day({ day_number: 1, status: "todo", title: "Film the pour" })],
  };

  it("prioritises today's undone task", () => {
    expect(resolveActivePlanNextAction(plan, new Date(2026, 9, 20))).toMatchObject({
      id: "today",
      title: "Today: Day 1, Film the pour",
      cta: "Open today's task",
      planId: "plan-1",
      dayNumber: 1,
      trackId: "dashboard_today_task",
    });
  });

  it("points at the next day when today is done", () => {
    const mixed = {
      ...plan,
      days: [
        day({ day_number: 1, status: "done" }),
        day({ day_number: 2, status: "todo", title: "Write the caption" }),
      ],
    };
    expect(resolveActivePlanNextAction(mixed, new Date(2026, 9, 20))).toMatchObject({
      id: "plan_next",
      title: "Today's task is done. Next up: Day 2",
      benefit: "Write the caption",
      cta: "Open today's task",
      dayNumber: 2,
    });
  });

  it("offers extend when the plan is complete", () => {
    const done = {
      ...plan,
      days: [day({ day_number: 1, status: "done" })],
    };
    expect(resolveActivePlanNextAction(done, new Date(2026, 9, 20))).toMatchObject({
      id: "plan_complete",
      title: "Plan complete",
      cta: "Extend my plan",
      trackId: "plan_extend",
    });
  });
});

describe("resolveDashboardNextAction", () => {
  it("lets an active plan beat every other suggestion", () => {
    const action = resolveDashboardNextAction({
      hasHealth: false,
      hasStory: false,
      hasCustomers: false,
      hasAccess: true,
      isGuest: false,
      progressReady: false,
      hasAim: false,
      hasStrategy: false,
      planReady: true,
      activePlan: {
        id: "plan-1",
        startDate: "2026-10-20",
        lengthDays: 7,
        days: [day({ day_number: 1, status: "todo", title: "Film the pour" })],
      },
      today: new Date(2026, 9, 20),
    });
    expect(action?.id).toBe("today");
    expect(action?.title).toBe("Today: Day 1, Film the pour");
  });

  it("asks to build a plan when a strategy exists and there is no active plan", () => {
    expect(resolveDashboardNextAction(foundationReady)).toMatchObject({
      id: "plan",
      title: "Build your day-by-day plan",
      cta: "Build your day-by-day plan",
      strategyId: "strategy-1",
    });
  });

  it("keeps the existing foundation order when there is no plan", () => {
    expect(
      resolveDashboardNextAction({
        ...foundationReady,
        hasHealth: false,
        hasStrategy: false,
      })?.id
    ).toBe("health");
    expect(
      resolveDashboardNextAction({
        ...foundationReady,
        hasAim: false,
        hasStrategy: false,
      })?.id
    ).toBe("aim");
  });

  it("waits while the active plan is still loading", () => {
    expect(
      resolveDashboardNextAction({
        ...foundationReady,
        planReady: false,
      })
    ).toBeNull();
  });
});
