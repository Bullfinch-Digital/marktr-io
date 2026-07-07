import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROMPT_VERSION = "meta_activation_pack_v1";
const MODEL = "gpt-5.2";
const MAX_PACKS_PER_ICP = 10;
const MONTHLY_SPEND_CAP_GBP = Number(Deno.env.get("OPENAI_MONTHLY_SPEND_CAP_GBP") ?? "7.5");
const GBP_TO_USD_RATE = Number(Deno.env.get("OPENAI_GBP_USD_RATE") ?? "1.28");
const MONTHLY_SPEND_CAP_USD = MONTHLY_SPEND_CAP_GBP * GBP_TO_USD_RATE;

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

function estimateCostUsd(modelRaw: unknown, inputTokensRaw: unknown, outputTokensRaw: unknown): number {
  const model = String(modelRaw || "").toLowerCase();
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) return 0;
  const inputTokens = Number(inputTokensRaw || 0);
  const outputTokens = Number(outputTokensRaw || 0);
  return (
    (Math.max(0, inputTokens) * pricing.input) / 1_000_000 +
    (Math.max(0, outputTokens) * pricing.output) / 1_000_000
  );
}

async function getMonthlyUsageSpendUsd(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ spendUsd: number; error?: string }> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("openai_usage_events")
    .select("model,input_tokens,output_tokens,created_at")
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString())
    .limit(10000);

  if (error) {
    return { spendUsd: 0, error: error.message };
  }

  const spendUsd = ((data as any[]) || []).reduce(
    (sum, row) => sum + estimateCostUsd(row?.model, row?.input_tokens, row?.output_tokens),
    0
  );

  return { spendUsd };
}

function extractUsage(data: any) {
  return {
    responseId: data?.id ?? null,
    inputTokens: data?.usage?.input_tokens ?? null,
    outputTokens: data?.usage?.output_tokens ?? null,
    totalTokens: data?.usage?.total_tokens ?? null,
    reasoningTokens: data?.usage?.output_tokens_details?.reasoning_tokens ?? null,
  };
}

async function logOpenAiUsage(
  supabase: ReturnType<typeof createClient>,
  payload: {
    userId: string;
    icpId: string;
    relatedId?: string | null;
    status: "success" | "error";
    responseId?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    reasoningTokens?: number | null;
    errorMessage?: string | null;
  }
) {
  const { error } = await supabase.from("openai_usage_events").insert({
    user_id: payload.userId,
    feature: "generate_meta_activation_pack",
    model: MODEL,
    status: payload.status,
    icp_id: payload.icpId,
    related_id: payload.relatedId ?? null,
    response_id: payload.responseId ?? null,
    input_tokens: payload.inputTokens ?? null,
    output_tokens: payload.outputTokens ?? null,
    total_tokens: payload.totalTokens ?? null,
    reasoning_tokens: payload.reasoningTokens ?? null,
    error_message: payload.errorMessage ?? null,
  });
  if (error) {
    console.warn("logOpenAiUsage failed", error.message);
  }
}

type GenerateInput = {
  icpId: string;
  strategyId?: string | null;
  goal?: string | null;
  packName?: string | null;
};

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

function list(value: unknown): string {
  return Array.isArray(value) && value.length ? value.join("; ") : "Not provided";
}

function buildPrompt(icp: Record<string, unknown>, brand: Record<string, unknown> | null, strategy: any, input: GenerateInput) {
  return `
You are a senior performance marketer specialising in Meta Ads (Facebook/Instagram). Use UK English.
Return STRICT JSON ONLY. No markdown. Keep everything practical and implementable.

You are creating a "Meta Activation Pack" that helps a business:
1) build Custom Audiences in Meta Ads Manager,
2) prepare better Lookalike seed data from first-party data,
3) map messaging and creatives to funnel stages,
4) follow a 30-day activation roadmap.

CRITICAL POLICY RULES:
- Do NOT claim direct API creation of Meta audiences.
- Do NOT infer or target sensitive traits (health, financial status, housing, employment, ethnicity, religion, sexuality, etc.).
- Include clear compliance notes about consent and lawful data use.
- Keep recommendations consistent with Meta audience workflows.

ICP context:
- Name: ${icp.name || "Not provided"}
- Description: ${icp.description || "Not provided"}
- Industry: ${icp.industry || "Not provided"}
- Company size: ${icp.company_size || "Not provided"}
- Location: ${icp.location || "Not provided"}
- Budget: ${icp.budget || "Not provided"}
- Goals: ${list(icp.goals)}
- Pain points: ${list(icp.pain_points)}
- Decision makers: ${list(icp.decision_makers)}
- Tech stack: ${list(icp.tech_stack)}
- Challenges: ${list(icp.challenges)}
- Opportunities: ${list(icp.opportunities)}

Brand context:
- Name: ${brand?.name || "Not provided"}
- Description: ${brand?.business_description || "Not provided"}
- Product/service: ${brand?.product_or_service || "Not provided"}
- Existing channels: ${list(brand?.marketing_channels)}
- Audience assumptions: ${list(brand?.assumed_audience)}
- Country: ${brand?.country || "Not provided"}

Optional strategy context:
- Positioning one-liner: ${strategy?.positioning?.one_liner || "Not provided"}
- Value props: ${list(strategy?.messaging?.value_props)}
- Campaign ideas: ${list(strategy?.campaign_ideas?.map((x: any) => x?.name).filter(Boolean))}

Activation objective:
- Goal: ${input.goal || "Generate a practical Meta activation plan"}

Output requirements:
- audience_plan: 6-10 practical audience recipes across mixed source types where possible.
- seed_quality: specific qualification rules for high-quality lookalike seeds.
- lookalike_plan: explicit tiering (1%, 2%, 3-5%).
- messaging_matrix: at least 5 rows tied to funnel stages.
- roadmap_30d: 4 weekly phases with action checklists.
- compliance_notes: concise mandatory warnings.
`;
}

const RESPONSE_SCHEMA = {
  name: "meta_activation_pack",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      audience_plan: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            audience_name: { type: "string" },
            source_type: { type: "string" },
            build_rule: { type: "string" },
            retention_window: { type: "string" },
            use_case: { type: "string" },
            exclusions: { type: "array", items: { type: "string" } },
          },
          required: [
            "audience_name",
            "source_type",
            "build_rule",
            "retention_window",
            "use_case",
            "exclusions",
          ],
        },
      },
      seed_quality: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary_seed_definition: { type: "string" },
          fallback_seed_definition: { type: "string" },
          minimum_size: { type: "string" },
          recommended_size: { type: "string" },
          data_quality_checklist: { type: "array", items: { type: "string" } },
          do_not_use_cohorts: { type: "array", items: { type: "string" } },
        },
        required: [
          "primary_seed_definition",
          "fallback_seed_definition",
          "minimum_size",
          "recommended_size",
          "data_quality_checklist",
          "do_not_use_cohorts",
        ],
      },
      lookalike_plan: {
        type: "object",
        additionalProperties: false,
        properties: {
          source_audiences: { type: "array", items: { type: "string" } },
          tier_recommendations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                tier_name: { type: "string" },
                percentage: { type: "string" },
                use_case: { type: "string" },
              },
              required: ["tier_name", "percentage", "use_case"],
            },
          },
          stacking_strategy: { type: "string" },
          mandatory_exclusions: { type: "array", items: { type: "string" } },
          location_note: { type: "string" },
        },
        required: [
          "source_audiences",
          "tier_recommendations",
          "stacking_strategy",
          "mandatory_exclusions",
          "location_note",
        ],
      },
      messaging_matrix: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            audience: { type: "string" },
            funnel_stage: { type: "string" },
            awareness_level: { type: "string" },
            pain_angle: { type: "string" },
            promise_angle: { type: "string" },
            primary_cta: { type: "string" },
            proof_type: { type: "string" },
            creative_format: { type: "string" },
          },
          required: [
            "audience",
            "funnel_stage",
            "awareness_level",
            "pain_angle",
            "promise_angle",
            "primary_cta",
            "proof_type",
            "creative_format",
          ],
        },
      },
      roadmap_30d: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            week: { type: "string" },
            focus: { type: "string" },
            tasks: { type: "array", items: { type: "string" } },
            checkpoint: { type: "string" },
            decision_rule: { type: "string" },
          },
          required: ["week", "focus", "tasks", "checkpoint", "decision_rule"],
        },
      },
      compliance_notes: { type: "array", items: { type: "string" } },
    },
    required: [
      "audience_plan",
      "seed_quality",
      "lookalike_plan",
      "messaging_matrix",
      "roadmap_30d",
      "compliance_notes",
    ],
  },
  strict: true,
};

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
      return json({ error: "Missing server env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthenticated" }, 401);
    }

    const body = (await req.json()) as Partial<GenerateInput>;
    if (!body?.icpId) {
      return json({ error: "icpId is required" }, 400);
    }

    const { data: icp, error: icpError } = await supabase
      .from("icps")
      .select("*")
      .eq("id", body.icpId)
      .eq("user_id", user.id)
      .single();
    if (icpError || !icp) {
      return json({ error: "ICP not found" }, 404);
    }

    const { count: existingCount, error: countError } = await supabase
      .from("icp_meta_activation_packs")
      .select("id", { count: "exact", head: true })
      .eq("icp_id", body.icpId)
      .eq("user_id", user.id);
    if (countError) {
      return json({ error: "Failed to count existing packs", details: countError.message }, 500);
    }
    if ((existingCount ?? 0) >= MAX_PACKS_PER_ICP) {
      return json({ error: `You can save up to ${MAX_PACKS_PER_ICP} Meta activation packs per ICP.` }, 400);
    }

    let brand: Record<string, unknown> | null = null;
    if ((icp as any)?.brand_id) {
      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", (icp as any).brand_id)
        .eq("user_id", user.id)
        .maybeSingle();
      brand = (brandData as Record<string, unknown> | null) ?? null;
    }

    let strategy: any = null;
    if (body.strategyId) {
      const { data: strategyData } = await supabase
        .from("icp_strategies")
        .select("id, strategy")
        .eq("id", body.strategyId)
        .eq("icp_id", body.icpId)
        .eq("user_id", user.id)
        .maybeSingle();
      strategy = strategyData?.strategy ?? null;
    }

    const monthlyUsage = await getMonthlyUsageSpendUsd(supabase, user.id);
    if (monthlyUsage.error) {
      return json({ error: "Failed to check monthly usage cap", details: monthlyUsage.error }, 500);
    }
    if (monthlyUsage.spendUsd >= MONTHLY_SPEND_CAP_USD) {
      await logOpenAiUsage(supabase, {
        userId: user.id,
        icpId: body.icpId,
        status: "error",
        errorMessage:
          `Monthly AI usage cap reached (GBP ${MONTHLY_SPEND_CAP_GBP.toFixed(2)} / USD ${MONTHLY_SPEND_CAP_USD.toFixed(2)}).`,
      });
      return json(
        {
          error:
            `Monthly AI usage cap reached for this account (£${MONTHLY_SPEND_CAP_GBP.toFixed(2)}). Please contact support to increase your limit.`,
        },
        402
      );
    }

    const prompt = buildPrompt(icp as Record<string, unknown>, brand, strategy, body as GenerateInput);
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: PROMPT_VERSION,
            schema: RESPONSE_SCHEMA.schema,
            strict: true,
          },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      await logOpenAiUsage(supabase, {
        userId: user.id,
        icpId: body.icpId,
        status: "error",
        errorMessage: `OpenAI ${resp.status}: ${errText.slice(0, 1000)}`,
      });
      return json({ error: "OpenAI call failed", status: resp.status, details: errText }, 500);
    }

    const aiData = await resp.json();
    const usage = extractUsage(aiData);
    const outputText =
      aiData?.output_text ??
      aiData?.output?.[0]?.content?.[0]?.text ??
      aiData?.output?.[0]?.content?.[0]?.value ??
      "";

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const match = String(outputText).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (!parsed) {
      return json({ error: "Model response did not contain valid JSON", raw: outputText }, 500);
    }

    const now = new Date().toISOString();
    const row = {
      icp_id: body.icpId,
      user_id: user.id,
      strategy_id: body.strategyId ?? null,
      pack_name: body.packName?.trim() || `Meta Activation Pack ${(existingCount ?? 0) + 1}`,
      goal: body.goal ?? null,
      pack_json: parsed,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
      created_at: now,
      updated_at: now,
    };

    const { data: saved, error: saveError } = await supabase
      .from("icp_meta_activation_packs")
      .insert(row)
      .select("*")
      .single();
    if (saveError) {
      await logOpenAiUsage(supabase, {
        userId: user.id,
        icpId: body.icpId,
        status: "error",
        responseId: usage.responseId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        reasoningTokens: usage.reasoningTokens,
        errorMessage: `Failed to save Meta activation pack: ${saveError.message}`,
      });
      return json({ error: "Failed to save Meta activation pack", details: saveError.message }, 500);
    }

    await logOpenAiUsage(supabase, {
      userId: user.id,
      icpId: body.icpId,
      relatedId: saved?.id ?? null,
      status: "success",
      responseId: usage.responseId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      reasoningTokens: usage.reasoningTokens,
    });

    return json({ record: saved, pack: parsed, prompt_version: PROMPT_VERSION, model: MODEL });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
