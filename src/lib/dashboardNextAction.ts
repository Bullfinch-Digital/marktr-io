export type DashboardNextActionId =
  | "health"
  | "story"
  | "customer"
  | "aim"
  | "strategy"
  | "plan"
  | "trial";

export type DashboardNextAction = {
  id: DashboardNextActionId;
  title: string;
  benefit: string;
  cta: string;
  aimLineageId?: string;
  strategyId?: string;
};

const PLAN_BENEFIT = "A 14-day plan with the content to do each task.";

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
}): DashboardNextAction | null {
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
      title: "Start your 14-day plan",
      benefit: input.firstUntickedPlanItem?.trim() || PLAN_BENEFIT,
      cta: "Start your 14-day plan",
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
