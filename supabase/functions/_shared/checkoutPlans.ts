/** Same plan → price-env mapping as the client, without the VITE_ prefix. */

export type CheckoutPlan = "annual" | "monthly";

/** Current Marktr Pro prices. Env may override these unless it still holds a retired ID. */
const CURRENT_PRICE_IDS: Record<CheckoutPlan, string> = {
  annual: "price_1URB2K1x4zWkmXI3cjSlMV3m",
  monthly: "price_1URB2l1x4zWkmXI3BVd3LFsr",
};

/** Retired prices. Still map to a plan so existing subscriptions label correctly. */
const LEGACY_STRIPE_PRICE_IDS: Record<string, CheckoutPlan> = {
  price_1SpxhW1x4zWkmXI3kvHmx4b3: "annual",
  price_1UPiud1x4zWkmXI3zixnlb9f: "monthly",
};

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
  if (fromEnv && !LEGACY_STRIPE_PRICE_IDS[fromEnv]) return fromEnv;
  const fromClient = typeof clientPriceId === "string" ? clientPriceId.trim() : "";
  if (fromClient === CURRENT_PRICE_IDS[plan]) return fromClient;
  return CURRENT_PRICE_IDS[plan];
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
  const legacy = input.priceId ? LEGACY_STRIPE_PRICE_IDS[input.priceId] : undefined;
  if (legacy) return legacy;
  if (
    input.priceId &&
    (input.priceId === CURRENT_PRICE_IDS.monthly || (monthlyId && input.priceId === monthlyId))
  ) {
    return "monthly";
  }
  if (
    input.priceId &&
    (input.priceId === CURRENT_PRICE_IDS.annual || (annualId && input.priceId === annualId))
  ) {
    return "annual";
  }
  if (input.interval === "month") return "monthly";
  if (input.interval === "year") return "annual";
  return "annual";
}
