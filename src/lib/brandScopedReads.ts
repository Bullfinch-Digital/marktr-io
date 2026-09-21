/**
 * Helpers for reads scoped to the active brand in BrandContext.
 */

export const ACTIVE_BRAND_STORAGE_KEY = "marktr_active_brand_id";

export type BrandRowRef = { id: string };

export function readStoredActiveBrandId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolved brand id for scoped reads: explicit active id, else first brand when loaded.
 * Never returns a value that should be sent as .eq("brand_id", null).
 */
export function resolveScopedBrandId(
  activeBrandId: string | null | undefined,
  brands: BrandRowRef[]
): string | null {
  if (activeBrandId) return activeBrandId;
  return brands[0]?.id ?? null;
}

export function isBrandScopeReady(
  brandLoading: boolean,
  brands: BrandRowRef[],
  scopedBrandId: string | null
): boolean {
  if (brandLoading) return false;
  if (brands.length > 0 && !scopedBrandId) return false;
  return true;
}

export function scopeQueryToActiveBrand<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  scopedBrandId: string | null
): T {
  if (scopedBrandId) {
    return query.eq("brand_id", scopedBrandId);
  }
  return query;
}
