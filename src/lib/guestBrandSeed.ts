/**
 * Persist a single "guest brand seed" locally so we can create a user's first brand
 * after signup. Mirrors guest ICP local-storage behaviour.
 */
export type GuestBrandSeed = {
  brandName: string;
  businessDescription: string;
  productOrService: string;
  businessType: "B2B" | "B2C" | "Both" | string;
  assumedAudience: string[];
  marketingChannels: string[];
  country: string;
  regionOrCity: string;
  currency: string;
  color?: string;
  created_at: string;
};

const SEED_KEY = "icp_generator_guest_brand_seed_v1";

export function setGuestBrandSeed(seed: GuestBrandSeed | null) {
  try {
    if (!seed) {
      localStorage.removeItem(SEED_KEY);
      return;
    }
    localStorage.setItem(SEED_KEY, JSON.stringify(seed));
  } catch {
    // ignore
  }
}

export function getGuestBrandSeed(): GuestBrandSeed | null {
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.brandName) return null;
    return parsed as GuestBrandSeed;
  } catch {
    return null;
  }
}

export function clearGuestBrandSeed() {
  try {
    localStorage.removeItem(SEED_KEY);
  } catch {
    // ignore
  }
}
