import { supabase } from "../config/supabase";
import type { ICP } from "../hooks/useICPs";

/** PostgREST filter: only current (non-superseded) ICP rows. */
export function applyCurrentIcpFilter<T extends { is: (col: string, val: null) => T }>(
  query: T
): T {
  return query.is("superseded_at", null);
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

export function pickLatestGenerationRows<T extends { generation_id?: string | null; created_at?: string }>(
  rows: T[]
): T[] {
  if (!rows.length) return rows;
  const latest = rows.reduce((best, row) => {
    const rowTs = new Date(row.created_at ?? 0).getTime();
    const bestTs = new Date(best.created_at ?? 0).getTime();
    return rowTs > bestTs ? row : best;
  });
  const latestGenerationId = latest.generation_id;
  if (!latestGenerationId) return rows;
  return rows.filter((row) => row.generation_id === latestGenerationId);
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
  };
}
