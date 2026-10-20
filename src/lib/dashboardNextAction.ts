import { getPlanFocus, type PlanDay } from "./plans";

export type DashboardNextActionId =
  | "health"
  | "story"
  | "customer"
  | "aim"
  | "strategy"
  | "plan"
  | "today"
  | "plan_next"
  | "plan_complete"
  | "trial";

export type DashboardNextAction = {
  id: DashboardNextActionId;
  title: string;
  benefit: string;
  cta: string;
  aimLineageId?: string;
  strategyId?: string;
  planId?: string;
  dayNumber?: number;
  trackId?: string;
};

export type DashboardActivePlanInput = {
  id: string;
  startDate: string;
  lengthDays: number;
  days: PlanDay[];
};

const PLAN_BUILD_BENEFIT = "One clear task a day, from the strategy you already wrote.";

const FOURTEEN_DAY_CHECKS_PREFIX = "marktr_first_14_checks:";

type FourteenDayEntry = {
  text: string;
  ticked: boolean;
};

function fourteenDayEntries(items: unknown): FourteenDayEntry[] {
  if (!Array.isArray(items)) return [];
  const entries: FourteenDayEntry[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) entries.push({ text, ticked: false });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const textCandidate = [record.text, record.label, record.title].find(
      (value) => typeof value === "string" && value.trim()
    );
    if (typeof textCandidate !== "string") continue;
    const ticked =
      record.done === true || record.checked === true || record.ticked === true;
    entries.push({ text: textCandidate.trim(), ticked });
  }
  return entries;
}

/** Persisted tick list, when a checklist has saved one. Absent means no saved ticks. */
export function readFourteenDayChecks(strategyId: string): boolean[] | null {
  if (typeof localStorage === "undefined" || !strategyId) return null;
  try {
    const raw = localStorage.getItem(`${FOURTEEN_DAY_CHECKS_PREFIX}${strategyId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "boolean")) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** First unticked line when the strategy has a First 14 days list. */
export function firstUntickedFourteenDayItem(
  items: unknown,
  checks: boolean[] | null
): string | null {
  const entries = fourteenDayEntries(items);
  if (entries.length === 0) return null;
  for (let index = 0; index < entries.length; index += 1) {
    const savedTick = checks?.[index] === true;
    if (!savedTick && !entries[index].ticked) return entries[index].text;
  }
  return null;
}

export function resolveActivePlanNextAction(
  plan: DashboardActivePlanInput,
  today: Date = new Date()
): DashboardNextAction {
  const focus = getPlanFocus(plan.startDate, plan.lengthDays, plan.days, today);
  if (focus.kind === "complete") {
    return {
      id: "plan_complete",
      title: "Plan complete",
      benefit: "We’ll use your notes and results to shape the next round.",
      cta: "Extend my plan",
      planId: plan.id,
      trackId: "plan_extend",
    };
  }
  if (focus.kind === "today") {
    return {
      id: "today",
      title: `Today: Day ${focus.day.day_number}, ${focus.day.title}`,
      benefit: focus.day.task,
      cta: "Open today's task",
      planId: plan.id,
      dayNumber: focus.day.day_number,
      trackId: "dashboard_today_task",
    };
  }
  return {
    id: "plan_next",
    title: `Today's task is done. Next up: Day ${focus.day.day_number}`,
    benefit: focus.day.title,
    cta: "Open today's task",
    planId: plan.id,
    dayNumber: focus.day.day_number,
    trackId: "dashboard_today_task",
  };
}

export function resolveDashboardNextAction(input: {
  hasHealth: boolean;
  hasStory: boolean;
  hasCustomers: boolean;
  hasAccess: boolean;
  isGuest: boolean;
  /** Null while aims or strategies are still loading for someone with access. */
  progressReady: boolean;
  hasAim: boolean;
  aimLineageId?: string | null;
  hasStrategy: boolean;
  strategyId?: string | null;
  firstUntickedPlanItem?: string | null;
  /** Null while the active plan is still loading for someone with access. */
  planReady?: boolean;
  activePlan?: DashboardActivePlanInput | null;
  today?: Date;
}): DashboardNextAction | null {
  if (input.hasAccess) {
    if (input.planReady === false) return null;
    if (input.activePlan) {
      return resolveActivePlanNextAction(input.activePlan, input.today);
    }
  }

  if (!input.hasHealth) {
    return {
      id: "health",
      title: "Start your digital health check",
      benefit: "A clear score for your website, story, content, and socials.",
      cta: "Start your digital health check",
    };
  }
  if (!input.hasStory) {
    return {
      id: "story",
      title: "Write your brand story",
      benefit: "A story the rest of your marketing can follow.",
      cta: "Write your brand story",
    };
  }
  if (!input.hasCustomers) {
    return {
      id: "customer",
      title: "Know your customer",
      benefit: "A picture of who you serve, so your content has someone to talk to.",
      cta: "Know your customer",
    };
  }
  if (input.hasAccess) {
    if (!input.progressReady) return null;
    if (!input.hasAim) {
      return {
        id: "aim",
        title: "Add your first aim",
        benefit: "Your aims turn into a strategy you can follow day by day.",
        cta: "Add your first aim",
      };
    }
    if (!input.hasStrategy) {
      return {
        id: "strategy",
        title: "Build your first strategy",
        benefit: "A plan built from your aim, ready to follow day by day.",
        cta: "Build your first strategy",
        aimLineageId: input.aimLineageId ?? undefined,
      };
    }
    return {
      id: "plan",
      title: "Build your day-by-day plan",
      benefit: input.firstUntickedPlanItem?.trim() || PLAN_BUILD_BENEFIT,
      cta: "Build your day-by-day plan",
      strategyId: input.strategyId ?? undefined,
    };
  }
  if (input.isGuest) {
    return {
      id: "trial",
      title: "Start your 14-day free trial",
      benefit: "A strategy, a 14-day plan, and a weekly rhythm for what to post.",
      cta: "Start your 14-day free trial",
    };
  }
  return null;
}
