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
  lineage_id: string;
  user_id: string;
  goal: string;
  channel: string | null;
  offer_type: string | null;
  tone: string | null;
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

async function resolveLineageIdForIcp(
  userId: string,
  icpId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("icps")
    .select("lineage_id")
    .eq("id", icpId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as { lineage_id?: string | null } | null)?.lineage_id ?? null;
}

export function useICPStrategy(icpId?: string | null) {
  const { user } = useAuth();
  const [record, setRecord] = useState<ICPStrategyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategy = useCallback(async () => {
    if (!user?.id || !icpId) {
      setRecord(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const lineageId = await resolveLineageIdForIcp(user.id, icpId);
      if (!lineageId) {
        setRecord(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("icp_strategies")
        .select("*")
        .eq("lineage_id", lineageId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setRecord((data as ICPStrategyRecord) || null);
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
        setRecord(nextRecord);

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
    [icpId, user?.id]
  );

  return {
    record,
    strategy: record?.strategy ?? null,
    isLoading,
    isGenerating,
    error,
    fetchStrategy,
    generateStrategy,
  };
}
