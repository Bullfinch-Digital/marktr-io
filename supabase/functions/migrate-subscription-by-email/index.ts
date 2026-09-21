// Supabase Edge Function: migrate-subscription-by-email
// Links orphaned anonymous checkout subscriptions to the signed-in real user by email.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

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

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
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
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id || !user.email || user.is_anonymous) {
      return json({ ok: true, migrated: false, reason: "not_real_user" });
    }

    const { data: existing } = await supabaseAdmin
      .from("stripe_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return json({ ok: true, migrated: false, reason: "already_linked" });
    }

    const normalizedEmail = user.email.trim();

    const { data: customer } = await supabaseAdmin
      .from("stripe_customers")
      .select("user_id, stripe_customer_id")
      .eq("email", normalizedEmail)
      .neq("user_id", user.id)
      .maybeSingle();

    if (!customer?.user_id) {
      return json({ ok: true, migrated: false, reason: "no_orphan_customer" });
    }

    const fromUserId = customer.user_id;

    const { error: subError } = await supabaseAdmin
      .from("stripe_subscriptions")
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq("user_id", fromUserId);

    if (subError) {
      console.warn("[migrate-subscription-by-email] subscription update failed", subError);
      return json({ error: "Failed to migrate subscription" }, 500);
    }

    const { error: customerError } = await supabaseAdmin
      .from("stripe_customers")
      .update({ user_id: user.id, email: normalizedEmail })
      .eq("user_id", fromUserId);

    if (customerError) {
      console.warn("[migrate-subscription-by-email] customer update failed", customerError);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ subscription_tier: "pro" })
      .eq("id", user.id);

    console.log(
      "[migrate-subscription-by-email] migrated subscription from",
      fromUserId,
      "to",
      user.id
    );

    return json({
      ok: true,
      migrated: true,
      fromUserId,
      toUserId: user.id,
    });
  } catch (err) {
    console.error("[migrate-subscription-by-email] error", err);
    return json({ error: "Migration failed" }, 500);
  }
});
