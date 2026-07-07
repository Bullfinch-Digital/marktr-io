import { supabase } from "../config/supabase";
import type { ICP } from "../hooks/useICPs";

/** PostgREST filter: visible current ICP rows (not superseded, not soft-deleted). */
export function applyCurrentIcpFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("superseded_at", null).is("deleted_at", null);
}

export function newGenerationId(): string {
  return crypto.randomUUID();
}

/** Latest generation_id among current rows for a brand. */
export async function fetchLatestGenerationIdForBrand(
  userId: string,
  brandId: string | null
): Promise<string | null> {
  let query = supabase
    .from("icps")
    .select("generation_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  query = applyCurrentIcpFilter(query);
  if (brandId) {
    query = query.eq("brand_id", brandId);
  } else {
    query = query.is("brand_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn("[icpVersioning] fetchLatestGenerationIdForBrand failed", error);
    return null;
  }
  return data?.generation_id ?? null;
}

/** Whether the brand already has a current generation (for onboarding re-run prompt). */
export async function brandHasCurrentGeneration(
  userId: string,
  brandId: string | null
): Promise<boolean> {
  const generationId = await fetchLatestGenerationIdForBrand(userId, brandId);
  return generationId != null;
}

/** Supersede all current ICP rows for a brand before inserting a new generation. */
export async function supersedeBrandCurrentIcps(
  brandId: string | null
): Promise<number> {
  const { data, error } = await supabase.rpc("icp_supersede_brand_current", {
    p_brand_id: brandId,
  });
  if (error) {
    console.error("[icpVersioning] supersedeBrandCurrentIcps failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

/** Resolve current row for a lineage (for superseded id redirects). */
export async function fetchCurrentIcpByLineageId(
  userId: string,
  lineageId: string
): Promise<ICP | null> {
  const { data, error } = await supabase
    .from("icps")
    .select("*, brands(name)")
    .eq("user_id", userId)
    .eq("lineage_id", lineageId)
    .is("superseded_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...(data as any),
    brandName:
      (data as any)?.brands && typeof (data as any).brands?.name === "string"
        ? (data as any).brands.name
        : null,
  } as ICP;
}

/** Postgres/PostgREST errors that will never succeed on retry. */
export function isPermanentIcpSyncError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (!code) return false;
  return (
    code === "42703" || // undefined_column
    code === "42883" || // undefined_function
    code === "22P02" || // invalid_text_representation (bad uuid)
    code === "23505" || // unique_violation
    code === "23503" || // foreign_key_violation
    code === "PGRST202" // RPC not found
  );
}

/** Transactional supersede + insert version via Postgres RPC. */
export async function insertIcpVersionRpc(
  icpId: string,
  updates: Record<string, unknown>
): Promise<ICP> {
  const { data, error } = await supabase.rpc("icp_insert_version", {
    p_icp_id: icpId,
    p_updates: updates,
  });

  if (error) {
    console.error("[icpVersioning] insertIcpVersionRpc failed", error);
    throw error;
  }
  if (!data) {
    throw new Error("ICP version insert returned no row");
  }
  return data as ICP;
}

export function withVersioningDefaults(
  row: Record<string, unknown>,
  generationId: string
): Record<string, unknown> {
  return {
    ...row,
    generation_id: generationId,
    version: 1,
    superseded_at: null,
    deleted_at: null,
  };
}

/** Soft-delete all versions of a persona (recoverable). */
export async function softDeleteIcpLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("icp_soft_delete_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[icpVersioning] softDeleteIcpLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

/** Restore a soft-deleted persona (all versions). Unwired from UI for now. */
export async function restoreIcpLineage(lineageId: string): Promise<number> {
  const { data, error } = await supabase.rpc("icp_restore_lineage", {
    p_lineage_id: lineageId,
  });
  if (error) {
    console.error("[icpVersioning] restoreIcpLineage failed", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

/** Soft-delete by row id (resolves lineage_id). */
export async function softDeleteIcpById(userId: string, icpId: string): Promise<boolean> {
  const { data: target, error: fetchError } = await supabase
    .from("icps")
    .select("lineage_id")
    .eq("id", icpId)
    .eq("user_id", userId)
    .single();

  if (fetchError) throw fetchError;

  const lineageId = (target as { lineage_id?: string | null })?.lineage_id;
  if (lineageId) {
    await softDeleteIcpLineage(lineageId);
    return true;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("icps")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", icpId)
    .eq("user_id", userId);

  if (updateError) throw updateError;
  return true;
}

export type ArchivedIcpRow = {
  id: string;
  lineage_id: string;
  name: string;
  deleted_at: string;
  brand_id?: string | null;
  superseded_at?: string | null;
  version?: number;
};

/** Soft-deleted personas for a brand — one row per lineage (latest version). */
export async function fetchArchivedIcpsForBrand(
  userId: string,
  brandId: string
): Promise<ArchivedIcpRow[]> {
  const { data, error } = await supabase
    .from("icps")
    .select("id, lineage_id, name, deleted_at, brand_id, superseded_at, version")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .not("deleted_at", "is", null)
    .order("version", { ascending: false });

  if (error) {
    console.error("[icpVersioning] fetchArchivedIcpsForBrand failed", error);
    throw error;
  }

  const byLineage = new Map<string, ArchivedIcpRow>();
  for (const row of (data || []) as ArchivedIcpRow[]) {
    if (!row.lineage_id) continue;
    const existing = byLineage.get(row.lineage_id);
    if (!existing) {
      byLineage.set(row.lineage_id, row);
      continue;
    }
    // Prefer the latest current version (non-superseded) for display.
    if (!row.superseded_at && existing.superseded_at) {
      byLineage.set(row.lineage_id, row);
    }
  }

  return Array.from(byLineage.values()).sort(
    (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
  );
}
