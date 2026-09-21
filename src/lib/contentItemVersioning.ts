import { supabase } from "../config/supabase";
import type { ContentItemRow, ContentPayload } from "../types/contentItemPayload";

export function applyCurrentContentItemFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("superseded_at", null).is("deleted_at", null);
}

export async function insertContentItemVersionRpc(
  itemId: string,
  updates: Record<string, unknown>
): Promise<ContentItemRow> {
  const { data, error } = await supabase.rpc("content_insert_version", {
    p_item_id: itemId,
    p_updates: updates,
  });

  if (error) {
    console.error("[contentItemVersioning] insertContentItemVersionRpc failed", error);
    throw error;
  }
  if (!data) {
    throw new Error("Content item version insert returned no row");
  }
  return data as ContentItemRow;
}

export async function softDeleteContentItemLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("content_soft_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[contentItemVersioning] softDeleteContentItemLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function restoreContentItemLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("content_restore_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[contentItemVersioning] restoreContentItemLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function hardDeleteContentItemLineage(lineageId: string): Promise<void> {
  const { error } = await supabase.rpc("content_hard_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[contentItemVersioning] hardDeleteContentItemLineage failed", error);
    throw error;
  }
}

export type ContentItemVersionRow = ContentItemRow;

export async function fetchContentItemVersionsForLineage(
  userId: string,
  lineageId: string
): Promise<ContentItemVersionRow[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", userId)
    .eq("lineage_id", lineageId)
    .order("version", { ascending: false });

  if (error) {
    console.error("[contentItemVersioning] fetchContentItemVersionsForLineage failed", error);
    throw error;
  }

  return (data || []) as ContentItemVersionRow[];
}

export function contentItemVersionRowToRestorePayload(
  row: ContentItemVersionRow
): Record<string, unknown> {
  return {
    title: row.title,
    content: row.content as ContentPayload,
    status: row.status,
    campaign_idea_id: row.campaign_idea_id,
    campaign_idea_name_snapshot: row.campaign_idea_name_snapshot,
    icp_lineage_id: row.icp_lineage_id,
    icp_name_snapshot: row.icp_name_snapshot,
    suggested_content_id: row.suggested_content_id,
    prompt_version: row.prompt_version,
    model: row.model,
  };
}

export async function restoreContentItemVersionFromRow(
  currentItemId: string,
  sourceVersionRow: ContentItemVersionRow
): Promise<ContentItemRow> {
  return insertContentItemVersionRpc(
    currentItemId,
    contentItemVersionRowToRestorePayload(sourceVersionRow)
  );
}
