/**
 * Helpers for reads scoped to the active brand in BrandContext.
 */

export function isBrandScopeReady(
  brandLoading: boolean,
  brandsCount: number,
  activeBrandId: string | null
): boolean {
  if (brandLoading) return false;
  if (brandsCount > 0 && !activeBrandId) return false;
  return true;
}

export function scopeQueryToActiveBrand<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  activeBrandId: string | null
): T {
  if (activeBrandId) {
    return query.eq("brand_id", activeBrandId);
  }
  return query;
}
