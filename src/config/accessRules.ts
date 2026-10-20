export const TIER_LIMITS = {
  free: {
    maxICPs: 3,
    maxCollections: 1,
    maxBrands: 1,
    maxViewableICPs: 1,
    exportAllowedBeyondFirst: false,
  },
  pro: {
    maxICPs: 100,
    maxCollections: 50,
    maxBrands: 50,
    maxViewableICPs: 100,
    exportAllowedBeyondFirst: true,
  },
  team: {
    maxICPs: 5000,
    maxCollections: 5000,
    maxBrands: 5000,
    maxViewableICPs: 5000,
    exportAllowedBeyondFirst: true,
  },
};

export type Tier = keyof typeof TIER_LIMITS;
type TierInput = Tier | "paid" | null | undefined;

export function normalizeTier(tier?: TierInput): Tier {
  if (tier === "paid") return "pro";
  if (tier === "pro" || tier === "team" || tier === "free") return tier;
  return "free";
}

export function canCreateICP(count: number, tier: TierInput) {
  const resolved = normalizeTier(tier);
  return count < TIER_LIMITS[resolved].maxICPs;
}

export function canCreateCollection(count: number, tier: TierInput) {
  const resolved = normalizeTier(tier);
  return count < TIER_LIMITS[resolved].maxCollections;
}

export function canCreateBrand(count: number, tier: TierInput) {
  const resolved = normalizeTier(tier);
  return count < (TIER_LIMITS[resolved] as any).maxBrands;
}

export function canViewICP(tier: TierInput, index: number) {
  const resolved = normalizeTier(tier);
  return index < TIER_LIMITS[resolved].maxViewableICPs;
}

export function isICPLocked(tier: TierInput, index: number) {
  return !canViewICP(tier, index);
}

export function canExportICP(_index: number, tier: TierInput) {
  const resolved = normalizeTier(tier);
  // Pro + Team: export allowed
  if (resolved === "team") return true;
  if (resolved === "pro") return true;
  // Free: no exports
  if (resolved === "free") return false;
  return false;
}

export function canExportBrand(tier: TierInput) {
  const resolved = normalizeTier(tier);
  // Mirror ICP export rules: free cannot export; pro/team can.
  if (resolved === "team") return true;
  if (resolved === "pro") return true;
  if (resolved === "free") return false;
  return false;
}
