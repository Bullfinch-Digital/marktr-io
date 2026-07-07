// Supabase Edge Function: generate-icp-strategy
// Deploy with: supabase functions deploy generate-icp-strategy
// Set secret with: supabase secrets set OPENAI_API_KEY=sk-...
//
// Generates a marketing strategy for a specific ICP and upserts into icp_strategies.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROMPT_VERSION = "icp_strategy_v2_brand_context";
const MODEL = "gpt-5.2";

type GenerateInput = {
  icpId: string;
  goal: string;
  channel?: string | null;
  offerType?: string | null;
  tone?: string | null;
  businessStage?: string | null;
  monthlyBudgetBand?: string | null;
  objectiveHorizon?: string | null;
  marketingCapacity?: string | null;
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

function buildPrompt(icp: Record<string, any>, brand: Record<string, any> | null, input: GenerateInput) {
  const list = (arr: unknown) =>
    Array.isArray(arr) && arr.length ? arr.join("; ") : "Not provided";

  return `
You are a senior marketing strategist. Use UK English. Be concise and practical.
Do not invent company-specific facts. If details are missing, use plausible but generic examples.
Return STRICT JSON ONLY that matches the given schema. No markdown.

ICP context:
- Name: ${icp.name || "Not provided"}
- Description: ${icp.description || "Not provided"}
- Industry: ${icp.industry || "Not provided"}
- Company size: ${icp.company_size || "Not provided"}
- Location: ${icp.location || "Not provided"}
- Goals: ${list(icp.goals)}
- Pain points: ${list(icp.pain_points)}
- Budget: ${icp.budget || "Not provided"}
- Decision makers: ${list(icp.decision_makers)}
- Tech stack: ${list(icp.tech_stack)}
- Challenges: ${list(icp.challenges)}
- Opportunities: ${list(icp.opportunities)}

Brand context (if available):
- Brand name: ${brand?.name || "Not provided"}
- Brand description: ${brand?.business_description || "Not provided"}
- Product/service: ${brand?.product_or_service || "Not provided"}
- Business type: ${brand?.business_type || "Not provided"}
- Assumed audience: ${list(brand?.assumed_audience)}
- Existing channels: ${list(brand?.marketing_channels)}
- Country: ${brand?.country || "Not provided"}
- Region/city: ${brand?.region_or_city || "Not provided"}
- Currency: ${brand?.currency || "Not provided"}

Strategy inputs:
- Goal (required): ${input.goal}
- Preferred channel: ${input.channel || "No preference"}
- Offer type: ${input.offerType || "No preference"}
- Tone: ${input.tone || "No preference"}
- Business stage / size: ${input.businessStage || "Not specified"}
- Monthly marketing budget band: ${input.monthlyBudgetBand || "Not specified"}
- Objective horizon: ${input.objectiveHorizon || "Not specified"}
- Weekly marketing capacity: ${input.marketingCapacity || "Not specified"}

Rules:
- Keep outputs short and actionable.
- Avoid jargon and hype.
- Provide 3–5 items per list where possible.
- Prioritise recommendations that can realistically be executed within the stated budget and capacity.
`;
}

const RESPONSE_SCHEMA = {
  name: "icp_strategy",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      positioning: {
        type: "object",
        additionalProperties: false,
        properties: {
          one_liner: { type: "string" },
          why_us: { type: "string" },
          differentiators: { type: "array", items: { type: "string" } },
        },
        required: ["one_liner", "why_us", "differentiators"],
      },
      messaging: {
        type: "object",
        additionalProperties: false,
        properties: {
          value_props: { type: "array", items: { type: "string" } },
          pain_to_promise: { type: "array", items: { type: "string" } },
          objections_and_rebuttals: { type: "array", items: { type: "string" } },
        },
        required: ["value_props", "pain_to_promise", "objections_and_rebuttals"],
      },
      campaign_ideas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            hook: { type: "string" },
            angle: { type: "string" },
            cta: { type: "string" },
          },
          required: ["name", "hook", "angle", "cta"],
        },
      },
      channel_plan: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary_channel: { type: "string" },
          secondary_channels: { type: "array", items: { type: "string" } },
          first_14_days: { type: "array", items: { type: "string" } },
        },
        required: ["primary_channel", "secondary_channels", "first_14_days"],
      },
      offer: {
        type: "object",
        additionalProperties: false,
        properties: {
          recommended_offer: { type: "string" },
          lead_magnet_idea: { anyOf: [{ type: "string" }, { type: "null" }] },
          landing_page_sections: { type: "array", items: { type: "string" } },
        },
        required: ["recommended_offer", "lead_magnet_idea", "landing_page_sections"],
      },
      ad_assets: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            properties: {
              headlines: { type: "array", items: { type: "string" } },
              primary_texts: { type: "array", items: { type: "string" } },
              creative_briefs: { type: "array", items: { type: "string" } },
            },
            required: ["headlines", "primary_texts", "creative_briefs"],
          },
          { type: "null" },
        ],
      },
      success_metrics: {
        type: "object",
        additionalProperties: false,
        properties: {
          kpis: { type: "array", items: { type: "string" } },
          targets: { type: "array", items: { type: "string" } },
        },
        required: ["kpis", "targets"],
      },
    },
    required: [
      "positioning",
      "messaging",
      "campaign_ideas",
      "channel_plan",
      "offer",
      "ad_assets",
      "success_metrics",
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
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
    if (!body?.icpId || !body?.goal) {
      return json({ error: "icpId and goal are required" }, 400);
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

    let brand: Record<string, any> | null = null;
    if (icp?.brand_id) {
      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", icp.brand_id)
        .eq("user_id", user.id)
        .maybeSingle();
      brand = brandData || null;
    }

    const prompt = buildPrompt(icp, brand, body as GenerateInput);

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
      console.error("OpenAI error", resp.status, errText);
      return json({ error: "OpenAI call failed", status: resp.status, details: errText }, 500);
    }

    const data = await resp.json();
    const outputText =
      data?.output_text ??
      data?.output?.[0]?.content?.[0]?.text ??
      data?.output?.[0]?.content?.[0]?.value ??
      "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const match = String(outputText).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed) {
      return json({ error: "Model response did not contain valid JSON.", raw: outputText }, 500);
    }

    const now = new Date().toISOString();
    const lineageId = (icp as { lineage_id?: string | null }).lineage_id;
    if (!lineageId) {
      return json({ error: "ICP missing lineage_id" }, 400);
    }

    const row = {
      icp_id: body.icpId,
      lineage_id: lineageId,
      user_id: user.id,
      goal: body.goal,
      channel: body.channel ?? null,
      offer_type: body.offerType ?? null,
      tone: body.tone ?? null,
      strategy: parsed,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
      created_at: now,
      updated_at: now,
    };

    const { data: saved, error: saveError } = await supabase
      .from("icp_strategies")
      .upsert(row, { onConflict: "lineage_id" })
      .select()
      .single();

    if (saveError) {
      return json({ error: "Failed to save strategy", details: saveError.message }, 500);
    }

    return json({
      strategy: parsed,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
      record: saved,
    });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
