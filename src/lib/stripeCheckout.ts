import { supabase } from "../config/supabase";
import { clearPendingCheckoutPlan } from "../utils/pendingCheckout";

/** Marktr Pro is annual-only. "yearly" is accepted as an alias. */
export type CheckoutPlan = "annual";

export type StripeCheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "already_subscribed"; portalUrl?: string | null }
  | { status: "email_already_subscribed"; email?: string | null; portalUrl?: string | null; plan: CheckoutPlan }
  | { status: "error"; message: string };

function normalisePlan(_plan?: CheckoutPlan | "yearly" | "monthly" | string): CheckoutPlan {
  return "annual";
}

export async function createStripeCheckoutSession(
  plan: CheckoutPlan | "yearly" | "monthly" = "annual",
  options?: { force?: boolean }
): Promise<StripeCheckoutResult> {
  const nextPlan = normalisePlan(plan);

  const { data: userData } = await supabase.auth.getUser();
  const authedUser = userData?.user ?? null;
  const accessToken = (await supabase.auth.getSession()).data.session?.access_token ?? "";

  if (!accessToken || !authedUser || (authedUser as { is_anonymous?: boolean }).is_anonymous) {
    return { status: "error", message: "Please sign in before starting checkout." };
  }

  const priceId = import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined;
  const origin = window.location.origin;

  if (!priceId) {
    return {
      status: "error",
      message: "Stripe price ID missing. Check VITE_STRIPE_PRICE_ANNUAL.",
    };
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const checkoutUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

  const payload = {
    priceId,
    successUrl: `${origin}/dashboard?checkout=success`,
    cancelUrl: `${origin}/dashboard?checkout=cancel`,
    force: Boolean(options?.force),
    customerEmail: authedUser.email ?? undefined,
  };

  const res = await fetch(checkoutUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data?.message as string) ||
      (data?.error as string) ||
      raw ||
      `Request failed with status ${res.status}`;
    return { status: "error", message: msg };
  }

  if (data?.code === "ALREADY_SUBSCRIBED") {
    clearPendingCheckoutPlan();
    return {
      status: "already_subscribed",
      portalUrl: (data?.portalUrl as string | null) ?? null,
    };
  }

  if (data?.code === "EMAIL_ALREADY_SUBSCRIBED") {
    return {
      status: "email_already_subscribed",
      email: (data?.email as string | null) ?? null,
      portalUrl: (data?.portalUrl as string | null) ?? null,
      plan: nextPlan,
    };
  }

  if (data?.alreadySubscribed === true) {
    clearPendingCheckoutPlan();
    return {
      status: "already_subscribed",
      portalUrl:
        (data?.billingPortalUrl as string | null) ??
        (data?.portalUrl as string | null) ??
        null,
    };
  }

  const redirectUrl = data?.checkoutUrl as string | undefined;
  if (!redirectUrl) {
    return { status: "error", message: "Checkout URL missing" };
  }

  clearPendingCheckoutPlan();
  return { status: "redirect", url: redirectUrl };
}

export async function redirectToStripeCheckout(
  plan: CheckoutPlan | "yearly" | "monthly" = "annual",
  options?: { force?: boolean }
): Promise<StripeCheckoutResult> {
  const result = await createStripeCheckoutSession(plan, options);
  if (result.status === "redirect") {
    window.location.assign(result.url);
  }
  return result;
}
