import { supabase } from "../config/supabase";
import type { ContentItemRow } from "../types/contentItemPayload";
import type { CompositionLinkState } from "./strategyComposition";

export type ContentCompositionStrategy = {
  lineage_id: string;
  title: string;
  linkState: CompositionLinkState;
  isArchived: boolean;
  isDeleted: boolean;
};

export type ContentCompositionPersona = {
  lineage_id: string;
  name: string;
  linkState: CompositionLinkState;
  isArchived: boolean;
  isDeleted: boolean;
};

export type ContentCompositionCampaignIdea = {
  id: string | null;
  name: string;
  /** live = on current strategy; removed = id missing from current campaign_ideas; strategy_level = null id */
  linkState: "live" | "removed" | "strategy_level";
};

export type ContentComposition = {
  strategy: ContentCompositionStrategy;
  persona: ContentCompositionPersona;
  campaignIdea: ContentCompositionCampaignIdea;
};

type StrategyRowLite = {
  lineage_id: string;
  title: string;
  strategy?: { campaign_ideas?: Array<{ id?: string; name?: string }> } | null;
  superseded_at?: string | null;
  deleted_at?: string | null;
  version?: number | null;
};

type IcpRowLite = {
  lineage_id: string;
  name: string;
  superseded_at?: string | null;
  deleted_at?: string | null;
  version?: number | null;
};

function pickBestRowPerLineage<
  T extends {
    lineage_id: string;
    superseded_at?: string | null;
    deleted_at?: string | null;
    version?: number | null;
  },
>(rows: T[]): Map<string, T> {
  const byLineage = new Map<string, T>();
  for (const row of rows) {
    if (!row.lineage_id) continue;
    const existing = byLineage.get(row.lineage_id);
    if (!existing) {
      byLineage.set(row.lineage_id, row);
      continue;
    }
    const rowCurrent = !row.superseded_at && !row.deleted_at;
    const existingCurrent = !existing.superseded_at && !existing.deleted_at;
    if (rowCurrent && !existingCurrent) {
      byLineage.set(row.lineage_id, row);
      continue;
    }
    if (rowCurrent === existingCurrent && (row.version ?? 0) > (existing.version ?? 0)) {
      byLineage.set(row.lineage_id, row);
    }
  }
  return byLineage;
}

function resolveStrategyLink(
  lineageId: string,
  best: StrategyRowLite | undefined
): ContentCompositionStrategy {
  if (!best) {
    return {
      lineage_id: lineageId,
      title: "Unknown strategy",
      linkState: "deleted",
      isArchived: false,
      isDeleted: true,
    };
  }
  if (!best.superseded_at && !best.deleted_at) {
    return {
      lineage_id: lineageId,
      title: best.title,
      linkState: "live",
      isArchived: false,
      isDeleted: false,
    };
  }
  return {
    lineage_id: lineageId,
    title: best.title,
    linkState: "archived",
    isArchived: true,
    isDeleted: false,
  };
}

function resolvePersonaLink(
  lineageId: string,
  snapshotName: string,
  best: IcpRowLite | undefined
): ContentCompositionPersona {
  if (!best) {
    return {
      lineage_id: lineageId,
      name: snapshotName || "Unknown persona",
      linkState: "deleted",
      isArchived: false,
      isDeleted: true,
    };
  }
  if (!best.superseded_at && !best.deleted_at) {
    return {
      lineage_id: lineageId,
      name: best.name,
      linkState: "live",
      isArchived: false,
      isDeleted: false,
    };
  }
  return {
    lineage_id: lineageId,
    name: best.name || snapshotName,
    linkState: "archived",
    isArchived: true,
    isDeleted: false,
  };
}

function resolveCampaignIdea(
  campaignIdeaId: string | null,
  snapshotName: string | null,
  currentStrategy: StrategyRowLite | undefined
): ContentCompositionCampaignIdea {
  if (!campaignIdeaId) {
    return {
      id: null,
      name: "whole strategy",
      linkState: "strategy_level",
    };
  }

  const ideas = currentStrategy?.strategy?.campaign_ideas;
  const match = Array.isArray(ideas)
    ? ideas.find((idea) => idea?.id === campaignIdeaId)
    : undefined;

  if (match) {
    return {
      id: campaignIdeaId,
      name: (match.name || snapshotName || "Campaign idea").trim() || "Campaign idea",
      linkState: "live",
    };
  }

  return {
    id: campaignIdeaId,
    name: (snapshotName || "Campaign idea").trim() || "Campaign idea",
    linkState: "removed",
  };
}

export function formatContentCompositionSentence(comp: ContentComposition): string {
  const strategyLabel = comp.strategy.title;
  const ideaLabel =
    comp.campaignIdea.linkState === "strategy_level"
      ? "strategy-level"
      : comp.campaignIdea.name;
  return `From ${strategyLabel} · ${ideaLabel} · for ${comp.persona.name}`;
}

export function contentCompositionHasArchivedLinks(comp: ContentComposition): boolean {
  return (
    comp.strategy.linkState === "archived" ||
    comp.persona.linkState === "archived" ||
    comp.campaignIdea.linkState === "removed"
  );
}

export function contentCompositionHasDeletedLinks(comp: ContentComposition): boolean {
  return comp.strategy.linkState === "deleted" || comp.persona.linkState === "deleted";
}

export async function attachCompositionToContentItems(
  userId: string,
  rows: ContentItemRow[]
): Promise<Array<ContentItemRow & { composition: ContentComposition }>> {
  if (!rows.length) return [];

  const strategyLineageIds = Array.from(new Set(rows.map((r) => r.strategy_lineage_id)));
  const icpLineageIds = Array.from(new Set(rows.map((r) => r.icp_lineage_id)));

  const [{ data: strategyRows }, { data: icpRows }] = await Promise.all([
    supabase
      .from("strategies")
      .select("lineage_id, title, strategy, superseded_at, deleted_at, version")
      .eq("user_id", userId)
      .in("lineage_id", strategyLineageIds),
    supabase
      .from("icps")
      .select("lineage_id, name, superseded_at, deleted_at, version")
      .eq("user_id", userId)
      .in("lineage_id", icpLineageIds),
  ]);

  const strategiesByLineage = pickBestRowPerLineage((strategyRows || []) as StrategyRowLite[]);
  const icpsByLineage = pickBestRowPerLineage((icpRows || []) as IcpRowLite[]);

  // Current (non-archived) strategy rows for campaign-idea resolution
  const currentStrategyByLineage = new Map<string, StrategyRowLite>();
  for (const row of (strategyRows || []) as StrategyRowLite[]) {
    if (!row.superseded_at && !row.deleted_at) {
      currentStrategyByLineage.set(row.lineage_id, row);
    }
  }

  return rows.map((row) => {
    const strategyBest = strategiesByLineage.get(row.strategy_lineage_id);
    const strategyCurrent = currentStrategyByLineage.get(row.strategy_lineage_id);
    const personaBest = icpsByLineage.get(row.icp_lineage_id);

    const composition: ContentComposition = {
      strategy: resolveStrategyLink(row.strategy_lineage_id, strategyBest),
      persona: resolvePersonaLink(row.icp_lineage_id, row.icp_name_snapshot, personaBest),
      campaignIdea: resolveCampaignIdea(
        row.campaign_idea_id,
        row.campaign_idea_name_snapshot,
        strategyCurrent ?? strategyBest
      ),
    };

    return { ...row, composition };
  });
}

/**
 * Derived done-state for strategy suggested_content checklist.
 * A suggestion is done iff a CURRENT content item exists with that suggested_content_id
 * (superseded_at IS NULL AND deleted_at IS NULL). Archiving un-ticks it.
 */
export async function fetchDoneSuggestedContentIds(
  userId: string,
  brandId: string,
  strategyLineageId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("content_items")
    .select("suggested_content_id")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .eq("strategy_lineage_id", strategyLineageId)
    .is("superseded_at", null)
    .is("deleted_at", null)
    .not("suggested_content_id", "is", null);

  if (error) {
    console.error("[contentComposition] fetchDoneSuggestedContentIds failed", error);
    throw error;
  }

  const ids = new Set<string>();
  for (const row of data || []) {
    const id = (row as { suggested_content_id?: string | null }).suggested_content_id;
    if (id) ids.add(id);
  }
  return ids;
}

export async function fetchCurrentContentItemBySuggestedId(
  userId: string,
  suggestedContentId: string
): Promise<ContentItemRow | null> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", userId)
    .eq("suggested_content_id", suggestedContentId)
    .is("superseded_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[contentComposition] fetchCurrentContentItemBySuggestedId failed", error);
    throw error;
  }
  return (data as ContentItemRow) || null;
}
