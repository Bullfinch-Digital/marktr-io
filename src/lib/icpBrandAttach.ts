import { supabase } from "../config/supabase";
import { logSupabaseError } from "./guestICP";

/**
 * First brand for a user (same ordering as ensureBrandForPostAuth).
 */
export async function fetchUserPrimaryBrandId(userId: string): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    logSupabaseError("[icpBrand] primary brand lookup failed", error);
    return null;
  }

  return data?.[0]?.id ?? null;
}

/**
 * Prefer explicit brand id (e.g. from BrandContext), else load primary brand from DB.
 */
export async function resolveBrandIdForIcpOps(
  userId: string,
  preferredBrandId?: string | null
): Promise<string | null> {
  if (preferredBrandId) return preferredBrandId;
  return fetchUserPrimaryBrandId(userId);
}

/** Resolve brand_id on an ICP insert row (outbox replay, edge inserts). */
export async function resolveBrandIdForIcpInsertPayload<T extends { brand_id?: string | null }>(
  userId: string,
  payload: T
): Promise<T & { brand_id: string | null }> {
  const brand_id = await resolveBrandIdForIcpOps(userId, payload.brand_id ?? null);
  return { ...payload, brand_id };
}

/**
 * Attach user ICP rows with null brand_id to the given brand.
 * When onlyWhenSingleBrand is true, skips if the user has more than one brand.
 */
export async function attachOrphanIcpsToBrand(
  userId: string,
  brandId: string,
  opts?: { onlyWhenSingleBrand?: boolean }
): Promise<number> {
  if (!userId || !brandId) return 0;

  if (opts?.onlyWhenSingleBrand) {
    const { count, error: countError } = await supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      logSupabaseError("[icpBrand] brand count failed", countError);
      return 0;
    }
    if ((count ?? 0) > 1) return 0;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("icps")
    .update({ brand_id: brandId, updated_at: now })
    .eq("user_id", userId)
    .is("brand_id", null)
    .select("id");

  if (error) {
    logSupabaseError("[icpBrand] attach orphan ICPs failed", error);
    return 0;
  }

  const attached = data?.length ?? 0;
  if (attached > 0) {
    console.log("[icpBrand] attached orphan ICPs to brand", { userId, brandId, attached });
  }
  return attached;
}
