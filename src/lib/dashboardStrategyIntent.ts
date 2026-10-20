/** Opens the aim form or the new-strategy form when arriving from the dashboard. */
export type DashboardStrategyIntent =
  | { kind: "aim" }
  | { kind: "strategy"; aimLineageId: string };

export const DASHBOARD_STRATEGY_STATE_KEY = "dashboardStrategy";

export function readDashboardStrategyIntent(state: unknown): DashboardStrategyIntent | null {
  if (!state || typeof state !== "object") return null;
  const raw = (state as Record<string, unknown>)[DASHBOARD_STRATEGY_STATE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const intent = raw as Partial<DashboardStrategyIntent>;
  if (intent.kind === "aim") return { kind: "aim" };
  if (intent.kind === "strategy" && typeof intent.aimLineageId === "string" && intent.aimLineageId) {
    return { kind: "strategy", aimLineageId: intent.aimLineageId };
  }
  return null;
}
