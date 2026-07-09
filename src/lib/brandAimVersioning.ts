import { supabase } from "../config/supabase";

export const BRAND_AIM_TYPE_OPTIONS = [
  "awareness",
  "leads",
  "enquiries",
  "sales",
  "retention",
] as const;

export type BrandAimType = (typeof BRAND_AIM_TYPE_OPTIONS)[number];

export function applyCurrentBrandAimFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("superseded_at", null).is("deleted_at", null);
}

export async function insertBrandAimVersionRpc(
  aimId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase.rpc("aim_insert_version", {
    p_aim_id: aimId,
    p_updates: updates,
  });

  if (error) {
    console.error("[brandAimVersioning] insertBrandAimVersionRpc failed", error);
    throw error;
  }
  if (!data) {
    throw new Error("Brand aim version insert returned no row");
  }
  return data;
}

export async function softDeleteBrandAimLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("aim_soft_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandAimVersioning] softDeleteBrandAimLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function restoreBrandAimLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("aim_restore_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandAimVersioning] restoreBrandAimLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

export async function hardDeleteBrandAimLineage(lineageId: string): Promise<void> {
  const { error } = await supabase.rpc("aim_hard_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[brandAimVersioning] hardDeleteBrandAimLineage failed", error);
    throw error;
  }
}

export type BrandAimVersionRow = {
  id: string;
  lineage_id: string;
  brand_id: string;
  user_id: string;
  title: string;
  aim_type: BrandAimType;
  description?: string | null;
  version?: number | null;
  superseded_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchBrandAimVersionsForLineage(
  userId: string,
  lineageId: string
): Promise<BrandAimVersionRow[]> {
  const { data, error } = await supabase
    .from("brand_aims")
    .select("*")
    .eq("user_id", userId)
    .eq("lineage_id", lineageId)
    .order("version", { ascending: false });

  if (error) {
    console.error("[brandAimVersioning] fetchBrandAimVersionsForLineage failed", error);
    throw error;
  }

  return (data || []) as BrandAimVersionRow[];
}

export function brandAimVersionRowToRestorePayload(row: BrandAimVersionRow): Record<string, unknown> {
  return {
    title: row.title,
    aim_type: row.aim_type,
    description: row.description ?? null,
    brand_id: row.brand_id,
  };
}

export async function restoreBrandAimVersionFromRow(
  currentAimId: string,
  sourceVersionRow: BrandAimVersionRow
) {
  return insertBrandAimVersionRpc(currentAimId, brandAimVersionRowToRestorePayload(sourceVersionRow));
}
