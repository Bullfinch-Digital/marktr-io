import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

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

const MODEL_PRICING_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
  "gpt-5.2": { input: 1.75, output: 14 },
  "gpt-5.1": { input: 1.25, output: 10 },
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  o3: { input: 2, output: 8 },
  "o4-mini": { input: 1.1, output: 4.4 },
};
const MONTHLY_SPEND_CAP_GBP = Number(Deno.env.get("OPENAI_MONTHLY_SPEND_CAP_GBP") ?? "7.5");
const GBP_TO_USD_RATE = Number(Deno.env.get("OPENAI_GBP_USD_RATE") ?? "1.28");
const MONTHLY_SPEND_CAP_USD = MONTHLY_SPEND_CAP_GBP * GBP_TO_USD_RATE;
const NEAR_CAP_THRESHOLD_PCT = 0.8;

function estimateCostUsd(modelRaw: unknown, inputTokensRaw: unknown, outputTokensRaw: unknown): number | null {
  const model = String(modelRaw || "").toLowerCase();
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) return null;

  const inputTokens = Number(inputTokensRaw || 0);
  const outputTokens = Number(outputTokensRaw || 0);
  const cost =
    (Math.max(0, inputTokens) * pricing.input) / 1_000_000 +
    (Math.max(0, outputTokens) * pricing.output) / 1_000_000;
  return Number(cost.toFixed(6));
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
    const serviceRole =
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) return json({ error: "Missing authorization" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceRole);
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user?.id) return json({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as {
      days?: number;
      limit?: number;
      userId?: string | null;
    };
    const days = Math.min(90, Math.max(1, Number(body?.days ?? 30)));
    const limit = Math.min(200, Math.max(10, Number(body?.limit ?? 50)));
    const filterUserId =
      typeof body?.userId === "string" && body.userId.trim().length ? body.userId.trim() : null;
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: aggRaw, error: aggError } = await supabaseAdmin.rpc(
      "admin_openai_usage_aggregate",
      { since_ts: sinceIso, filter_user_id: filterUserId }
    );

    if (aggError) {
      return json(
        {
          error: "Failed to aggregate usage",
          details: aggError.message,
          hint: "Apply migration 20260415220000_admin_openai_usage_aggregate.sql and grant execute to service_role.",
        },
        500
      );
    }

    const agg = (aggRaw ?? {}) as {
      totals?: Record<string, unknown>;
      by_feature?: unknown[];
    };

    const totals = agg.totals ?? {};
    const systemSummary = {
      days,
      filter_user_id: filterUserId,
      event_count: Number(totals.event_count ?? 0),
      error_count: Number(totals.error_count ?? 0),
      input_tokens: Number(totals.input_tokens ?? 0),
      output_tokens: Number(totals.output_tokens ?? 0),
      total_tokens: Number(totals.total_tokens ?? 0),
      estimated_cost_usd: Number(totals.estimated_cost_usd ?? 0),
      unknown_pricing_events: Number(totals.unknown_pricing_events ?? 0),
    };

    const systemByFeature = Array.isArray(agg.by_feature)
      ? (agg.by_feature as Record<string, unknown>[]).map((row) => ({
          feature: String(row.feature ?? "unknown"),
          events: Number(row.events ?? 0),
          input: Number(row.input ?? 0),
          output: Number(row.output ?? 0),
          total: Number(row.total ?? 0),
          estimated_cost_usd: Number(row.estimated_cost_usd ?? 0),
          unknown_pricing_events: Number(row.unknown_pricing_events ?? 0),
        }))
      : [];

    let eventsQuery = supabaseAdmin
      .from("openai_usage_events")
      .select(
        "id,feature,model,status,icp_id,related_id,input_tokens,output_tokens,total_tokens,reasoning_tokens,error_message,created_at,user_id"
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filterUserId) {
      eventsQuery = eventsQuery.eq("user_id", filterUserId);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      return json({ error: "Failed to load recent usage events", details: eventsError.message }, 500);
    }

    const eventsWithCost = (events || []).map((event: any) => ({
      ...event,
      estimated_cost_usd: estimateCostUsd(event?.model, event?.input_tokens, event?.output_tokens),
    }));

    let nearCapUsers = {
      users_with_usage_count: 0,
      users_near_cap_count: 0,
      users_near_cap_pct: 0,
      near_cap_threshold_pct: NEAR_CAP_THRESHOLD_PCT,
      monthly_cap_gbp: MONTHLY_SPEND_CAP_GBP,
      monthly_cap_usd: Number(MONTHLY_SPEND_CAP_USD.toFixed(4)),
    };

    if (!filterUserId) {
      const { data: allRows, error: allRowsError } = await supabaseAdmin
        .from("openai_usage_events")
        .select("user_id,model,input_tokens,output_tokens")
        .gte("created_at", sinceIso)
        .limit(50000);
      if (!allRowsError) {
        const spendByUser = new Map<string, number>();
        (allRows || []).forEach((row: any) => {
          const userId = String(row?.user_id || "");
          if (!userId) return;
          const cost = estimateCostUsd(row?.model, row?.input_tokens, row?.output_tokens);
          spendByUser.set(userId, (spendByUser.get(userId) || 0) + cost);
        });
        const usersWithUsage = spendByUser.size;
        const nearCap = Array.from(spendByUser.values()).filter(
          (usd) => usd >= MONTHLY_SPEND_CAP_USD * NEAR_CAP_THRESHOLD_PCT
        ).length;
        nearCapUsers = {
          users_with_usage_count: usersWithUsage,
          users_near_cap_count: nearCap,
          users_near_cap_pct: usersWithUsage ? Number(((nearCap / usersWithUsage) * 100).toFixed(2)) : 0,
          near_cap_threshold_pct: NEAR_CAP_THRESHOLD_PCT,
          monthly_cap_gbp: MONTHLY_SPEND_CAP_GBP,
          monthly_cap_usd: Number(MONTHLY_SPEND_CAP_USD.toFixed(4)),
        };
      }
    }

    return json({
      ok: true,
      summary: {
        ...systemSummary,
        ...nearCapUsers,
      },
      by_feature: systemByFeature,
      events: eventsWithCost,
    });
  } catch (err: any) {
    console.error("[admin-openai-usage] unexpected error", err);
    return json(
      { error: "Unexpected error", message: err?.message ?? "Unknown error" },
      500
    );
  }
});
