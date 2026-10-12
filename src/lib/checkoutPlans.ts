/** Checkout plan → Stripe price env var. Annual and monthly use the same pattern. */

export type CheckoutPlan = "annual" | "monthly";

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

export function priceIdForPlan(plan: CheckoutPlan): string | undefined {
  const raw =
    plan === "monthly"
      ? import.meta.env.VITE_STRIPE_PRICE_MONTHLY
      : import.meta.env.VITE_STRIPE_PRICE_ANNUAL;
  const value = typeof raw === "string" ? raw.trim() : "";
  return value || undefined;
}

export function planFromPriceId(priceId: string | null | undefined): CheckoutPlan | null {
  if (!priceId) return null;
  const monthly = priceIdForPlan("monthly");
  const annual = priceIdForPlan("annual");
  if (monthly && priceId === monthly) return "monthly";
  if (annual && priceId === annual) return "annual";
  return null;
}
