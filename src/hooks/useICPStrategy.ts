import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";

export type ICPStrategyPayload = {
  positioning: {
    one_liner: string;
    why_us: string;
    differentiators: string[];
  };
  messaging: {
    value_props: string[];
    pain_to_promise: string[];
    objections_and_rebuttals: string[];
  };
  campaign_ideas: Array<{
    name: string;
    hook: string;
    angle: string;
    cta: string;
  }>;
  channel_plan: {
    primary_channel: string;
    secondary_channels: string[];
    first_14_days: string[];
  };
  offer: {
    recommended_offer: string;
    lead_magnet_idea: string | null;
    landing_page_sections: string[];
  };
  ad_assets: {
    headlines: string[];
    primary_texts: string[];
    creative_briefs: string[];
  } | null;
  success_metrics: {
    kpis: string[];
    targets: string[];
  };
};

export type ICPStrategyRecord = {
  id: string;
  icp_id: string;
  user_id: string;
  goal: string;
  channel: string | null;
  offer_type: string | null;
  tone: string | null;
  strategy_name: string | null;
  strategy: ICPStrategyPayload;
  prompt_version: string;
  model: string;
  created_at: string;
  updated_at: string;
};

type GenerateStrategyInput = {
  goal: string;
  channel?: string | null;
  offerType?: string | null;
  tone?: string | null;
  businessStage?: string | null;
  monthlyBudgetBand?: string | null;
  objectiveHorizon?: string | null;
  marketingCapacity?: string | null;
};

export const MAX_ICP_STRATEGIES = 10;

export function useICPStrategy(icpId?: string | null) {
  const { user } = useAuth();
  const [records, setRecords] = useState<ICPStrategyRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategy = useCallback(async () => {
    if (!user?.id || !icpId) {
      setRecords([]);
      setSelectedId(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("icp_strategies")
        .select("*")
        .eq("icp_id", icpId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      const next = ((data as ICPStrategyRecord[]) || []).filter(Boolean);
      setRecords(next);
      setSelectedId((prev) => {
        if (prev && next.some((r) => r.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch (err: any) {
      console.error("useICPStrategy: fetch error", err);
      setError(err?.message || "Failed to load strategy.");
    } finally {
      setIsLoading(false);
    }
  }, [icpId, user?.id]);

  useEffect(() => {
    void fetchStrategy();
  }, [fetchStrategy]);

  const generateStrategy = useCallback(
    async (input: GenerateStrategyInput) => {
      if (!user?.id || !icpId) {
        setError("Missing user or ICP.");
        return null;
      }

      if (records.length >= MAX_ICP_STRATEGIES) {
        setError(`You can save up to ${MAX_ICP_STRATEGIES} strategies per ICP.`);
        return null;
      }

      setIsGenerating(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "generate-icp-strategy",
          {
            body: {
              icpId,
              goal: input.goal,
              channel: input.channel ?? null,
              offerType: input.offerType ?? null,
              tone: input.tone ?? null,
              businessStage: input.businessStage ?? null,
              monthlyBudgetBand: input.monthlyBudgetBand ?? null,
              objectiveHorizon: input.objectiveHorizon ?? null,
              marketingCapacity: input.marketingCapacity ?? null,
            },
          }
        );

        if (invokeError) throw invokeError;

        const nextRecord = (data?.record as ICPStrategyRecord) || null;
        if (nextRecord) {
          setRecords((prev) => [nextRecord, ...prev]);
          setSelectedId(nextRecord.id);
        }

        try {
          window.dispatchEvent(new Event("icpStrategy:changed"));
        } catch {}

        return data;
      } catch (err: any) {
        console.error("useICPStrategy: generate error", err);
        setError(err?.message || "Failed to generate strategy.");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [icpId, user?.id, records.length]
  );

  const renameStrategy = useCallback(
    async (strategyId: string, nextNameRaw: string) => {
      const nextName = nextNameRaw.trim();
      if (!nextName) {
        setError("Strategy name cannot be empty.");
        return false;
      }
      try {
        const { data, error: updateError } = await supabase
          .from("icp_strategies")
          .update({
            strategy_name: nextName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", strategyId)
          .select("*")
          .single();
        if (updateError) throw updateError;
        const updated = data as ICPStrategyRecord;
        setRecords((prev) => prev.map((r) => (r.id === strategyId ? updated : r)));
        setError(null);
        return true;
      } catch (err: any) {
        console.error("useICPStrategy: rename error", err);
        setError(err?.message || "Failed to rename strategy.");
        return false;
      }
    },
    []
  );

  const deleteStrategy = useCallback(
    async (strategyId: string) => {
      try {
        const { error: deleteError } = await supabase
          .from("icp_strategies")
          .delete()
          .eq("id", strategyId);
        if (deleteError) throw deleteError;

        setRecords((prev) => {
          const next = prev.filter((r) => r.id !== strategyId);
          setSelectedId((current) => {
            if (current !== strategyId) return current;
            return next[0]?.id ?? null;
          });
          return next;
        });
        setError(null);
        return true;
      } catch (err: any) {
        console.error("useICPStrategy: delete error", err);
        setError(err?.message || "Failed to delete strategy.");
        return false;
      }
    },
    []
  );

  return {
    records,
    record: records.find((r) => r.id === selectedId) ?? null,
    strategy: (records.find((r) => r.id === selectedId) ?? null)?.strategy ?? null,
    selectedId,
    selectStrategy: setSelectedId,
    isLoading,
    isGenerating,
    error,
    fetchStrategy,
    generateStrategy,
    renameStrategy,
    deleteStrategy,
    maxStrategies: MAX_ICP_STRATEGIES,
  };
}
