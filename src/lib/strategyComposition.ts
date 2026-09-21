import { supabase } from "../config/supabase";
import type { BrandAim } from "../hooks/useBrandAims";
import type { ICP } from "../hooks/useICPs";
import { BRAND_AIM_TYPE_OPTIONS, type BrandAimType } from "./brandAimVersioning";

export type CompositionLinkState = "live" | "archived" | "deleted";

export type CompositionAim = {
  lineage_id: string;
  title: string;
  aim_type: BrandAimType;
  linkState: CompositionLinkState;
  /** @deprecated Prefer linkState === "archived" */
  isArchived: boolean;
  isDeleted: boolean;
  currentRow?: BrandAim | null;
};

export type CompositionIcp = {
  lineage_id: string;
  name: string;
  linkState: CompositionLinkState;
  /** @deprecated Prefer linkState === "archived" */
  isArchived: boolean;
  isDeleted: boolean;
  currentRow?: ICP | null;
};

export type AimJoinRef = {
  aim_lineage_id: string;
  aim_title_snapshot?: string | null;
  aim_type_snapshot?: string | null;
};

export type IcpJoinRef = {
  icp_lineage_id: string;
  icp_name_snapshot?: string | null;
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

function resolveAimTypeFromSnapshot(snapshot: string | null | undefined): BrandAimType {
  if (isValidAimType(snapshot)) return snapshot;
  return "awareness";
}

function pickBestRowPerLineage<
  T extends {
    lineage_id: string;
    superseded_at?: string | null;
    deleted_at?: string | null;
    version?: number;
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

type CompositionLookup = {
  resolveAim: (join: AimJoinRef) => CompositionAim;
  resolveIcp: (join: IcpJoinRef) => CompositionIcp;
};

export async function buildCompositionLookup(
  userId: string,
  aimJoins: AimJoinRef[],
  icpJoins: IcpJoinRef[]
): Promise<CompositionLookup> {
  const uniqueAimIds = Array.from(new Set(aimJoins.map((j) => j.aim_lineage_id).filter(Boolean)));
  const uniqueIcpIds = Array.from(new Set(icpJoins.map((j) => j.icp_lineage_id).filter(Boolean)));

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

  return {
    resolveAim(join: AimJoinRef): CompositionAim {
      const lineageId = join.aim_lineage_id;
      const current = currentAimByLineage.get(lineageId);
      const row = aimByLineage.get(lineageId);

      if (current) {
        return {
          lineage_id: lineageId,
          title: current.title,
          aim_type: current.aim_type,
          linkState: "live",
          isArchived: false,
          isDeleted: false,
          currentRow: current,
        };
      }

      if (row && isValidAimType(row.aim_type)) {
        return {
          lineage_id: lineageId,
          title: row.title,
          aim_type: row.aim_type,
          linkState: "archived",
          isArchived: true,
          isDeleted: false,
          currentRow: null,
        };
      }

      return {
        lineage_id: lineageId,
        title: join.aim_title_snapshot?.trim() || "Unknown aim",
        aim_type: resolveAimTypeFromSnapshot(join.aim_type_snapshot),
        linkState: "deleted",
        isArchived: false,
        isDeleted: true,
        currentRow: null,
      };
    },

    resolveIcp(join: IcpJoinRef): CompositionIcp {
      const lineageId = join.icp_lineage_id;
      const current = currentIcpByLineage.get(lineageId);
      const row = icpByLineage.get(lineageId);

      if (current) {
        return {
          lineage_id: lineageId,
          name: current.name,
          linkState: "live",
          isArchived: false,
          isDeleted: false,
          currentRow: current,
        };
      }

      if (row) {
        return {
          lineage_id: lineageId,
          name: row.name,
          linkState: "archived",
          isArchived: true,
          isDeleted: false,
          currentRow: null,
        };
      }

      return {
        lineage_id: lineageId,
        name: join.icp_name_snapshot?.trim() || "Unknown persona",
        linkState: "deleted",
        isArchived: false,
        isDeleted: true,
        currentRow: null,
      };
    },
  };
}

/** Resolve composition from join rows — one chip per join, never silently dropped. */
export async function resolveCompositionFromJoins(
  userId: string,
  aimJoins: AimJoinRef[],
  icpJoins: IcpJoinRef[]
): Promise<{ aims: CompositionAim[]; icps: CompositionIcp[] }> {
  const lookup = await buildCompositionLookup(userId, aimJoins, icpJoins);
  return {
    aims: aimJoins.map((join) => lookup.resolveAim(join)),
    icps: icpJoins.map((join) => lookup.resolveIcp(join)),
  };
}

/**
 * @deprecated Use resolveCompositionFromJoins with join snapshots.
 * Kept for callers that only have lineage IDs and no join metadata.
 */
export async function fetchCompositionForLineages(
  userId: string,
  aimLineageIds: string[],
  icpLineageIds: string[]
): Promise<{ aims: CompositionAim[]; icps: CompositionIcp[] }> {
  return resolveCompositionFromJoins(
    userId,
    aimLineageIds.map((id) => ({ aim_lineage_id: id })),
    icpLineageIds.map((id) => ({ icp_lineage_id: id }))
  );
}

/** Resolve composition for a strategy lineage (join rows + aim/ICP link state). */
export async function fetchCompositionForStrategyLineage(
  userId: string,
  strategyLineageId: string
): Promise<{ aims: CompositionAim[]; icps: CompositionIcp[] }> {
  const [aimLinks, icpLinks] = await Promise.all([
    supabase
      .from("strategy_aims")
      .select("aim_lineage_id, aim_title_snapshot, aim_type_snapshot")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategyLineageId),
    supabase
      .from("strategy_targets")
      .select("icp_lineage_id, icp_name_snapshot")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategyLineageId),
  ]);

  if (aimLinks.error) throw aimLinks.error;
  if (icpLinks.error) throw icpLinks.error;

  const aimJoins = (aimLinks.data || []) as AimJoinRef[];
  const icpJoins = (icpLinks.data || []) as IcpJoinRef[];

  return resolveCompositionFromJoins(userId, aimJoins, icpJoins);
}

export function compositionHasArchivedLinks(aims: CompositionAim[], icps: CompositionIcp[]): boolean {
  return aims.some((a) => a.linkState === "archived") || icps.some((i) => i.linkState === "archived");
}

export function compositionHasDeletedLinks(aims: CompositionAim[], icps: CompositionIcp[]): boolean {
  return aims.some((a) => a.linkState === "deleted") || icps.some((i) => i.linkState === "deleted");
}

export function compositionHasBrokenLinks(aims: CompositionAim[], icps: CompositionIcp[]): boolean {
  return compositionHasArchivedLinks(aims, icps) || compositionHasDeletedLinks(aims, icps);
}

export function formatCompositionSentence(aims: CompositionAim[], icps: CompositionIcp[]): string {
  const icpNames = icps.map((i) => i.name).join(", ") || "—";
  const aimTitles = aims.map((a) => a.title).join(", ") || "—";
  return `Built for ${icpNames} to serve ${aimTitles}.`;
}
