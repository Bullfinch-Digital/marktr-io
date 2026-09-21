import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { ICPStrategyPayload } from "../types/icpStrategyPayload";
import {
  buildCompositionLookup,
  type AimJoinRef,
  type CompositionAim,
  type CompositionIcp,
  type IcpJoinRef,
} from "../lib/strategyComposition";
import {
  hardDeleteStrategyLineage,
  insertStrategyVersionRpc,
} from "../lib/brandStrategyVersioning";
import { subscribeStrategyCompositionStale } from "../lib/strategyEvents";

export type StrategyRow = {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  strategy: ICPStrategyPayload;
  channel: string[] | null;
  prompt_version: string;
  model: string;
  lineage_id: string;
  version: number;
  superseded_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StrategyWithLinks = StrategyRow & {
  aims: CompositionAim[];
  icps: CompositionIcp[];
};

type StrategyLinkAimRow = {
  strategy_lineage_id: string;
  aim_lineage_id: string;
  aim_title_snapshot?: string | null;
  aim_type_snapshot?: string | null;
};

type StrategyLinkIcpRow = {
  strategy_lineage_id: string;
  icp_lineage_id: string;
  icp_name_snapshot?: string | null;
};

type StrategyFetchCache = {
  currentRows: StrategyRow[];
  archivedRows: StrategyRow[];
  aimLink: StrategyLinkAimRow[];
  icpLink: StrategyLinkIcpRow[];
};

async function attachCompositionToStrategies(
  userId: string,
  rows: StrategyRow[],
  aimLink: StrategyLinkAimRow[],
  icpLink: StrategyLinkIcpRow[]
): Promise<StrategyWithLinks[]> {
  const aimJoinsByStrategy = new Map<string, AimJoinRef[]>();
  const icpJoinsByStrategy = new Map<string, IcpJoinRef[]>();

  for (const link of aimLink) {
    const list = aimJoinsByStrategy.get(link.strategy_lineage_id) || [];
    list.push({
      aim_lineage_id: link.aim_lineage_id,
      aim_title_snapshot: link.aim_title_snapshot,
      aim_type_snapshot: link.aim_type_snapshot,
    });
    aimJoinsByStrategy.set(link.strategy_lineage_id, list);
  }

  for (const link of icpLink) {
    const list = icpJoinsByStrategy.get(link.strategy_lineage_id) || [];
    list.push({
      icp_lineage_id: link.icp_lineage_id,
      icp_name_snapshot: link.icp_name_snapshot,
    });
    icpJoinsByStrategy.set(link.strategy_lineage_id, list);
  }

  const lookup = await buildCompositionLookup(
    userId,
    aimLink.map((link) => ({
      aim_lineage_id: link.aim_lineage_id,
      aim_title_snapshot: link.aim_title_snapshot,
      aim_type_snapshot: link.aim_type_snapshot,
    })),
    icpLink.map((link) => ({
      icp_lineage_id: link.icp_lineage_id,
      icp_name_snapshot: link.icp_name_snapshot,
    }))
  );

  return rows.map((row) => {
    const strategyAimJoins = aimJoinsByStrategy.get(row.lineage_id) || [];
    const strategyIcpJoins = icpJoinsByStrategy.get(row.lineage_id) || [];
    return {
      ...row,
      aims: strategyAimJoins.map((join) => lookup.resolveAim(join)),
      icps: strategyIcpJoins.map((join) => lookup.resolveIcp(join)),
    };
  });
}

export function useBrandStrategies(brandId: string) {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<StrategyWithLinks[]>([]);
  const [archivedStrategies, setArchivedStrategies] = useState<StrategyWithLinks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCacheRef = useRef<StrategyFetchCache>({
    currentRows: [],
    archivedRows: [],
    aimLink: [],
    icpLink: [],
  });

  const fetchStrategies = useCallback(async () => {
    if (!user?.id || !brandId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: currentRows, error: currentError } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", brandId)
        .is("superseded_at", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (currentError) throw currentError;

      const { data: archivedAllRows, error: archivedError } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", brandId)
        .not("deleted_at", "is", null)
        .order("version", { ascending: false });

      if (archivedError) throw archivedError;

      const archivedByLineage = new Map<string, StrategyRow>();
      for (const row of (archivedAllRows || []) as StrategyRow[]) {
        const existing = archivedByLineage.get(row.lineage_id);
        if (!existing || row.version > existing.version) {
          archivedByLineage.set(row.lineage_id, row);
        }
      }

      const archivedCurrent = Array.from(archivedByLineage.values()).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      const currentLineages = (currentRows || []).map((r: StrategyRow) => r.lineage_id);
      const archivedLineages = archivedCurrent.map((r) => r.lineage_id);
      const allLineages = Array.from(new Set([...currentLineages, ...archivedLineages]));

      const [aimLinkRows, icpLinkRows] = await Promise.all([
        allLineages.length
          ? supabase
              .from("strategy_aims")
              .select("strategy_lineage_id, aim_lineage_id, aim_title_snapshot, aim_type_snapshot")
              .eq("user_id", user.id)
              .in("strategy_lineage_id", allLineages)
          : Promise.resolve({ data: [], error: null }),
        allLineages.length
          ? supabase
              .from("strategy_targets")
              .select("strategy_lineage_id, icp_lineage_id, icp_name_snapshot")
              .eq("user_id", user.id)
              .in("strategy_lineage_id", allLineages)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (aimLinkRows.error) throw aimLinkRows.error;
      if (icpLinkRows.error) throw icpLinkRows.error;

      const aimLink = (aimLinkRows.data || []) as StrategyLinkAimRow[];
      const icpLink = (icpLinkRows.data || []) as StrategyLinkIcpRow[];

      const currentStrategyRows = (currentRows || []) as StrategyRow[];

      fetchCacheRef.current = {
        currentRows: currentStrategyRows,
        archivedRows: archivedCurrent,
        aimLink,
        icpLink,
      };

      const next = await attachCompositionToStrategies(
        user.id,
        currentStrategyRows,
        aimLink,
        icpLink
      );

      const nextArchived = await attachCompositionToStrategies(
        user.id,
        archivedCurrent,
        aimLink,
        icpLink
      );

      setStrategies(next);
      setArchivedStrategies(nextArchived);
    } catch (err: any) {
      console.error("[useBrandStrategies] fetch failed", err);
      setError(err?.message || "Failed to load strategies.");
      setStrategies([]);
      setArchivedStrategies([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, brandId]);

  const refreshComposition = useCallback(async () => {
    if (!user?.id) return;
    const { currentRows, archivedRows, aimLink, icpLink } = fetchCacheRef.current;
    if (!currentRows.length && !archivedRows.length) return;

    try {
      const [next, nextArchived] = await Promise.all([
        attachCompositionToStrategies(user.id, currentRows, aimLink, icpLink),
        attachCompositionToStrategies(user.id, archivedRows, aimLink, icpLink),
      ]);
      setStrategies(next);
      setArchivedStrategies(nextArchived);
    } catch (err) {
      console.error("[useBrandStrategies] composition refresh failed", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchStrategies();
  }, [fetchStrategies, user?.id]);

  useEffect(() => {
    const onChanged = () => void fetchStrategies();
    window.addEventListener("strategies:changed", onChanged);
    return () => window.removeEventListener("strategies:changed", onChanged);
  }, [fetchStrategies]);

  useEffect(() => subscribeStrategyCompositionStale(() => void refreshComposition()), [refreshComposition]);

  const createStrategy = useCallback(
    async (input: {
      aimLineageIds: string[];
      icpLineageIds: string[];
      title?: string;
      channel?: string | null;
      tone?: string | null;
      offerType?: string | null;
      businessStage?: string | null;
      monthlyBudgetBand?: string | null;
      objectiveHorizon?: string | null;
      marketingCapacity?: string | null;
    }) => {
      if (!user?.id) return null;
      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-icp-strategy",
        {
          body: {
            brandId,
            aimLineageIds: input.aimLineageIds,
            icpLineageIds: input.icpLineageIds,
            title: input.title ?? null,
            channel: input.channel ?? null,
            tone: input.tone ?? null,
            offerType: input.offerType ?? null,
            businessStage: input.businessStage ?? null,
            monthlyBudgetBand: input.monthlyBudgetBand ?? null,
            objectiveHorizon: input.objectiveHorizon ?? null,
            marketingCapacity: input.marketingCapacity ?? null,
          },
        }
      );

      if (invokeError) throw invokeError;
      if (!data?.record) {
        await fetchStrategies();
        return null;
      }

      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();
      return data.record as StrategyRow;
    },
    [brandId, fetchStrategies, user?.id]
  );

  const updateStrategy = useCallback(
    async (
      strategyId: string,
      updates: {
        title?: string;
        strategy?: ICPStrategyPayload;
        channel?: string[] | null;
      }
    ): Promise<StrategyRow | null> => {
      if (!user?.id) return null;
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.strategy !== undefined) payload.strategy = updates.strategy;
      if (updates.channel !== undefined) payload.channel = updates.channel;

      const next = await insertStrategyVersionRpc(strategyId, payload);
      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();
      return next;
    },
    [fetchStrategies, user?.id]
  );

  const archiveStrategy = useCallback(
    async (lineageId: string) => {
      if (!user?.id || !lineageId) return false;
      const { error } = await supabase.rpc("strategy_soft_delete_lineage", {
        p_lineage_id: lineageId,
      });
      if (error) throw error;
      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();
      return true;
    },
    [fetchStrategies, user?.id]
  );

  const restoreStrategy = useCallback(
    async (lineageId: string) => {
      if (!user?.id || !lineageId) return false;
      const { error } = await supabase.rpc("strategy_restore_lineage", {
        p_lineage_id: lineageId,
      });
      if (error) throw error;
      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();
      return true;
    },
    [fetchStrategies, user?.id]
  );

  const hardDeleteStrategy = useCallback(
    async (lineageId: string) => {
      if (!lineageId) return false;
      await hardDeleteStrategyLineage(lineageId);
      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();
      return true;
    },
    [fetchStrategies]
  );

  return {
    strategies,
    archivedStrategies,
    isLoading,
    error,
    fetchStrategies,
    createStrategy,
    updateStrategy,
    archiveStrategy,
    restoreStrategy,
    hardDeleteStrategy,
  };
}
