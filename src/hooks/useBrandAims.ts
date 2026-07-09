import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { resolveBrandIdForAimWrite } from "../lib/brandAimBrandAttach";
import { dispatchAimsChanged } from "../lib/strategyEvents";
import {
  applyCurrentBrandAimFilter,
  BRAND_AIM_TYPE_OPTIONS,
  BrandAimType,
  hardDeleteBrandAimLineage,
  insertBrandAimVersionRpc,
  restoreBrandAimLineage,
  softDeleteBrandAimLineage,
} from "../lib/brandAimVersioning";

export interface BrandAim {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  aim_type: BrandAimType;
  description?: string | null;
  lineage_id: string;
  version: number;
  superseded_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

type AimInput = {
  title: string;
  aim_type: BrandAimType;
  description?: string | null;
  brand_id?: string | null;
};

function isValidAimType(value: unknown): value is BrandAimType {
  return BRAND_AIM_TYPE_OPTIONS.includes(value as BrandAimType);
}

export function useBrandAims(preferredBrandId?: string | null) {
  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, brands, loading: brandLoading } = useBrand();
  const [aims, setAims] = useState<BrandAim[]>([]);
  const [archivedAims, setArchivedAims] = useState<BrandAim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopedBrandId = useMemo(() => {
    if (preferredBrandId) return preferredBrandId;
    return resolveScopedBrandId(activeBrandId, brands || []);
  }, [preferredBrandId, activeBrandId, brands]);

  const fetchAims = useCallback(async () => {
    if (!user?.id) {
      setAims([]);
      setArchivedAims([]);
      setIsLoading(false);
      return;
    }
    if (!isBrandScopeReady(brandLoading, brands || [], scopedBrandId)) return;
    if (!scopedBrandId) {
      setAims([]);
      setArchivedAims([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let currentQuery = supabase
        .from("brand_aims")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", scopedBrandId)
        .order("created_at", { ascending: false });
      currentQuery = applyCurrentBrandAimFilter(currentQuery);
      const { data: currentRows, error: currentError } = await currentQuery;
      if (currentError) throw currentError;

      const { data: archivedRows, error: archivedError } = await supabase
        .from("brand_aims")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", scopedBrandId)
        .not("deleted_at", "is", null)
        .order("version", { ascending: false });
      if (archivedError) throw archivedError;

      const byLineage = new Map<string, BrandAim>();
      for (const row of (archivedRows || []) as BrandAim[]) {
        const existing = byLineage.get(row.lineage_id);
        if (!existing || (!row.superseded_at && existing.superseded_at)) {
          byLineage.set(row.lineage_id, row);
        }
      }

      setAims(((currentRows || []) as BrandAim[]).filter((row) => isValidAimType(row.aim_type)));
      setArchivedAims(Array.from(byLineage.values()).filter((row) => isValidAimType(row.aim_type)));
    } catch (err: any) {
      console.error("useBrandAims: fetch error", err);
      setError(err?.message || "Failed to fetch brand aims");
      setAims([]);
      setArchivedAims([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, scopedBrandId, brandLoading, brands]);

  useEffect(() => {
    if (authLoading) return;
    void fetchAims();
  }, [authLoading, fetchAims]);

  useEffect(() => {
    const onChanged = () => {
      void fetchAims();
    };
    window.addEventListener("brand-aims:changed", onChanged);
    return () => window.removeEventListener("brand-aims:changed", onChanged);
  }, [fetchAims]);

  const createAim = useCallback(
    async (input: AimInput): Promise<BrandAim | null> => {
      if (!user?.id) return null;
      if (!isValidAimType(input.aim_type)) {
        throw new Error("Invalid aim type");
      }
      const brandId = await resolveBrandIdForAimWrite(
        user.id,
        input.brand_id ?? scopedBrandId ?? null
      );
      const now = new Date().toISOString();
      const row = {
        user_id: user.id,
        brand_id: brandId,
        title: input.title.trim(),
        aim_type: input.aim_type,
        description: input.description?.trim() || null,
        version: 1,
        superseded_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      };
      const { data, error: createError } = await supabase
        .from("brand_aims")
        .insert([row])
        .select()
        .single();
      if (createError) throw createError;
      const created = data as BrandAim;
      await fetchAims();
      dispatchAimsChanged();
      return created;
    },
    [user?.id, scopedBrandId, fetchAims]
  );

  const updateAim = useCallback(
    async (id: string, updates: AimInput): Promise<BrandAim | null> => {
      if (!user?.id) return null;
      if (!isValidAimType(updates.aim_type)) {
        throw new Error("Invalid aim type");
      }
      const brandId = await resolveBrandIdForAimWrite(
        user.id,
        updates.brand_id ?? scopedBrandId ?? null
      );
      const payload = {
        title: updates.title.trim(),
        aim_type: updates.aim_type,
        description: updates.description?.trim() || null,
        brand_id: brandId,
      };
      const next = (await insertBrandAimVersionRpc(id, payload)) as BrandAim;
      await fetchAims();
      dispatchAimsChanged();
      return next;
    },
    [user?.id, scopedBrandId, fetchAims]
  );

  const archiveAim = useCallback(
    async (lineageId: string): Promise<boolean> => {
      if (!lineageId) return false;
      await softDeleteBrandAimLineage(lineageId);
      await fetchAims();
      dispatchAimsChanged();
      return true;
    },
    [fetchAims]
  );

  const restoreAim = useCallback(
    async (lineageId: string): Promise<boolean> => {
      if (!lineageId) return false;
      await restoreBrandAimLineage(lineageId);
      await fetchAims();
      dispatchAimsChanged();
      return true;
    },
    [fetchAims]
  );

  const hardDeleteAim = useCallback(
    async (lineageId: string): Promise<boolean> => {
      if (!lineageId) return false;
      await hardDeleteBrandAimLineage(lineageId);
      await fetchAims();
      dispatchAimsChanged();
      return true;
    },
    [fetchAims]
  );

  return {
    aims,
    archivedAims,
    isLoading,
    error,
    scopedBrandId,
    fetchAims,
    createAim,
    updateAim,
    archiveAim,
    restoreAim,
    hardDeleteAim,
  };
}
