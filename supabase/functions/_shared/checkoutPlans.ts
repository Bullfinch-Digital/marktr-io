/** Same plan → price-env mapping as the client, without the VITE_ prefix. */

export type CheckoutPlan = "annual" | "monthly";

const PRICE_ENV: Record<CheckoutPlan, "STRIPE_PRICE_ANNUAL" | "STRIPE_PRICE_MONTHLY"> = {
  annual: "STRIPE_PRICE_ANNUAL",
  monthly: "STRIPE_PRICE_MONTHLY",
};

/** Empty defaults to annual when `defaultAnnual` is set. Unknown values return null. */
export function parseCheckoutPlan(raw: unknown, defaultAnnual = false): CheckoutPlan | null {
  if (raw == null || raw === "") return defaultAnnual ? "annual" : null;
  if (raw === "annual" || raw === "yearly") return "annual";
  if (raw === "monthly") return "monthly";
  return null;
}

export function resolveCheckoutPriceId(plan: CheckoutPlan, clientPriceId: unknown): string | null {
  const fromEnv = (Deno.env.get(PRICE_ENV[plan]) ?? "").trim();
  if (fromEnv) return fromEnv;
  if (typeof clientPriceId === "string" && clientPriceId.trim()) return clientPriceId.trim();
  return null;
}

export function planFromStripeSignals(input: {
  metadataPlan?: unknown;
  priceId?: string | null;
  interval?: string | null;
}): CheckoutPlan {
  const fromMeta = parseCheckoutPlan(input.metadataPlan);
  if (fromMeta) return fromMeta;

  const monthlyId = (Deno.env.get(PRICE_ENV.monthly) ?? "").trim();
  const annualId = (Deno.env.get(PRICE_ENV.annual) ?? "").trim();
  if (input.priceId && monthlyId && input.priceId === monthlyId) return "monthly";
  if (input.priceId && annualId && input.priceId === annualId) return "annual";
  if (input.interval === "month") return "monthly";
  if (input.interval === "year") return "annual";
  return "annual";
}
