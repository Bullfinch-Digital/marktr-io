import { supabase } from "../config/supabase";
import type { ICPStrategyPayload } from "../types/icpStrategyPayload";
import type { StrategyRow } from "../hooks/useBrandStrategies";

export function applyCurrentStrategyFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("superseded_at", null).is("deleted_at", null);
}

export type StrategyVersionRow = {
  id: string;
  lineage_id: string;
  brand_id: string;
  user_id: string;
  title: string;
  strategy: ICPStrategyPayload;
  channel: string[] | null;
  prompt_version: string;
  model: string;
  version?: number | null;
  superseded_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function insertStrategyVersionRpc(
  strategyId: string,
  updates: Record<string, unknown>
): Promise<StrategyRow> {
  const { data, error } = await supabase.rpc("strategy_insert_version", {
    p_strategy_id: strategyId,
    p_updates: updates,
  });

  if (error) {
    console.error("[brandStrategyVersioning] insertStrategyVersionRpc failed", error);
    throw error;
  }
  if (!data) {
    throw new Error("Strategy version insert returned no row");
  }
  return data as StrategyRow;
}

export async function fetchStrategyVersionsForLineage(
  userId: string,
  lineageId: string
): Promise<StrategyVersionRow[]> {
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", userId)
    .eq("lineage_id", lineageId)
    .order("version", { ascending: false });

  if (error) {
    console.error("[brandStrategyVersioning] fetchStrategyVersionsForLineage failed", error);
    throw error;
  }

  return (data || []) as StrategyVersionRow[];
}

export function strategyVersionRowToRestorePayload(row: StrategyVersionRow): Record<string, unknown> {
  return {
    title: row.title,
    strategy: row.strategy,
    channel: row.channel,
    prompt_version: row.prompt_version,
    model: row.model,
  };
}

export async function restoreStrategyVersionFromRow(
  currentStrategyId: string,
  sourceVersionRow: StrategyVersionRow
): Promise<StrategyRow> {
  return insertStrategyVersionRpc(
    currentStrategyId,
    strategyVersionRowToRestorePayload(sourceVersionRow)
  );
}

export async function softDeleteStrategyLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("strategy_soft_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandStrategyVersioning] softDeleteStrategyLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function restoreStrategyLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("strategy_restore_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandStrategyVersioning] restoreStrategyLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function hardDeleteStrategyLineage(lineageId: string): Promise<void> {
  const { error } = await supabase.rpc("strategy_hard_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandStrategyVersioning] hardDeleteStrategyLineage failed", error);
    throw error;
  }
}
