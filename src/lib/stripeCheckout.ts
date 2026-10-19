import { supabase } from "../config/supabase";
import { clearPendingCheckoutPlan, thisTabOwnsFreshClaim } from "../utils/pendingCheckout";
import { getFirstTouchParams, getGaClientId } from "./analytics";
import { type CheckoutPlan, parseCheckoutPlan, priceEnvName, priceIdForPlan } from "./checkoutPlans";

export type { CheckoutPlan };

export type StripeCheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "already_subscribed"; portalUrl?: string | null }
  | { status: "email_already_subscribed"; email?: string | null; portalUrl?: string | null; plan: CheckoutPlan }
  | { status: "error"; message: string }
  | { status: "claimed_elsewhere" };

const LAST_CHECKOUT_PLAN_KEY = "marktr_checkout_plan";

export async function createStripeCheckoutSession(
  plan: CheckoutPlan | "yearly" | "monthly" | string = "annual",
  options?: { force?: boolean }
): Promise<StripeCheckoutResult> {
  const nextPlan = parseCheckoutPlan(plan, plan == null || plan === "");
  if (!nextPlan) {
    return { status: "error", message: "Unknown plan" };
  }

  const { data: userData } = await supabase.auth.getUser();
  const authedUser = userData?.user ?? null;
  const accessToken = (await supabase.auth.getSession()).data.session?.access_token ?? "";

  if (!accessToken || !authedUser || (authedUser as { is_anonymous?: boolean }).is_anonymous) {
    return { status: "error", message: "Please sign in before starting checkout." };
  }

  const priceId = priceIdForPlan(nextPlan);
  const origin = window.location.origin;

  if (!priceId) {
    return {
      status: "error",
      message: `Stripe price ID missing. Check ${priceEnvName(nextPlan)}.`,
    };
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const checkoutUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

  const gaClientId = await getGaClientId();
  const firstTouch = getFirstTouchParams();
  try {
    sessionStorage.setItem(LAST_CHECKOUT_PLAN_KEY, nextPlan);
  } catch {
    // ignore
  }

  const payload = {
    plan: nextPlan,
    priceId,
    successUrl: `${origin}/dashboard?checkout=success&plan=${nextPlan}`,
    cancelUrl: `${origin}/dashboard?checkout=cancel`,
    force: Boolean(options?.force),
    customerEmail: authedUser.email ?? undefined,
    gaClientId: gaClientId ?? undefined,
    firstTouchSource: firstTouch.first_touch_source,
    firstTouchMedium: firstTouch.first_touch_medium,
    firstTouchCampaign: firstTouch.first_touch_campaign,
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

  // Leave the stored intent in place until this tab actually navigates.
  // The other tab can still take over the claim before that.
  return { status: "redirect", url: redirectUrl };
}

export async function redirectToStripeCheckout(
  plan: CheckoutPlan | "yearly" | "monthly" | string = "annual",
  options?: { force?: boolean; honorClaim?: boolean }
): Promise<StripeCheckoutResult> {
  const result = await createStripeCheckoutSession(plan, options);
  if (result.status === "redirect") {
    if (options?.honorClaim && !thisTabOwnsFreshClaim()) {
      return { status: "claimed_elsewhere" };
    }
    clearPendingCheckoutPlan();
    window.location.assign(result.url);
  }
  return result;
}
