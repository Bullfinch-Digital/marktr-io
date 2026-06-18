// Supabase Edge Function: stripe-webhook
// This function must be deployed with --no-verify-jwt so Stripe can call it.
// Deploy with: supabase functions deploy stripe-webhook
// Set secrets with:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// IMPORTANT:
// Ensure supabase-js is also Deno-targeted, otherwise esm.sh may emit std/node shims
// that crash in the Supabase Edge runtime (e.g. Deno.core.runMicrotasks).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function logReject(reason: string, extra: Record<string, unknown> = {}) {
  console.warn("[stripe-webhook] 401", { reason, ...extra });
}

function parseStripeSignatureHeader(sigHeader: string) {
  const parts = sigHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=").map((chunk) => chunk.trim());
    if (!key || !value) continue;
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  return { timestamp, signatures };
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacSha256Hex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const bytes = new Uint8Array(signature);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// ---- helpers (price + timestamp safe) ----
// Robust conversion for Stripe time fields:
// - Stripe often sends unix seconds (number) like 1769870587
// - Some libs/paths may produce unix ms (number) like 1769870587000
// - Sometimes values arrive as numeric strings or ISO strings
function toIsoOrNull(input: unknown): string | null {
  if (input === null || input === undefined) return null;

  // Date instance
  if (input instanceof Date) {
    const t = input.getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }

  // Number (seconds or ms)
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const ms = input < 1e12 ? input * 1000 : input; // seconds -> ms, otherwise assume ms
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }

  // String: could be numeric seconds/ms or ISO
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    // Numeric string?
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }

    // ISO-ish string
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }

  return null;
}

// Prefer item price ID, then fall back to subscription plan, then item plan.
function resolvePriceIdFromSubscription(subscription: any): string | null {
  const item0 = subscription?.items?.data?.[0] ?? null;
  const fromItemPrice = item0?.price?.id ?? null;
  if (typeof fromItemPrice === "string" && fromItemPrice.length) return fromItemPrice;

  const fromTopLevelPlan = subscription?.plan?.id ?? null;
  if (typeof fromTopLevelPlan === "string" && fromTopLevelPlan.length) return fromTopLevelPlan;

  const fromItemPlan = item0?.plan?.id ?? null;
  if (typeof fromItemPlan === "string" && fromItemPlan.length) return fromItemPlan;

  return null;
}

function computeCurrentPeriodEndIso(subscription: any): string | null {
  const status = subscription?.status ?? null;
  const item0 = subscription?.items?.data?.[0] ?? null;
  const rawTrialEnd = subscription?.trial_end ?? null;
  const rawSubCpe = subscription?.current_period_end ?? null;
  const rawItemCpe = item0?.current_period_end ?? null;
  const rawBillingAnchor = subscription?.billing_cycle_anchor ?? null;

  if (status === "trialing") {
    return (
      toIsoOrNull(rawTrialEnd) ??
      toIsoOrNull(rawItemCpe) ??
      toIsoOrNull(rawBillingAnchor) ??
      toIsoOrNull(rawTrialEnd)
    );
  }

  return (
    toIsoOrNull(rawSubCpe) ??
    toIsoOrNull(rawItemCpe) ??
    toIsoOrNull(rawBillingAnchor) ??
    toIsoOrNull(rawTrialEnd)
  );
}

async function upsertStripeSubscriptionRow(
  supabaseAdmin: ReturnType<typeof createClient>,
  opts: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscription: any;
  }
) {
  const { userId, stripeCustomerId, stripeSubscriptionId, subscription } = opts;
  const priceId = resolvePriceIdFromSubscription(subscription);
  const status = subscription?.status ?? null;
  const cancelAtPeriodEnd = subscription?.cancel_at_period_end;
  const item0 = subscription?.items?.data?.[0] ?? null;

  const rawSubCpe = subscription?.current_period_end ?? null;
  const rawItemCpe = item0?.current_period_end ?? null;
  const rawBillingAnchor = subscription?.billing_cycle_anchor ?? null;
  const rawTrialEnd = subscription?.trial_end ?? null;

  const currentPeriodEnd = computeCurrentPeriodEndIso(subscription);

  const trialStart = toIsoOrNull(subscription?.trial_start ?? null);
  const trialEnd = toIsoOrNull(rawTrialEnd);

  console.log("[stripe-webhook] compute current_period_end", {
    stripeSubscriptionId,
    status: subscription?.status ?? null,
    raw_trial_end: rawTrialEnd,
    raw_sub_cpe: rawSubCpe,
    raw_item_cpe: rawItemCpe,
    raw_anchor: rawBillingAnchor,
    computed_current_period_end: currentPeriodEnd,
  });

  const payload: Record<string, any> = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    updated_at: new Date().toISOString(),
  };

  if (typeof status === "string") payload.status = status;
  if (typeof cancelAtPeriodEnd === "boolean") {
    payload.cancel_at_period_end = cancelAtPeriodEnd;
  }
  if (priceId) payload.price_id = priceId;
  if (currentPeriodEnd) payload.current_period_end = currentPeriodEnd;
  if (trialStart) payload.trial_start = trialStart;
  if (trialEnd) payload.trial_end = trialEnd;

  const { error } = await supabaseAdmin
    .from("stripe_subscriptions")
    .upsert(payload, { onConflict: "stripe_subscription_id" });
  if (error) throw error;

  console.log("[stripe-webhook] upsert stripe_subscriptions OK", {
    stripeSubscriptionId,
    wrote_current_period_end: currentPeriodEnd,
  });
}

async function resolveUserIdFromCustomer(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string
) {
  const { data: existing } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (existing?.user_id) return existing.user_id;

  return null;
}

async function tryMigrateAnonymousSubscriptionToRealUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  opts: {
    anonymousUserId: string;
    customerEmail: string | null;
    stripeCustomerId: string | null;
  }
) {
  const { anonymousUserId, customerEmail, stripeCustomerId } = opts;
  const normalizedEmail = customerEmail?.trim() ?? "";
  if (!normalizedEmail) return;

  const { data: anonymousAuth, error: anonymousAuthError } =
    await supabaseAdmin.auth.admin.getUserById(anonymousUserId);
  if (anonymousAuthError) {
    console.warn("[stripe-webhook] migrate: anonymous auth lookup failed", {
      anonymousUserId,
      error: anonymousAuthError,
    });
    return;
  }

  const isAnonymous =
    anonymousAuth?.user?.is_anonymous === true ||
    !anonymousAuth?.user?.email?.trim();
  if (!isAnonymous) return;

  const { data: matchedProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("email", normalizedEmail)
    .neq("id", anonymousUserId)
    .maybeSingle();

  if (profileError) {
    console.warn("[stripe-webhook] migrate: profile lookup failed", profileError);
    return;
  }
  if (!matchedProfile?.id) return;

  const { data: matchedAuth, error: matchedAuthError } =
    await supabaseAdmin.auth.admin.getUserById(matchedProfile.id);
  if (matchedAuthError) {
    console.warn("[stripe-webhook] migrate: matched auth lookup failed", {
      matchedUserId: matchedProfile.id,
      error: matchedAuthError,
    });
    return;
  }

  const matchedIsRealUser =
    matchedAuth?.user?.is_anonymous !== true &&
    Boolean(matchedAuth?.user?.email?.trim());
  if (!matchedIsRealUser) return;

  const realUserId = matchedProfile.id;

  const { error: subError } = await supabaseAdmin
    .from("stripe_subscriptions")
    .update({ user_id: realUserId, updated_at: new Date().toISOString() })
    .eq("user_id", anonymousUserId);
  if (subError) {
    console.warn("[stripe-webhook] migrate: stripe_subscriptions update failed", subError);
    return;
  }

  if (stripeCustomerId) {
    const { error: customerError } = await supabaseAdmin
      .from("stripe_customers")
      .update({ user_id: realUserId, email: normalizedEmail })
      .eq("user_id", anonymousUserId);
    if (customerError) {
      console.warn("[stripe-webhook] migrate: stripe_customers update failed", customerError);
    }
  }

  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({ subscription_tier: "pro" })
    .eq("id", realUserId);
  if (profileUpdateError) {
    console.warn("[stripe-webhook] migrate: profile tier update failed", profileUpdateError);
  }

  console.log(
    "[stripe-webhook] Migrated subscription from anonymous",
    anonymousUserId,
    "to real user",
    realUserId,
    { email: normalizedEmail }
  );
}

async function fetchStripeSubscription(
  stripeSubscriptionId: string,
  stripeSecretKey: string
) {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    return await stripe.subscriptions.retrieve(stripeSubscriptionId);
  } catch (err) {
    console.error("[stripe-webhook] Failed to retrieve subscription", {
      stripeSubscriptionId,
      error: (err as any)?.message ?? String(err),
    });
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBodyText = await req.text();
  const bodyLength = rawBodyText.length;

  const webhookSecret = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    logReject("missing_env", {
      hasSigHeader: false,
      sigHeaderPrefix: null,
      contentType: req.headers.get("content-type"),
      method: req.method,
      url: req.url,
      bodyLength,
      missingWebhookSecret: !webhookSecret,
      missingSupabaseUrl: !supabaseUrl,
      missingServiceRoleKey: !supabaseServiceRoleKey,
    });
    return json({ error: "Missing server env vars" }, 500);
  }

  let event: any;
  const sig =
    req.headers.get("stripe-signature") ?? req.headers.get("Stripe-Signature");
  const contentType = req.headers.get("content-type") ?? "unknown";
  const secretPrefix = webhookSecret.slice(0, 5);
  const sigLength = sig?.length ?? 0;
  const secretLength = webhookSecret.length;
  const hasSigHeader = Boolean(sig);
  const sigHeaderPrefix = sig ? sig.slice(0, 10) : null;
  const rejectMeta = {
    hasSigHeader,
    sigHeaderPrefix,
    contentType,
    method: req.method,
    url: req.url,
    bodyLength,
  };

  console.log("[stripe-webhook] signature headers", {
    hasSigHeader,
    sigLength,
    secretPrefix,
    secretLength,
    contentType,
  });

  if (!sig) {
    logReject("missing_signature", rejectMeta);
    return json({ error: "Missing Stripe signature" }, 400);
  }

  try {
    const { timestamp, signatures } = parseStripeSignatureHeader(sig);
    if (!timestamp || signatures.length === 0) {
      logReject("invalid_signature_header", rejectMeta);
      return json({ error: "Invalid Stripe signature header" }, 400);
    }

    const expectedSignature = await computeHmacSha256Hex(
      webhookSecret,
      `${timestamp}.${rawBodyText}`
    );
    const matches = signatures.some((signature) =>
      timingSafeEqual(signature, expectedSignature)
    );
    if (!matches) {
      logReject("signature_mismatch", rejectMeta);
      return json({ error: "Invalid signature" }, 400);
    }

    event = JSON.parse(rawBodyText);
    console.log("[stripe-webhook] event verified", { type: event?.type ?? "unknown" });
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed", err);
    logReject("signature_verification_failed", {
      ...rejectMeta,
      error: (err as any)?.message ?? String(err),
    });
    return json({ error: "Invalid signature" }, 400);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const handleSubscription = async (
    subscription: any,
    userIdHint?: string | null,
    customerEmail?: string | null
  ) => {
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : (subscription.customer as any)?.id ?? null;

    const stripeSubscriptionId = subscription?.id ?? null;

    if (!stripeCustomerId || !stripeSubscriptionId) {
      console.warn("[stripe-webhook] Missing customer or subscription id", {
        stripeCustomerId,
        stripeSubscriptionId,
      });
      return;
    }

    const mappedUserId = await resolveUserIdFromCustomer(
      supabaseAdmin,
      stripeCustomerId
    );
    const metadataUserId =
      (subscription.metadata as any)?.user_id ??
      (subscription.metadata as any)?.supabase_user_id ??
      null;
    const userId = mappedUserId || userIdHint || metadataUserId;

    if (!userId) {
      console.warn("[stripe-webhook] No user mapping for customer", stripeCustomerId);
      return;
    }

    if (!mappedUserId) {
      await supabaseAdmin.from("stripe_customers").upsert(
        {
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          ...(customerEmail?.trim() ? { email: customerEmail.trim() } : {}),
        },
        { onConflict: "user_id" }
      );
    }

    await upsertStripeSubscriptionRow(supabaseAdmin, {
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      subscription,
    });

    const status = subscription?.status ?? null;
    const isPro = status === "trialing" || status === "active";

    const profileUpdates: Record<string, any> = {
      subscription_tier: isPro ? "pro" : "free",
    };

    const trialStart = toIsoOrNull(subscription?.trial_start);
    const trialEnd = toIsoOrNull(subscription?.trial_end);

    if (trialStart) {
      profileUpdates.trial_started_at = trialStart;
    }
    if (trialEnd) {
      profileUpdates.trial_ends_at = trialEnd;
    }
    if (
      status === "active" &&
      subscription?.trial_end &&
      Number(subscription.trial_end) * 1000 <= Date.now()
    ) {
      profileUpdates.trial_converted_at = new Date().toISOString();
    }

    await supabaseAdmin.from("profiles").update(profileUpdates).eq("id", userId);
  };

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await handleSubscription(subscription);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const sessionUserId =
          (session.client_reference_id as string | null) ??
          (session.metadata as any)?.user_id ??
          null;
        const guestRef = (session.metadata as any)?.guest_ref ?? null;
        const sessionId = session.id;
        const stripeCustomerId = session.customer ? String(session.customer) : null;
        const stripeSubscriptionId = session.subscription
          ? String(session.subscription)
          : null;
        const email =
          (session.customer_details as any)?.email ??
          (session as any)?.customer_email ??
          null;
        const priceId =
          (session?.line_items?.data?.[0]?.price?.id as string | null) ??
          (session?.line_items?.data?.[0]?.plan?.id as string | null) ??
          (session.metadata as any)?.price_id ??
          null;

        if (guestRef) {
          const nowIso = new Date().toISOString();
          await supabaseAdmin.from("guest_checkouts").upsert(
            {
              guest_ref: guestRef,
              session_id: sessionId,
              email,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              price_id: priceId,
              status: "trialing",
              updated_at: nowIso,
            },
            { onConflict: "session_id" }
          );
        }

        if (stripeCustomerId && sessionUserId) {
          await supabaseAdmin.from("stripe_customers").upsert(
            {
              user_id: sessionUserId,
              stripe_customer_id: stripeCustomerId,
              ...(email?.trim() ? { email: email.trim() } : {}),
            },
            { onConflict: "user_id" }
          );
        }

        if (session.mode === "subscription" && stripeSubscriptionId && stripeCustomerId) {
          const mappedUserId = await resolveUserIdFromCustomer(
            supabaseAdmin,
            stripeCustomerId
          );
          const metadataUserId =
            (session.metadata as any)?.user_id ??
            (session.metadata as any)?.supabase_user_id ??
            null;
          const userId = mappedUserId || sessionUserId || metadataUserId;

          if (!userId) {
            console.warn(
              "[stripe-webhook] No user mapping for checkout session",
              stripeCustomerId
            );
            break;
          }

          if (!mappedUserId) {
            await supabaseAdmin.from("stripe_customers").upsert(
              {
                user_id: userId,
                stripe_customer_id: stripeCustomerId,
                ...(email?.trim() ? { email: email.trim() } : {}),
              },
              { onConflict: "user_id" }
            );
          }

          const stripeSecretKey = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
          let subscription = stripeSecretKey
            ? await fetchStripeSubscription(stripeSubscriptionId, stripeSecretKey)
            : null;

          if (!subscription) {
            // Session status is "complete" — never use it as subscription status.
            subscription = {
              id: stripeSubscriptionId,
              customer: stripeCustomerId,
              items: priceId
                ? {
                    data: [
                      {
                        price: { id: priceId },
                        plan: { id: priceId },
                      },
                    ],
                  }
                : { data: [] },
              status: "trialing",
              trial_start: null,
              trial_end: null,
            };
          }

          await handleSubscription(subscription, userId, email);

          await tryMigrateAnonymousSubscriptionToRealUser(supabaseAdmin, {
            anonymousUserId: userId,
            customerEmail: email,
            stripeCustomerId,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error", err);
    return json({ error: "Webhook handler error" }, 500);
  }

  return json({ received: true });
});
