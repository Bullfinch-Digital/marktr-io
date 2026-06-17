// Supabase Edge Function: create-checkout-session
// Deploy with: supabase functions deploy create-checkout-session
// Set secrets with:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
// Optional hardening (must match VITE_CHECKOUT_GUEST_SECRET if used):
//   supabase secrets set CHECKOUT_GUEST_SECRET=...
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected by Supabase by default.)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CreateCheckoutInput = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  force?: boolean;
};

const ACTIVE_STATUSES = ["trialing", "active", "past_due", "unpaid"];
const EMAIL_ACTIVE_STATUSES = ["trialing", "active"];

function escapeStripeSearchValue(v: string) {
  return v.replace(/["\\]/g, "\\$&").trim();
}

/** Must include every header the browser may send on POST (see PaywallContext fetch). */
const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-guest-secret";

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    },
  });
}

function errorJson(resBody: unknown, status: number) {
  console.error("[create-checkout-session] returning error", { status, body: resBody });
  return json(resBody, status);
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return errorJson({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const checkoutGuestSecret = Deno.env.get("CHECKOUT_GUEST_SECRET");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeKey) {
      return errorJson({ error: "Missing server env vars" }, 500);
    }

    const body = (await req.json()) as CreateCheckoutInput;
    const force = Boolean(body?.force);
    const customerEmail = body?.customerEmail?.trim() || null;
    console.log("[create-checkout-session] received email", customerEmail ?? "(none)");
    const missingFields: string[] = [];
    if (!body?.priceId) missingFields.push("priceId");
    if (!body?.successUrl) missingFields.push("successUrl");
    if (!body?.cancelUrl) missingFields.push("cancelUrl");
    if (missingFields.length) {
      return errorJson(
        { error: "Missing required fields", fields: missingFields },
        400
      );
    }

    const authHeader = req.headers.get("Authorization")?.trim() ?? "";
    const bearerJwt = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    console.log(`[create-checkout-session] auth_bearer_present=${Boolean(bearerJwt)}`);

    if (!bearerJwt) {
      return errorJson({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    let user: { id: string } | null = null;

    // Gateway JWT check: callers may send the public anon key as Bearer when there is no session.
    // If CHECKOUT_GUEST_SECRET is set, x-guest-secret must match (extra abuse guard). If unset,
    // guest checkout is allowed on anon bearer only (anon key is already public in the client).
    const bearerIsProjectAnonKey = bearerJwt === supabaseAnonKey.trim();

    if (bearerIsProjectAnonKey) {
      if (checkoutGuestSecret) {
        const guestSecret = req.headers.get("x-guest-secret")?.trim() ?? "";
        if (guestSecret !== checkoutGuestSecret) {
          return errorJson({ error: "Unauthorized" }, 401);
        }
        console.log("[create-checkout-session] auth_branch=guest_secret");
      } else {
        console.warn(
          "[create-checkout-session] guest checkout via anon bearer (CHECKOUT_GUEST_SECRET not set)"
        );
      }
    } else {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearerJwt}` } },
      });
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data?.user?.id) {
        console.warn("[create-checkout-session] auth_branch=anon (invalid token)", {
          error: userError,
        });
      } else {
        user = { id: data.user.id };
        console.log("[create-checkout-session] auth_branch=authenticated");
      }
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Email-level duplicate subscription nudge (best-effort)
    if (!force && customerEmail) {
      console.log("[create-checkout-session] email precheck: searching active subs", {
        email: customerEmail,
        statuses: EMAIL_ACTIVE_STATUSES,
      });
      try {
        const safeEmail = escapeStripeSearchValue(customerEmail);

        const customers = await stripe.customers.search({
          query: `email:"${safeEmail}"`,
          limit: 5,
        });

        let foundCustomerWithActiveSub: string | null = null;

        for (const c of customers.data || []) {
          if (!c?.id) continue;

          const activeSubs = await stripe.subscriptions.list({
            customer: c.id,
            status: "active",
            limit: 1,
          });
          const trialSubs = await stripe.subscriptions.list({
            customer: c.id,
            status: "trialing",
            limit: 1,
          });

          const hasActive =
            (activeSubs.data?.length ?? 0) > 0 || (trialSubs.data?.length ?? 0) > 0;

          if (hasActive) {
            foundCustomerWithActiveSub = c.id;
            break;
          }
        }

        if (foundCustomerWithActiveSub) {
          console.log("[create-checkout-session] active subscription found for email", {
            email: customerEmail,
            stripeCustomerId: foundCustomerWithActiveSub,
          });
          let portalUrl: string | null = null;
          try {
            const returnUrl = (() => {
              try {
                const url = new URL(body.successUrl);
                return `${url.origin}/account`;
              } catch {
                return body.cancelUrl;
              }
            })();

            const portalSession = await stripe.billingPortal.sessions.create({
              customer: foundCustomerWithActiveSub,
              return_url: returnUrl,
            });

            portalUrl = portalSession.url ?? null;
          } catch {
            portalUrl = null;
          }

          return json({
            alreadySubscribed: true,
            billingPortalUrl: portalUrl,
          });
        }
        console.log("[create-checkout-session] no active subscription found for email", {
          email: customerEmail,
        });
      } catch (e) {
        console.warn("[create-checkout-session] email precheck failed", e);
      }
    } else {
      console.log("[create-checkout-session] email precheck skipped", {
        force,
        hasEmail: Boolean(customerEmail),
      });
    }

    if (user?.id) {
      const { data: activeSub, error: activeSubError } = await supabaseAdmin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id,stripe_customer_id,status")
        .eq("user_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSubError) {
        return errorJson(
          { error: "Failed to check existing subscriptions" },
          500
        );
      }

      if (activeSub) {
        console.log("[create-checkout-session] branch: active subscription found for user", {
          userId: user.id,
          status: activeSub.status,
        });
        let stripeCustomerId: string | null = activeSub.stripe_customer_id ?? null;

        if (!stripeCustomerId) {
          const { data: customerRow } = await supabaseAdmin
            .from("stripe_customers")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .maybeSingle();
          stripeCustomerId = customerRow?.stripe_customer_id ?? null;
        }

        let portalUrl: string | null = null;
        if (stripeCustomerId) {
          const returnUrl = (() => {
            try {
              const url = new URL(body.successUrl);
              return `${url.origin}/account`;
            } catch {
              return body.cancelUrl;
            }
          })();

          try {
            const portalSession = await stripe.billingPortal.sessions.create({
              customer: stripeCustomerId,
              return_url: returnUrl,
            });
            portalUrl = portalSession.url ?? null;
          } catch {
            portalUrl = null;
          }
        }

        return json({
          ok: false,
          code: "ALREADY_SUBSCRIBED",
          message:
            "You already have an active subscription. You can amend it from your Account page.",
          portalUrl,
        });
      }
      console.log("[create-checkout-session] no active subscription found for user", {
        userId: user.id,
      });
    } else {
      console.log("[create-checkout-session] skipping user subscription lookup (anon)");
    }

    const successUrl = (() => {
      try {
        const url = new URL(body.successUrl);
        if (!url.searchParams.get("session_id")) {
          url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
        }
        return url.toString();
      } catch {
        const joiner = body.successUrl.includes("?") ? "&" : "?";
        return `${body.successUrl}${joiner}session_id={CHECKOUT_SESSION_ID}`;
      }
    })();

    let stripeCustomerId: string | null = null;

    if (user?.id) {
      const { data: existingCustomer, error: existingCustomerError } =
        await supabaseAdmin
          .from("stripe_customers")
          .select("stripe_customer_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (existingCustomerError) {
        return errorJson(
          { error: "Failed to load Stripe customer mapping" },
          500
        );
      }

      if (existingCustomer?.stripe_customer_id) {
        stripeCustomerId = existingCustomer.stripe_customer_id;
      }
    }

    const userMetadata = user?.id ? { user_id: user.id } : {};

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...(!stripeCustomerId && customerEmail
        ? { customer_email: customerEmail }
        : {}),
      line_items: [{ price: body.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: userMetadata,
      },
      ...(user?.id ? { client_reference_id: user.id } : {}),
      metadata: {
        price_id: body.priceId,
        ...userMetadata,
      },
      payment_method_collection: "always",
      success_url: successUrl,
      cancel_url: body.cancelUrl,
    });

    if (!session.url) {
      return errorJson(
        { error: "Checkout session failed", message: "Missing URL" },
        500
      );
    }

    console.log("[create-checkout-session] branch: created checkout session", {
      userId: user?.id ?? null,
      hasUrl: Boolean(session.url),
    });
    return json({ checkoutUrl: session.url, url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error", err);
    return errorJson(
      {
        error: "Checkout session failed",
        message: err?.message ?? "Unknown error",
        code: err?.code ?? null,
        statusCode: err?.statusCode ?? err?.status ?? null,
      },
      500
    );
  }
});
