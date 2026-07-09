import { supabase } from "../config/supabase";
import type { BrandAim } from "../hooks/useBrandAims";
import type { ICP } from "../hooks/useICPs";
import { BRAND_AIM_TYPE_OPTIONS, type BrandAimType } from "./brandAimVersioning";

export type CompositionAim = {
  lineage_id: string;
  title: string;
  aim_type: BrandAimType;
  isArchived: boolean;
  /** Present when a current row exists (for edit flows). */
  currentRow?: BrandAim | null;
};

export type CompositionIcp = {
  lineage_id: string;
  name: string;
  isArchived: boolean;
  currentRow?: ICP | null;
};

type AimRow = {
  lineage_id: string;
  title: string;
  aim_type: string;
  superseded_at?: string | null;
  deleted_at?: string | null;
  version?: number;
};

type IcpRow = {
  lineage_id: string;
  name: string;
  superseded_at?: string | null;
  deleted_at?: string | null;
  version?: number;
};

function isValidAimType(value: unknown): value is BrandAimType {
  return BRAND_AIM_TYPE_OPTIONS.includes(value as BrandAimType);
}

function pickBestRowPerLineage<T extends { lineage_id: string; superseded_at?: string | null; deleted_at?: string | null; version?: number }>(
  rows: T[]
): Map<string, T> {
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

/** Resolve aim + ICP display labels for strategy joins, including archived lineages. */
export async function fetchCompositionForLineages(
  userId: string,
  aimLineageIds: string[],
  icpLineageIds: string[]
): Promise<{ aims: CompositionAim[]; icps: CompositionIcp[] }> {
  const uniqueAimIds = Array.from(new Set(aimLineageIds.filter(Boolean)));
  const uniqueIcpIds = Array.from(new Set(icpLineageIds.filter(Boolean)));

  const [aimResult, icpResult, currentAimResult, currentIcpResult] = await Promise.all([
    uniqueAimIds.length
      ? supabase
          .from("brand_aims")
          .select("lineage_id, title, aim_type, superseded_at, deleted_at, version")
          .eq("user_id", userId)
          .in("lineage_id", uniqueAimIds)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    uniqueIcpIds.length
      ? supabase
          .from("icps")
          .select("lineage_id, name, superseded_at, deleted_at, version")
          .eq("user_id", userId)
          .in("lineage_id", uniqueIcpIds)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    uniqueAimIds.length
      ? supabase
          .from("brand_aims")
          .select("*")
          .eq("user_id", userId)
          .in("lineage_id", uniqueAimIds)
          .is("superseded_at", null)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    uniqueIcpIds.length
      ? supabase
          .from("icps")
          .select("*")
          .eq("user_id", userId)
          .in("lineage_id", uniqueIcpIds)
          .is("superseded_at", null)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (aimResult.error) throw aimResult.error;
  if (icpResult.error) throw icpResult.error;
  if (currentAimResult.error) throw currentAimResult.error;
  if (currentIcpResult.error) throw currentIcpResult.error;

  const aimByLineage = pickBestRowPerLineage((aimResult.data || []) as AimRow[]);
  const icpByLineage = pickBestRowPerLineage((icpResult.data || []) as IcpRow[]);

  const currentAimByLineage = new Map<string, BrandAim>(
    ((currentAimResult.data || []) as BrandAim[]).map((r) => [r.lineage_id, r])
  );
  const currentIcpByLineage = new Map<string, ICP>(
    ((currentIcpResult.data || []) as ICP[]).map((r) => [r.lineage_id!, r])
  );

  const aims: CompositionAim[] = uniqueAimIds
    .map((lineageId) => {
      const row = aimByLineage.get(lineageId);
      if (!row || !isValidAimType(row.aim_type)) return null;
      const isArchived = !!row.deleted_at || !!row.superseded_at;
      return {
        lineage_id: lineageId,
        title: row.title,
        aim_type: row.aim_type,
        isArchived,
        currentRow: currentAimByLineage.get(lineageId) ?? null,
      };
    })
    .filter(Boolean) as CompositionAim[];

  const icps: CompositionIcp[] = uniqueIcpIds
    .map((lineageId) => {
      const row = icpByLineage.get(lineageId);
      if (!row) return null;
      const isArchived = !!row.deleted_at || !!row.superseded_at;
      return {
        lineage_id: lineageId,
        name: row.name || "Untitled profile",
        isArchived,
        currentRow: currentIcpByLineage.get(lineageId) ?? null,
      };
    })
    .filter(Boolean) as CompositionIcp[];

  return { aims, icps };
}

export function compositionHasArchivedLinks(aims: CompositionAim[], icps: CompositionIcp[]): boolean {
  return aims.some((a) => a.isArchived) || icps.some((i) => i.isArchived);
}

export function formatCompositionSentence(aims: CompositionAim[], icps: CompositionIcp[]): string {
  const icpNames = icps.map((i) => i.name).join(", ") || "—";
  const aimTitles = aims.map((a) => a.title).join(", ") || "—";
  return `Built for ${icpNames} to serve ${aimTitles}.`;
}
