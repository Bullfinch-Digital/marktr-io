/** Navigation state when creating content from a strategy suggestion (or free choice). */
export type ContentLauncherIntent = {
  brandId: string;
  strategyLineageId: string;
  strategyTitle?: string;
  /** null = strategy-level piece */
  campaignIdeaId: string | null;
  campaignIdeaName?: string | null;
  /** Pre-selected persona; user can change in the create panel */
  icpLineageId?: string | null;
  icpName?: string | null;
  type: string;
  suggestedContentId?: string | null;
  rationale?: string | null;
  /** True when the suggestion's campaign idea was removed from the current strategy */
  campaignIdeaRemoved?: boolean;
};

export const CONTENT_LAUNCHER_STATE_KEY = "fromSuggestion";

export function buildContentLauncherIntent(
  input: ContentLauncherIntent
): ContentLauncherIntent {
  return {
    brandId: input.brandId,
    strategyLineageId: input.strategyLineageId,
    strategyTitle: input.strategyTitle?.trim() || undefined,
    campaignIdeaId: input.campaignIdeaId,
    campaignIdeaName: input.campaignIdeaName?.trim() || null,
    icpLineageId: input.icpLineageId ?? null,
    icpName: input.icpName?.trim() || null,
    type: input.type,
    suggestedContentId: input.suggestedContentId ?? null,
    rationale: input.rationale ?? null,
    campaignIdeaRemoved: input.campaignIdeaRemoved ?? false,
  };
}

export function readContentLauncherIntent(state: unknown): ContentLauncherIntent | null {
  if (!state || typeof state !== "object") return null;
  const raw = (state as Record<string, unknown>)[CONTENT_LAUNCHER_STATE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const intent = raw as Partial<ContentLauncherIntent>;
  if (!intent.brandId || !intent.strategyLineageId || !intent.type) return null;
  return {
    brandId: intent.brandId,
    strategyLineageId: intent.strategyLineageId,
    strategyTitle: intent.strategyTitle,
    campaignIdeaId: intent.campaignIdeaId ?? null,
    campaignIdeaName: intent.campaignIdeaName ?? null,
    icpLineageId: intent.icpLineageId ?? null,
    icpName: intent.icpName ?? null,
    type: intent.type,
    suggestedContentId: intent.suggestedContentId ?? null,
    rationale: intent.rationale ?? null,
    campaignIdeaRemoved: intent.campaignIdeaRemoved ?? false,
  };
}
