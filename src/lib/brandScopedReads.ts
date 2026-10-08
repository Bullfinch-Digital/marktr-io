/**
 * Helpers for reads scoped to the active brand in BrandContext.
 */

export const ACTIVE_BRAND_STORAGE_KEY = "marktr_active_brand_id";
export const ACTIVE_BRAND_SET_EVENT = "active-brand:set";

export type BrandRowRef = { id: string };

export function readStoredActiveBrandId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist the active brand and notify BrandContext — safe to call outside React. */
export function persistActiveBrandId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_BRAND_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
  try {
    window.dispatchEvent(new CustomEvent(ACTIVE_BRAND_SET_EVENT, { detail: { id } }));
  } catch {
    // ignore
  }
}

/**
 * Choose the active brand without snapping to brands[0] while a just-created
 * id is still catching up in the in-memory list.
 */
export function pickActiveBrandId(
  brands: BrandRowRef[],
  preferredId: string | null
): string | null {
  if (preferredId && brands.some((b) => b.id === preferredId)) {
    return preferredId;
  }
  const stored = readStoredActiveBrandId();
  if (stored && brands.some((b) => b.id === stored)) {
    return stored;
  }
  if (preferredId) return preferredId;
  if (stored) return stored;
  return brands[0]?.id ?? null;
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
