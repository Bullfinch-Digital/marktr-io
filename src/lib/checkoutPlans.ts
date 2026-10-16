/** Checkout plan → Stripe price env var. Annual and monthly use the same pattern. */

export type CheckoutPlan = "annual" | "monthly";

/** Current Marktr Pro prices. Env may override these unless it still holds a retired ID. */
export const STRIPE_PRICE_ANNUAL = "price_1URB2K1x4zWkmXI3cjSlMV3m";
export const STRIPE_PRICE_MONTHLY = "price_1URB2l1x4zWkmXI3BVd3LFsr";

/** Retired prices. Still map to a plan so existing subscriptions label correctly. */
const LEGACY_STRIPE_PRICE_IDS: Record<string, CheckoutPlan> = {
  price_1SpxhW1x4zWkmXI3kvHmx4b3: "annual",
  price_1UPiud1x4zWkmXI3zixnlb9f: "monthly",
};

const PRICE_ENV: Record<CheckoutPlan, "VITE_STRIPE_PRICE_ANNUAL" | "VITE_STRIPE_PRICE_MONTHLY"> = {
  annual: "VITE_STRIPE_PRICE_ANNUAL",
  monthly: "VITE_STRIPE_PRICE_MONTHLY",
};

/**
 * Empty defaults to annual when `defaultAnnual` is set.
 * "yearly" stays an alias for annual. Any other value is unknown.
 */
export function parseCheckoutPlan(raw: unknown, defaultAnnual = false): CheckoutPlan | null {
  if (raw == null || raw === "") return defaultAnnual ? "annual" : null;
  if (raw === "annual" || raw === "yearly") return "annual";
  if (raw === "monthly") return "monthly";
  return null;
}

export function priceEnvName(plan: CheckoutPlan): string {
  return PRICE_ENV[plan];
}

export function priceIdForPlan(plan: CheckoutPlan): string {
  const raw =
    plan === "monthly"
      ? import.meta.env.VITE_STRIPE_PRICE_MONTHLY
      : import.meta.env.VITE_STRIPE_PRICE_ANNUAL;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value && !LEGACY_STRIPE_PRICE_IDS[value]) return value;
  return plan === "monthly" ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_ANNUAL;
}

export function planFromPriceId(priceId: string | null | undefined): CheckoutPlan | null {
  if (!priceId) return null;
  const legacy = LEGACY_STRIPE_PRICE_IDS[priceId];
  if (legacy) return legacy;
  if (priceId === STRIPE_PRICE_MONTHLY || priceId === priceIdForPlan("monthly")) return "monthly";
  if (priceId === STRIPE_PRICE_ANNUAL || priceId === priceIdForPlan("annual")) return "annual";
  return null;
}
