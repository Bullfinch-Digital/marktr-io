import { Coffee, Eye, PenLine, Send, type LucideIcon } from "lucide-react";
import type { PlanDayKind } from "../../lib/plans";

export const PLAN_KIND_META: Record<PlanDayKind, { label: string; icon: LucideIcon }> = {
  post: { label: "Post", icon: Send },
  prep: { label: "Prep", icon: PenLine },
  review: { label: "Review", icon: Eye },
  rest: { label: "Rest", icon: Coffee },
};

export function formatPlanDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatPlanStartDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
