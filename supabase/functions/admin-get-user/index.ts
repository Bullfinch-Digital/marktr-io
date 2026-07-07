// Supabase Edge Function: admin-get-user
// Deploy with: supabase functions deploy admin-get-user

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

type Input = {
  email?: string;
  user_id?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function resolveProfileByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string
) {
  const fields =
    "id,email,name,subscription_tier,trial_started_at,trial_ends_at,trial_converted_at,role";
  const pattern = `%${email}%`;

  const orderedQuery = supabaseAdmin
    .from("profiles")
    .select(fields)
    .ilike("email", pattern);

  let { data, error } = await orderedQuery
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = String((error as any)?.message ?? "");
    if (message.includes("updated_at")) {
      const fallback = await supabaseAdmin
        .from("profiles")
        .select(fields)
        .ilike("email", pattern)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
  }

  if (error) {
    const message = String((error as any)?.message ?? "");
    if (message.includes("created_at")) {
      const fallback = await supabaseAdmin
        .from("profiles")
        .select(fields)
        .ilike("email", pattern)
        .limit(1)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
  }

  return { data, error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!token) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    const body = (await req.json()) as Input;
    const userId = body?.user_id?.trim() || null;
    const email = body?.email?.trim() || null;

    if (!userId && !email) {
      return json({ error: "Missing email or user_id" }, 400);
    }

    let profile = null;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,name,subscription_tier,trial_started_at,trial_ends_at,trial_converted_at,role"
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        return json({ error: "Profile lookup failed" }, 500);
      }
      profile = data;
    } else if (email) {
      const { data, error } = await resolveProfileByEmail(supabaseAdmin, email);
      if (error) {
        return json({ error: "Profile lookup failed" }, 500);
      }
      profile = data;

      // profiles.email can be null on older accounts; fall back to Auth email match.
      if (!profile) {
        const { data: authData, error: authErr } =
          await supabaseAdmin.auth.admin.getUserByEmail(email);
        if (authErr) {
          console.warn("[admin-get-user] auth lookup", authErr.message);
        }
        const authUserId = authData?.user?.id ?? null;
        if (authUserId) {
          const { data: byId, error: byIdErr } = await supabaseAdmin
            .from("profiles")
            .select(
              "id,email,name,subscription_tier,trial_started_at,trial_ends_at,trial_converted_at,role"
            )
            .eq("id", authUserId)
            .maybeSingle();
          if (byIdErr) {
            return json({ error: "Profile lookup failed" }, 500);
          }
          profile = byId;
          if (profile && !(profile as any).email && authData?.user?.email) {
            (profile as any).email = authData.user.email;
          }
        }
      }
    }

    if (!profile) {
      return json({ ok: true, user: null, subscription: null });
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("stripe_subscriptions")
      .select(
        "user_id,stripe_subscription_id,stripe_customer_id,price_id,status,cancel_at_period_end,current_period_end,trial_start,trial_end,created_at,updated_at"
      )
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      return json({ error: "Subscription lookup failed" }, 500);
    }

    return json({ ok: true, user: profile, subscription: subscription ?? null });
  } catch (err: any) {
    console.error("[admin-get-user] unexpected error", err);
    return json(
      { error: "Unexpected error", message: err?.message ?? "Unknown error" },
      500
    );
  }
});
