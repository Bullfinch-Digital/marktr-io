// Supabase Edge Function: delete-account
// Cancels any live Stripe subscriptions, then deletes the Auth user
// (app data cascades via FKs / profiles → collections).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

function isRealStripeSubscriptionId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  // Comp / beta rows use fabricated ids like beta_<uuid>
  return id.startsWith("sub_");
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRole) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRole);

    // Cancel live Stripe subscriptions before removing the account so billing stops.
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
      });

      const { data: subs, error: subError } = await admin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id, status")
        .eq("user_id", user.id);

      if (subError) {
        console.error("[delete-account] failed to load subscriptions", subError);
        return json({ error: "Unable to verify subscription before delete" }, 500);
      }

      for (const row of subs ?? []) {
        const subId = row.stripe_subscription_id as string;
        if (!isRealStripeSubscriptionId(subId)) continue;

        const status = String(row.status ?? "");
        if (
          status === "canceled" ||
          status === "incomplete_expired" ||
          status === ""
        ) {
          continue;
        }

        try {
          await stripe.subscriptions.cancel(subId, {
            prorate: false,
          });
          console.log("[delete-account] canceled Stripe subscription", subId);
        } catch (err) {
          // Already canceled / missing: continue. Real API failures should block delete.
          const message = err instanceof Error ? err.message : String(err);
          if (/no such subscription/i.test(message) || /canceled/i.test(message)) {
            console.warn("[delete-account] subscription already gone", subId, message);
            continue;
          }
          console.error("[delete-account] Stripe cancel failed", subId, err);
          return json(
            {
              error: "Unable to cancel your subscription. Please contact support.",
              details: message,
            },
            502
          );
        }
      }
    } else {
      console.warn("[delete-account] STRIPE_SECRET_KEY missing — skipping Stripe cancel");
    }

    // guest_checkouts.linked_user_id is NO ACTION — clear before auth delete.
    const { error: guestClearError } = await admin
      .from("guest_checkouts")
      .update({ linked_user_id: null })
      .eq("linked_user_id", user.id);

    if (guestClearError) {
      console.warn("[delete-account] guest_checkouts clear failed", guestClearError);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[delete-account] auth delete failed", deleteError);
      return json({ error: "Failed to delete account", details: deleteError.message }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[delete-account] unexpected", err);
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
