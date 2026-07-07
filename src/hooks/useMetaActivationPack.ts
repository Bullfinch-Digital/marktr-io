import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";

export const MAX_META_PACKS = 10;

export type MetaActivationPackPayload = {
  audience_plan: Array<{
    audience_name: string;
    source_type: string;
    build_rule: string;
    retention_window: string;
    use_case: string;
    exclusions: string[];
  }>;
  seed_quality: {
    primary_seed_definition: string;
    fallback_seed_definition: string;
    minimum_size: string;
    recommended_size: string;
    data_quality_checklist: string[];
    do_not_use_cohorts: string[];
  };
  lookalike_plan: {
    source_audiences: string[];
    tier_recommendations: Array<{
      tier_name: string;
      percentage: string;
      use_case: string;
    }>;
    stacking_strategy: string;
    mandatory_exclusions: string[];
    location_note: string;
  };
  messaging_matrix: Array<{
    audience: string;
    funnel_stage: string;
    awareness_level: string;
    pain_angle: string;
    promise_angle: string;
    primary_cta: string;
    proof_type: string;
    creative_format: string;
  }>;
  roadmap_30d: Array<{
    week: string;
    focus: string;
    tasks: string[];
    checkpoint: string;
    decision_rule: string;
  }>;
  compliance_notes: string[];
};

export type MetaActivationPackRecord = {
  id: string;
  icp_id: string;
  user_id: string;
  strategy_id: string | null;
  pack_name: string;
  goal: string | null;
  pack_json: MetaActivationPackPayload;
  prompt_version: string;
  model: string;
  created_at: string;
  updated_at: string;
};

type GenerateMetaPackInput = {
  strategyId?: string | null;
  goal?: string | null;
  packName?: string | null;
};

export function useMetaActivationPack(icpId?: string | null) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MetaActivationPackRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    if (!user?.id || !icpId) {
      setRecords([]);
      setSelectedId(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("icp_meta_activation_packs")
        .select("*")
        .eq("icp_id", icpId)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      const next = ((data as MetaActivationPackRecord[]) || []).filter(Boolean);
      setRecords(next);
      setSelectedId((prev) => {
        if (prev && next.some((r) => r.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch (err: any) {
      console.error("useMetaActivationPack: fetch error", err);
      setError(err?.message || "Failed to load Meta activation packs.");
    } finally {
      setIsLoading(false);
    }
  }, [icpId, user?.id]);

  useEffect(() => {
    void fetchPacks();
  }, [fetchPacks]);

  const generatePack = useCallback(
    async (input: GenerateMetaPackInput) => {
      if (!user?.id || !icpId) {
        setError("Missing user or ICP.");
        return null;
      }
      if (records.length >= MAX_META_PACKS) {
        setError(`You can save up to ${MAX_META_PACKS} Meta activation packs per ICP.`);
        return null;
      }

      setIsGenerating(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "generate-meta-activation-pack",
          {
            body: {
              icpId,
              strategyId: input.strategyId ?? null,
              goal: input.goal ?? null,
              packName: input.packName ?? null,
            },
          }
        );
        if (invokeError) throw invokeError;

        const record = (data?.record as MetaActivationPackRecord) || null;
        if (record) {
          setRecords((prev) => [record, ...prev]);
          setSelectedId(record.id);
        }
        return data;
      } catch (err: any) {
        console.error("useMetaActivationPack: generate error", err);
        setError(err?.message || "Failed to generate Meta activation pack.");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [icpId, user?.id, records.length]
  );

  const renamePack = useCallback(async (packId: string, nextNameRaw: string) => {
    const nextName = nextNameRaw.trim();
    if (!nextName) {
      setError("Pack name cannot be empty.");
      return false;
    }
    try {
      const { data, error: updateError } = await supabase
        .from("icp_meta_activation_packs")
        .update({
          pack_name: nextName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packId)
        .select("*")
        .single();
      if (updateError) throw updateError;
      const updated = data as MetaActivationPackRecord;
      setRecords((prev) => prev.map((r) => (r.id === packId ? updated : r)));
      setError(null);
      return true;
    } catch (err: any) {
      console.error("useMetaActivationPack: rename error", err);
      setError(err?.message || "Failed to rename pack.");
      return false;
    }
  }, []);

  const deletePack = useCallback(async (packId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("icp_meta_activation_packs")
        .delete()
        .eq("id", packId);
      if (deleteError) throw deleteError;

      setRecords((prev) => {
        const next = prev.filter((r) => r.id !== packId);
        setSelectedId((current) => {
          if (current !== packId) return current;
          return next[0]?.id ?? null;
        });
        return next;
      });
      setError(null);
      return true;
    } catch (err: any) {
      console.error("useMetaActivationPack: delete error", err);
      setError(err?.message || "Failed to delete pack.");
      return false;
    }
  }, []);

  return {
    records,
    selectedId,
    selectPack: setSelectedId,
    record: records.find((r) => r.id === selectedId) ?? null,
    pack: (records.find((r) => r.id === selectedId) ?? null)?.pack_json ?? null,
    isLoading,
    isGenerating,
    error,
    maxPacks: MAX_META_PACKS,
    fetchPacks,
    generatePack,
    renamePack,
    deletePack,
  };
}
