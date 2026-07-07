import { supabase } from "../config/supabase";
import { ensureBrandForPostAuth } from "./ensureGuestBrand";
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

/** Create a minimal default brand when no guest/onboarding context exists. */
async function ensureDefaultBrandForUser(userId: string): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brands")
    .insert([
      {
        user_id: userId,
        name: "My Brand",
        created_at: now,
        updated_at: now,
      },
    ])
    .select("id")
    .single();

  if (error) {
    const existing = await fetchUserPrimaryBrandId(userId);
    if (existing) return existing;

    const err = new Error(
      `[icpBrand] failed to ensure default brand: ${(error as { message?: string })?.message ?? "unknown"}`
    );
    logSupabaseError("[icpBrand] ensureDefaultBrandForUser failed", error);
    throw err;
  }

  return data.id;
}

/**
 * Resolve or create a brand for ICP writes. Never returns null — throws if unrecoverable.
 * Order: explicit/preferred → primary brand → guest post-auth brand → default brand.
 */
export async function resolveBrandIdForIcpWrite(
  userId: string,
  preferredBrandId?: string | null
): Promise<string> {
  let brandId = await resolveBrandIdForIcpOps(userId, preferredBrandId ?? null);
  if (brandId) return brandId;

  brandId = await ensureBrandForPostAuth(userId);
  if (brandId) return brandId;

  brandId = await ensureDefaultBrandForUser(userId);
  if (!brandId) {
    const err = new Error("[icpBrand] ICP write blocked: could not resolve or create brand");
    logSupabaseError("[icpBrand] resolveBrandIdForIcpWrite failed", err);
    throw err;
  }

  return brandId;
}

/** Resolve brand_id on an ICP insert row (outbox replay, edge inserts). Fails if no brand. */
export async function resolveBrandIdForIcpInsertPayload<T extends { brand_id?: string | null }>(
  userId: string,
  payload: T
): Promise<T & { brand_id: string }> {
  const brand_id = await resolveBrandIdForIcpWrite(userId, payload.brand_id ?? null);
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
