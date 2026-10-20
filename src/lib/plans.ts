import { supabase } from "../config/supabase";
import { addLocalDays, localISODate } from "./localCalendar";
import type { ContentItemRow, ContentItemType } from "../types/contentItemPayload";
import { normalizeContentPayload } from "./contentItemPayload";

export type PlanLengthDays = 7 | 14 | 30;
export type PlanStatus = "active" | "archived";
export type PlanDayKind = "post" | "prep" | "review" | "rest";
export type PlanDayStatus = "todo" | "done";

export type Plan = {
  id: string;
  user_id: string;
  strategy_id: string;
  title: string;
  length_days: PlanLengthDays;
  start_date: string;
  status: PlanStatus;
  extended_from: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanDay = {
  id: string;
  plan_id: string;
  user_id: string;
  day_number: number;
  kind: PlanDayKind;
  title: string;
  task: string;
  channel: string | null;
  format: string | null;
  minutes: number | null;
  brief: string | null;
  why: string | null;
  status: PlanDayStatus;
  done_at: string | null;
  notes: string;
  results: string;
  created_at: string;
  updated_at: string;
};

export type PlanDayContent = {
  id: string;
  plan_day_id: string;
  user_id: string;
  content_id: string;
  created_at: string;
};

export type ContentPlanOrigin = {
  contentId: string;
  planId: string;
  dayNumber: number;
};

export const PLAN_LEARNING_CONTEXT_MAX = 1200;

export type PlanWithDays = Plan & { days: PlanDay[] };

export type PlanInsert = {
  user_id: string;
  strategy_id: string;
  title: string;
  length_days: PlanLengthDays;
  start_date?: string;
  status?: PlanStatus;
  extended_from?: string | null;
};

export type PlanDayInsert = {
  day_number: number;
  kind?: PlanDayKind;
  title: string;
  task: string;
  channel?: string | null;
  format?: string | null;
  minutes?: number | null;
  brief?: string | null;
  why?: string | null;
};

export type TodayDayNumber = {
  dayNumber: number;
  ended: boolean;
};

export type PlanFocus =
  | { kind: "today"; day: PlanDay }
  | { kind: "next"; day: PlanDay }
  | { kind: "complete" };

export type PlanDayCounts = {
  planId: string;
  done: number;
  total: number;
};

export type GeneratePlanOptions = {
  extendFromPlanId?: string;
  startDate?: string;
};

export const PLANS_CHANGED_EVENT = "plans:changed";

export function notifyPlansChanged() {
  try {
    window.dispatchEvent(new Event(PLANS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

const PLAN_COLUMNS =
  "id, user_id, strategy_id, title, length_days, start_date, status, extended_from, created_at, updated_at";

const PLAN_DAY_COLUMNS =
  "id, plan_id, user_id, day_number, kind, title, task, channel, format, minutes, brief, why, status, done_at, notes, results, created_at, updated_at";

const PLAN_DAY_CONTENT_COLUMNS = "id, plan_day_id, user_id, content_id, created_at";

function parseLocalISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Local-calendar day of the plan. Clamps to 1 before start.
 * After the last day, `ended` is true and `dayNumber` is `lengthDays + 1`.
 */
export function getTodayDayNumber(
  startDate: string,
  lengthDays: number,
  today: Date = new Date()
): TodayDayNumber {
  const start = parseLocalISODate(startDate);
  const current = parseLocalISODate(localISODate(today));
  const dayNumber = Math.round((current.getTime() - start.getTime()) / 86_400_000) + 1;
  if (dayNumber > lengthDays) {
    return { dayNumber: lengthDays + 1, ended: true };
  }
  return { dayNumber: Math.max(1, dayNumber), ended: false };
}

export function planDayISODate(startDate: string, dayNumber: number): string {
  return localISODate(addLocalDays(parseLocalISODate(startDate), dayNumber - 1));
}

export function mapPlanFormatToContentType(
  channel?: string | null,
  format?: string | null
): ContentItemType {
  const hay = `${channel ?? ""} ${format ?? ""}`.toLowerCase();
  if (hay.includes("email") || hay.includes("newsletter")) return "email";
  if (hay.includes("landing")) return "landing_page";
  if (hay.includes("carousel")) return "ig_carousel";
  if (hay.includes("story")) return "ig_story";
  if (hay.includes("reel") || hay.includes("tiktok") || hay.includes("short")) return "reel_brief";
  return "ig_single";
}

/**
 * Notes and results from this day and earlier days, newest first.
 * Caps at ~1,200 characters. No titles, names, or other personal fields.
 */
export function buildPlanLearningContext(
  days: Array<Pick<PlanDay, "day_number" | "notes" | "results">>,
  upToDayNumber: number
): string {
  const relevant = [...days]
    .filter((day) => day.day_number <= upToDayNumber)
    .sort((a, b) => b.day_number - a.day_number);

  const parts: string[] = [];
  for (const day of relevant) {
    const notes = day.notes.trim();
    const results = day.results.trim();
    if (!notes && !results) continue;
    const bits = [`Day ${day.day_number}`];
    if (notes) bits.push(`What I did: ${notes}`);
    if (results) bits.push(`What happened: ${results}`);
    parts.push(bits.join(" — "));
  }

  const text = parts.join("\n");
  if (text.length <= PLAN_LEARNING_CONTEXT_MAX) return text;
  return `${text.slice(0, PLAN_LEARNING_CONTEXT_MAX - 1).trimEnd()}…`;
}

export function groupPlanDaysByWeek(days: PlanDay[]): { week: number; days: PlanDay[] }[] {
  const groups = new Map<number, PlanDay[]>();
  for (const day of [...days].sort((a, b) => a.day_number - b.day_number)) {
    const week = Math.ceil(day.day_number / 7);
    const list = groups.get(week) ?? [];
    list.push(day);
    groups.set(week, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, weekDays]) => ({ week, days: weekDays }));
}

/**
 * Today card: first undone day on or before today.
 * If today's day is done, the next undone day is "Next up".
 * Before the start date, day 1 is next up.
 */
export function getPlanFocus(
  startDate: string,
  lengthDays: number,
  days: PlanDay[],
  today: Date = new Date()
): PlanFocus {
  const ordered = [...days].sort((a, b) => a.day_number - b.day_number);
  if (ordered.length === 0 || ordered.every((day) => day.status === "done")) {
    return { kind: "complete" };
  }

  const todayIso = localISODate(today);
  if (todayIso < startDate) {
    const first = ordered.find((day) => day.status !== "done");
    return first ? { kind: "next", day: first } : { kind: "complete" };
  }

  const { dayNumber } = getTodayDayNumber(startDate, lengthDays, today);
  const overdue = ordered.filter((day) => day.day_number <= dayNumber && day.status !== "done");
  if (overdue.length > 0) {
    return { kind: "today", day: overdue[0] };
  }

  const upcoming = ordered.find((day) => day.day_number > dayNumber && day.status !== "done");
  if (upcoming) return { kind: "next", day: upcoming };
  return { kind: "complete" };
}

export async function listPlans(userId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[plans] listPlans failed", error);
    throw error;
  }
  return (data ?? []) as Plan[];
}

export async function listPlansForStrategy(userId: string, strategyId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("user_id", userId)
    .eq("strategy_id", strategyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[plans] listPlansForStrategy failed", error);
    throw error;
  }
  return (data ?? []) as Plan[];
}

export async function getPlanWithDays(planId: string, userId?: string): Promise<PlanWithDays | null> {
  let planQuery = supabase.from("plans").select(PLAN_COLUMNS).eq("id", planId);
  if (userId) planQuery = planQuery.eq("user_id", userId);

  const { data: plan, error: planError } = await planQuery.maybeSingle();
  if (planError) {
    console.error("[plans] getPlanWithDays plan failed", planError);
    throw planError;
  }
  if (!plan) return null;

  let daysQuery = supabase
    .from("plan_days")
    .select(PLAN_DAY_COLUMNS)
    .eq("plan_id", planId)
    .order("day_number", { ascending: true });
  if (userId) daysQuery = daysQuery.eq("user_id", userId);

  const { data: days, error: daysError } = await daysQuery;
  if (daysError) {
    console.error("[plans] getPlanWithDays days failed", daysError);
    throw daysError;
  }

  return { ...(plan as Plan), days: (days ?? []) as PlanDay[] };
}

export type GeneratedPlanPayload = {
  title: string;
  days: PlanDayInsert[];
};

export async function generatePlan(
  strategyId: string,
  lengthDays: PlanLengthDays,
  options?: GeneratePlanOptions
): Promise<PlanWithDays> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    console.error("[plans] generatePlan auth failed", userError);
    throw userError ?? new Error("Unauthenticated");
  }

  const extendFromPlanId = options?.extendFromPlanId;
  const { data, error } = await supabase.functions.invoke("generate-plan", {
    body: {
      strategy_id: strategyId,
      length_days: lengthDays,
      ...(extendFromPlanId ? { extend_from_plan_id: extendFromPlanId } : {}),
    },
  });

  if (error) {
    console.error("[plans] generatePlan invoke failed", error);
    throw error;
  }

  const payload = data as GeneratedPlanPayload | null;
  if (!payload?.title || !Array.isArray(payload.days)) {
    throw new Error("Plan generation returned no plan");
  }

  const created = await createPlanWithDays(
    {
      user_id: userId,
      strategy_id: strategyId,
      title: payload.title,
      length_days: lengthDays,
      ...(options?.startDate ? { start_date: options.startDate } : {}),
      ...(extendFromPlanId ? { extended_from: extendFromPlanId } : {}),
    },
    payload.days
  );

  const existing = await listPlansForStrategy(userId, strategyId);
  const previousActive = existing.filter((plan) => plan.status === "active" && plan.id !== created.id);
  for (const plan of previousActive) {
    await archivePlan(plan.id);
  }

  notifyPlansChanged();
  return created;
}

export async function listPlanDayCounts(userId: string, planIds: string[]): Promise<PlanDayCounts[]> {
  if (planIds.length === 0) return [];

  const { data, error } = await supabase
    .from("plan_days")
    .select("plan_id, status")
    .eq("user_id", userId)
    .in("plan_id", planIds);

  if (error) {
    console.error("[plans] listPlanDayCounts failed", error);
    throw error;
  }

  const totals = new Map<string, PlanDayCounts>();
  for (const id of planIds) {
    totals.set(id, { planId: id, done: 0, total: 0 });
  }
  for (const row of (data ?? []) as Array<{ plan_id: string; status: PlanDayStatus }>) {
    const current = totals.get(row.plan_id);
    if (!current) continue;
    current.total += 1;
    if (row.status === "done") current.done += 1;
  }
  return [...totals.values()];
}

export async function createPlanWithDays(plan: PlanInsert, days: PlanDayInsert[]): Promise<PlanWithDays> {
  const { data: created, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id: plan.user_id,
      strategy_id: plan.strategy_id,
      title: plan.title,
      length_days: plan.length_days,
      ...(plan.start_date ? { start_date: plan.start_date } : {}),
      ...(plan.status ? { status: plan.status } : {}),
      ...(plan.extended_from !== undefined ? { extended_from: plan.extended_from } : {}),
    })
    .select(PLAN_COLUMNS)
    .single();

  if (planError || !created) {
    console.error("[plans] createPlanWithDays plan insert failed", planError);
    throw planError ?? new Error("Plan insert returned no row");
  }

  const createdPlan = created as Plan;
  if (days.length === 0) {
    return { ...createdPlan, days: [] };
  }

  const { data: createdDays, error: daysError } = await supabase
    .from("plan_days")
    .insert(
      days.map((day) => ({
        plan_id: createdPlan.id,
        user_id: createdPlan.user_id,
        day_number: day.day_number,
        title: day.title,
        task: day.task,
        ...(day.kind ? { kind: day.kind } : {}),
        ...(day.channel !== undefined ? { channel: day.channel } : {}),
        ...(day.format !== undefined ? { format: day.format } : {}),
        ...(day.minutes !== undefined ? { minutes: day.minutes } : {}),
        ...(day.brief !== undefined ? { brief: day.brief } : {}),
        ...(day.why !== undefined ? { why: day.why } : {}),
      }))
    )
    .select(PLAN_DAY_COLUMNS)
    .order("day_number", { ascending: true });

  if (daysError || !createdDays) {
    console.error("[plans] createPlanWithDays days insert failed", daysError);
    const { error: cleanupError } = await supabase
      .from("plans")
      .delete()
      .eq("id", createdPlan.id)
      .eq("user_id", createdPlan.user_id);
    if (cleanupError) {
      console.error("[plans] createPlanWithDays cleanup failed", cleanupError);
    }
    throw daysError ?? new Error("Plan days insert returned no rows");
  }

  return { ...createdPlan, days: createdDays as PlanDay[] };
}

export async function setDayStatus(dayId: string, done: boolean): Promise<PlanDay> {
  const { data, error } = await supabase
    .from("plan_days")
    .update({
      status: done ? "done" : "todo",
      done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", dayId)
    .select(PLAN_DAY_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[plans] setDayStatus failed", error);
    throw error ?? new Error("setDayStatus returned no row");
  }
  return data as PlanDay;
}

export async function updateDayNotes(
  dayId: string,
  patch: { notes?: string; results?: string }
): Promise<PlanDay> {
  const { data, error } = await supabase
    .from("plan_days")
    .update({
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.results !== undefined ? { results: patch.results } : {}),
    })
    .eq("id", dayId)
    .select(PLAN_DAY_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[plans] updateDayNotes failed", error);
    throw error ?? new Error("updateDayNotes returned no row");
  }
  return data as PlanDay;
}

export async function archivePlan(planId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "archived" })
    .eq("id", planId)
    .select(PLAN_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[plans] archivePlan failed", error);
    throw error ?? new Error("archivePlan returned no row");
  }
  notifyPlansChanged();
  return data as Plan;
}

export async function linkContentToDay(planDayId: string, contentId: string): Promise<PlanDayContent> {
  const { data: day, error: dayError } = await supabase
    .from("plan_days")
    .select("user_id")
    .eq("id", planDayId)
    .single();

  if (dayError || !day) {
    console.error("[plans] linkContentToDay day lookup failed", dayError);
    throw dayError ?? new Error("Plan day not found");
  }

  const { data, error } = await supabase
    .from("plan_day_content")
    .insert({
      plan_day_id: planDayId,
      user_id: (day as { user_id: string }).user_id,
      content_id: contentId,
    })
    .select(PLAN_DAY_CONTENT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[plans] linkContentToDay insert failed", error);
    throw error ?? new Error("linkContentToDay returned no row");
  }
  return data as PlanDayContent;
}

export async function listDayContent(planDayId: string): Promise<PlanDayContent[]> {
  const { data, error } = await supabase
    .from("plan_day_content")
    .select(PLAN_DAY_CONTENT_COLUMNS)
    .eq("plan_day_id", planDayId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[plans] listDayContent failed", error);
    throw error;
  }
  return (data ?? []) as PlanDayContent[];
}

export async function listDayContentItems(planDayId: string): Promise<ContentItemRow[]> {
  const links = await listDayContent(planDayId);
  if (links.length === 0) return [];

  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .in(
      "id",
      links.map((link) => link.content_id)
    )
    .is("deleted_at", null);

  if (error) {
    console.error("[plans] listDayContentItems failed", error);
    throw error;
  }

  const byId = new Map(
    ((data ?? []) as ContentItemRow[]).map((row) => [
      row.id,
      { ...row, content: normalizeContentPayload(row.type, row.content) },
    ])
  );
  return links
    .map((link) => byId.get(link.content_id) ?? null)
    .filter((row): row is ContentItemRow => Boolean(row));
}

export async function listContentPlanOrigins(contentIds: string[]): Promise<ContentPlanOrigin[]> {
  if (contentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("plan_day_content")
    .select("content_id, plan_days!inner(plan_id, day_number)")
    .in("content_id", contentIds);

  if (error) {
    console.error("[plans] listContentPlanOrigins failed", error);
    throw error;
  }

  const origins: ContentPlanOrigin[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const contentId = (row as { content_id?: string }).content_id;
    const day = (row as { plan_days?: { plan_id?: string; day_number?: number } | null }).plan_days;
    if (!contentId || !day?.plan_id || typeof day.day_number !== "number" || seen.has(contentId)) {
      continue;
    }
    seen.add(contentId);
    origins.push({ contentId, planId: day.plan_id, dayNumber: day.day_number });
  }
  return origins;
}
