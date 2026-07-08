import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { ICP } from "./useICPs";
import type { BrandAim } from "./useBrandAims";
import type { ICPStrategyPayload } from "./useICPStrategy";

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
  aims: BrandAim[];
  icps: ICP[];
};

type StrategyLinkAimRow = {
  strategy_lineage_id: string;
  aim_lineage_id: string;
};

type StrategyLinkIcpRow = {
  strategy_lineage_id: string;
  icp_lineage_id: string;
};

export function useBrandStrategies(brandId: string) {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<StrategyWithLinks[]>([]);
  const [archivedStrategies, setArchivedStrategies] = useState<StrategyWithLinks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const archivedByLineage = new Map<string, any>();
      for (const row of archivedAllRows || []) {
        const existing = archivedByLineage.get(row.lineage_id);
        if (!existing || row.version > existing.version) {
          archivedByLineage.set(row.lineage_id, row);
        }
      }

      const archivedCurrent = Array.from(archivedByLineage.values()).sort(
        (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      const currentLineages = (currentRows || []).map((r: any) => r.lineage_id);
      const archivedLineages = archivedCurrent.map((r: any) => r.lineage_id);
      const allLineages = Array.from(new Set([...currentLineages, ...archivedLineages]));

      const [aimLinkRows, icpLinkRows] = await Promise.all([
        allLineages.length
          ? supabase
              .from("strategy_aims")
              .select("strategy_lineage_id, aim_lineage_id")
              .eq("user_id", user.id)
              .in("strategy_lineage_id", allLineages)
          : Promise.resolve({ data: [], error: null }),
        allLineages.length
          ? supabase
              .from("strategy_targets")
              .select("strategy_lineage_id, icp_lineage_id")
              .eq("user_id", user.id)
              .in("strategy_lineage_id", allLineages)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (aimLinkRows.error) throw aimLinkRows.error;
      if (icpLinkRows.error) throw icpLinkRows.error;

      const aimLink = (aimLinkRows.data || []) as StrategyLinkAimRow[];
      const icpLink = (icpLinkRows.data || []) as StrategyLinkIcpRow[];

      const aimLineages = Array.from(new Set(aimLink.map((r) => r.aim_lineage_id)));
      const icpLineages = Array.from(new Set(icpLink.map((r) => r.icp_lineage_id)));

      const [aimRows, icpRows] = await Promise.all([
        aimLineages.length
          ? supabase
              .from("brand_aims")
              .select("*")
              .eq("user_id", user.id)
              .is("superseded_at", null)
              .is("deleted_at", null)
              .in("lineage_id", aimLineages)
          : Promise.resolve({ data: [], error: null }),
        icpLineages.length
          ? supabase
              .from("icps")
              .select("*")
              .eq("user_id", user.id)
              .eq("brand_id", brandId)
              .is("superseded_at", null)
              .is("deleted_at", null)
              .in("lineage_id", icpLineages)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (aimRows.error) throw aimRows.error;
      if (icpRows.error) throw icpRows.error;

      const aimByLineage = new Map<string, BrandAim>(
        (aimRows.data || []).map((r: any) => [r.lineage_id, r as BrandAim])
      );

      const icpByLineage = new Map<string, ICP>(
        (icpRows.data || []).map((r: any) => [r.lineage_id, r as ICP])
      );

      const aimsByStrategy = new Map<string, BrandAim[]>();
      for (const link of aimLink) {
        const current = aimByLineage.get(link.aim_lineage_id);
        if (!current) continue;
        const list = aimsByStrategy.get(link.strategy_lineage_id) || [];
        list.push(current);
        aimsByStrategy.set(link.strategy_lineage_id, list);
      }

      const icpsByStrategy = new Map<string, ICP[]>();
      for (const link of icpLink) {
        const current = icpByLineage.get(link.icp_lineage_id);
        if (!current) continue;
        const list = icpsByStrategy.get(link.strategy_lineage_id) || [];
        list.push(current);
        icpsByStrategy.set(link.strategy_lineage_id, list);
      }

      const next = (currentRows || []).map((row: any) => ({
        ...(row as StrategyRow),
        aims: aimsByStrategy.get(row.lineage_id) || [],
        icps: icpsByStrategy.get(row.lineage_id) || [],
      }));

      const nextArchived = archivedCurrent.map((row: any) => ({
        ...(row as StrategyRow),
        aims: aimsByStrategy.get(row.lineage_id) || [],
        icps: icpsByStrategy.get(row.lineage_id) || [],
      }));

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

  useEffect(() => {
    if (!user?.id) return;
    void fetchStrategies();
  }, [fetchStrategies, user?.id]);

  useEffect(() => {
    const onChanged = () => void fetchStrategies();
    window.addEventListener("strategies:changed", onChanged);
    return () => window.removeEventListener("strategies:changed", onChanged);
  }, [fetchStrategies]);

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
        // Strategy could have been created but record isn’t returned; treat as refresh.
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

  const regenerateStrategy = useCallback(
    async (input: {
      strategyId: string;
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
            strategyId: input.strategyId,
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

      try {
        window.dispatchEvent(new Event("strategies:changed"));
      } catch {}
      await fetchStrategies();

      return data?.record as StrategyRow | undefined;
    },
    [brandId, fetchStrategies, user?.id]
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

  return {
    strategies,
    archivedStrategies: archivedStrategies,
    isLoading,
    error,
    fetchStrategies,
    createStrategy,
    regenerateStrategy,
    archiveStrategy,
    restoreStrategy,
  };
}

