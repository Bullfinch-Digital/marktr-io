import { supabase } from "../config/supabase";
import { localISODate } from "./localCalendar";

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
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[plans] listDayContent failed", error);
    throw error;
  }
  return (data ?? []) as PlanDayContent[];
}
