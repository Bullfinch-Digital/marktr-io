/** Navigation state when instigating strategy creation from an ICP persona page. */
export type StrategyLauncherIntent = {
  icpLineageId: string;
  icpId: string;
  icpName: string;
  brandId?: string | null;
};

export const STRATEGY_LAUNCHER_STATE_KEY = "fromIcp";

export function buildStrategyLauncherIntent(input: {
  icpLineageId: string;
  icpId: string;
  icpName: string;
  brandId?: string | null;
}): StrategyLauncherIntent {
  return {
    icpLineageId: input.icpLineageId,
    icpId: input.icpId,
    icpName: input.icpName.trim() || "this persona",
    brandId: input.brandId ?? null,
  };
}

export function readStrategyLauncherIntent(
  state: unknown
): StrategyLauncherIntent | null {
  if (!state || typeof state !== "object") return null;
  const fromIcp = (state as Record<string, unknown>)[STRATEGY_LAUNCHER_STATE_KEY];
  if (!fromIcp || typeof fromIcp !== "object") return null;
  const intent = fromIcp as Partial<StrategyLauncherIntent>;
  if (!intent.icpLineageId || !intent.icpId) return null;
  return {
    icpLineageId: intent.icpLineageId,
    icpId: intent.icpId,
    icpName: intent.icpName?.trim() || "this persona",
    brandId: intent.brandId ?? null,
  };
}
