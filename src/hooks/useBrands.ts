import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";

export interface Brand {
  id: string;
  user_id: string;
  // DB: brands.name is NOT NULL
  name: string;
  color?: string | null;
  website?: string | null;
  business_description?: string | null;
  product_or_service?: string | null;
  business_type?: "B2B" | "B2C" | "Both" | string | null;
  assumed_audience?: string[] | null;
  marketing_channels?: string[] | null;
  country?: string | null;
  region_or_city?: string | null;
  currency?: string | null;
  founding_story?: string | null;
  core_values?: string[] | null;
  want_known_for?: string | null;
  never_associated_with?: string | null;
  voice_adjectives?: string[] | null;
  admired_brands?: string | null;
  brand_voice_profile?: string | null;
  competitors?: {
    name: string;
    url: string;
    does_well: string;
    we_do_instead: string;
  }[] | null;
  active_platforms?: string[] | null;
  posting_frequency?: Record<string, string> | null;
  runs_paid_ads?: boolean | null;
  monthly_ad_spend?: number | null;
  email_list_size?: number | null;
  email_platform?: string | null;
  primary_goal?: string | null;
  platform_focus?: string | null;
  monthly_content_volume?: string | null;
  success_markers?: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Minimal Brands hook (CRUD) — safe to introduce before any UI.
 */
export function useBrands() {
  const { user, loading: authLoading } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchBrands = useCallback(async () => {
    if (!user?.id) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setBrands((data as Brand[]) || []);
    } catch (err: any) {
      console.error("useBrands: fetch error", err);
      setError(err?.message || "Failed to fetch brands");
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setBrands([]);
      setIsLoading(false);
      return;
    }
    fetchBrands();
  }, [authLoading, user?.id, fetchBrands]);

  // Refresh when brands are created/updated elsewhere (e.g., onboarding/auth pipeline)
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => {
      void fetchBrands();
    };
    window.addEventListener("brands:changed", handler);
    return () => window.removeEventListener("brands:changed", handler);
  }, [user?.id, fetchBrands]);

  const getBrand = useCallback(
    async (id: string): Promise<Brand | null> => {
      if (!user?.id) return null;
      const existing = brands.find((b) => b.id === id);
      if (existing) return existing;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        if (error) throw error;
        return data as Brand;
      } catch (err) {
        console.error("useBrands: getBrand error", err);
        return null;
      }
    },
    [user?.id, brands]
  );

  const createBrand = useCallback(
    async (payload: Partial<Brand>): Promise<Brand | null> => {
      if (!user?.id) return null;

      const now = new Date().toISOString();
      const row = {
        user_id: user.id,
        // DB requires non-null name
        name: (payload as any)?.name?.trim?.() ? (payload as any).name : "Untitled Brand",
        color: payload.color ?? null,
        website: payload.website ?? null,
        business_description: payload.business_description ?? null,
        product_or_service: payload.product_or_service ?? null,
        business_type: payload.business_type ?? null,
        assumed_audience: payload.assumed_audience ?? [],
        marketing_channels: payload.marketing_channels ?? [],
        country: payload.country ?? null,
        region_or_city: payload.region_or_city ?? null,
        currency: payload.currency ?? null,
        created_at: now,
        updated_at: now,
      };

      try {
        const { data, error } = await supabase
          .from("brands")
          .insert([row])
          .select()
          .single();
        if (error) throw error;

        const created = data as Brand;
        setBrands((prev) => [created, ...prev]);
        try {
          window.dispatchEvent(new Event("brands:changed"));
        } catch {}
        return created;
      } catch (err) {
        console.error("useBrands: createBrand error", err);
        return null;
      }
    },
    [user?.id]
  );

  const updateBrand = useCallback(
    async (id: string, updates: Partial<Brand>): Promise<boolean> => {
      if (!user?.id) return false;

      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // optimistic
      setBrands((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updatesWithTimestamp } : b))
      );

      try {
        const { data, error } = await supabase
          .from("brands")
          .update(updatesWithTimestamp)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;

        const updated = data as Brand;
        setBrands((prev) => prev.map((b) => (b.id === id ? updated : b)));
        return true;
      } catch (err) {
        console.error("useBrands: updateBrand error", err);
        // safest revert: refetch authoritative state
        fetchBrands();
        return false;
      }
    },
    [user?.id, fetchBrands]
  );

  const deleteBrand = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false;

      const prev = brands;
      setBrands((p) => p.filter((b) => b.id !== id));

      try {
        const { error } = await supabase
          .from("brands")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;

        // FK on icps.brand_id is ON DELETE SET NULL.
        // Ensure any cached ICP lists refresh so "No brand allocated" shows immediately.
        try {
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
        return true;
      } catch (err) {
        console.error("useBrands: deleteBrand error", err);
        setBrands(prev);
        return false;
      }
    },
    [user?.id, brands]
  );

  return {
    brands,
    isLoading,
    error,
    fetchBrands,
    refetch: fetchBrands,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand,
  };
}
