/**
 * Single client-side definition of Pro entitlement.
 *
 * Must stay aligned with `public.is_pro_subscription_status` /
 * `public.user_has_pro_access` in
 * `supabase/migrations/20260714120000_pro_access_strategy_content.sql`.
 *
 * Pro = latest `stripe_subscriptions` row for the user has status
 * `trialing` or `active` (includes beta comps with fabricated `active` rows).
 */
export const PRO_SUBSCRIPTION_STATUSES = ["trialing", "active"] as const;

export type ProSubscriptionStatus = (typeof PRO_SUBSCRIPTION_STATUSES)[number];

export function isProSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return (
    typeof status === "string" &&
    (PRO_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
  );
}
