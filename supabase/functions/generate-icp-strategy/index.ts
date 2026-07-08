// Supabase Edge Function: generate-icp-strategy
// Deploy with: supabase functions deploy generate-icp-strategy
// Set secret with: supabase secrets set OPENAI_API_KEY=sk-...
//
// Generates a marketing strategy for a specific ICP and upserts into icp_strategies.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROMPT_VERSION = "icp_strategy_v2_brand_context";
const MULTI_PROMPT_VERSION = "strategy_v1_brand_aims_and_icp_targets";
const MODEL = "gpt-5.5";

type GenerateInput = {
  // Legacy single-ICP generation
  icpId?: string;
  goal?: string;

  channel?: string | null;
  offerType?: string | null;
  tone?: string | null;
  businessStage?: string | null;
  monthlyBudgetBand?: string | null;
  objectiveHorizon?: string | null;
  marketingCapacity?: string | null;

  // Multi-aim / multi-ICP generation
  aimLineageIds?: string[];
  icpLineageIds?: string[];
  brandId?: string | null;
  strategyId?: string; // current strategy row id for a version bump (optional)
  title?: string; // optional strategy title override
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
- Goal (required): ${input.goal || "Not provided"}
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

function buildMultiPrompt(
  brand: Record<string, any> | null,
  aims: Array<Record<string, any>>,
  icps: Array<Record<string, any>>,
  input: GenerateInput
) {
  const list = (arr: unknown) =>
    Array.isArray(arr) && arr.length ? arr.join("; ") : "Not provided";

  const aimsBlock =
    aims?.length
      ? aims
          .map(
            (aim, idx) => `
Aim ${idx + 1}:
- Title: ${aim.title || "Not provided"}
- Type: ${aim.aim_type || "Not provided"}
- Description: ${aim.description || "Not provided"}`
          )
          .join("\n\n")
      : "- Not provided";

  const icpsBlock = icps?.length
    ? icps
        .map(
          (icp, idx) => `
ICP ${idx + 1} context:
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
`
        )
        .join("\n\n")
    : "- Not provided";

  return `
You are a senior marketing strategist. Use UK English. Be concise and practical.
Do not invent company-specific facts. If details are missing, use plausible but generic examples.

You will receive:
- Brand context
- A set of Brand Aims (growth levers)
- A set of ICP personas (customer contexts)

Your job: synthesize a single cohesive marketing strategy that serves ALL selected Brand Aims and can be executed across ALL selected ICPs.
Return STRICT JSON ONLY that matches the given schema. No markdown.

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

Brand aims:
${aimsBlock}

ICP personas:
${icpsBlock}

Strategy inputs:
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
- Where a recommendation depends on one or more aims or ICPs, embed the rationale into the text fields (e.g., positioning one-liner, differentiators, and campaign hooks/angles).
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

    const aimLineageIds = body.aimLineageIds;
    const icpLineageIds = body.icpLineageIds;
    const isMulti =
      Array.isArray(aimLineageIds) &&
      aimLineageIds.length > 0 &&
      Array.isArray(icpLineageIds) &&
      icpLineageIds.length > 0;

    if (isMulti) {
      const aimIds = Array.from(new Set(aimLineageIds as string[]));
      const icpIds = Array.from(new Set(icpLineageIds as string[]));

      if (aimIds.length < 1 || aimIds.length > 3) {
        return json({ error: "aimLineageIds must be 1-3 items" }, 400);
      }
      if (icpIds.length < 1 || icpIds.length > 5) {
        return json({ error: "icpLineageIds must be 1-5 items" }, 400);
      }

      const { data: aims, error: aimsError } = await supabase
        .from("brand_aims")
        .select("*")
        .eq("user_id", user.id)
        .in("lineage_id", aimIds)
        .is("superseded_at", null)
        .is("deleted_at", null);

      if (aimsError || !aims || aims.length !== aimIds.length) {
        return json({ error: "Invalid aimLineageIds" }, 400);
      }

      const brandIds = Array.from(
        new Set((aims as Array<Record<string, any>>).map((a) => a.brand_id))
      ).filter(Boolean);
      const strategyBrandId = (body.brandId ?? brandIds[0]) as string | undefined;
      if (!strategyBrandId) {
        return json({ error: "Could not resolve strategy brand" }, 400);
      }
      if (brandIds.some((b) => b !== strategyBrandId)) {
        return json({ error: "All aims must belong to the same brand" }, 400);
      }

      const { data: icps, error: icpsError } = await supabase
        .from("icps")
        .select("*")
        .eq("user_id", user.id)
        .eq("brand_id", strategyBrandId)
        .in("lineage_id", icpIds)
        .is("superseded_at", null)
        .is("deleted_at", null);

      if (icpsError || !icps || icps.length !== icpIds.length) {
        return json({ error: "Invalid icpLineageIds" }, 400);
      }

      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", strategyBrandId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (brandError) {
        return json({ error: "Brand context not found" }, 400);
      }

      const brand = (brandData ?? null) as Record<string, any> | null;

      const prompt = buildMultiPrompt(
        brand,
        aims as Array<Record<string, any>>,
        icps as Array<Record<string, any>>,
        body as GenerateInput
      );

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
              name: MULTI_PROMPT_VERSION,
              schema: RESPONSE_SCHEMA.schema,
              strict: true,
            },
          },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("OpenAI error", resp.status, errText);
        return json(
          { error: "OpenAI call failed", status: resp.status, details: errText },
          500
        );
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

      const title = (body.title ?? "").trim() || `${brand?.name || "Brand"} strategy`;
      const channelArray =
        body.channel && String(body.channel).trim()
          ? [String(body.channel).trim()]
          : null;

      if (body.strategyId) {
        const { data: saved, error: saveError } = await supabase
          .rpc("strategy_insert_version", {
            p_strategy_id: body.strategyId,
            p_updates: {
              title,
              strategy: parsed,
              channel: channelArray,
              prompt_version: MULTI_PROMPT_VERSION,
              model: MODEL,
            },
          });

        if (saveError) {
          return json({ error: "Failed to save strategy", details: saveError.message }, 500);
        }

        return json({
          strategy: parsed,
          prompt_version: MULTI_PROMPT_VERSION,
          model: MODEL,
          record: saved,
        });
      }

      const { data: saved, error: saveError } = await supabase.rpc(
        "strategy_create_with_links",
        {
          p_brand_id: strategyBrandId,
          p_title: title,
          p_strategy: parsed,
          p_channel: channelArray,
          p_prompt_version: MULTI_PROMPT_VERSION,
          p_model: MODEL,
          p_aim_lineage_ids: aimIds,
          p_icp_lineage_ids: icpIds,
        }
      );

      if (saveError) {
        return json({ error: "Failed to save strategy", details: saveError.message }, 500);
      }

      return json({
        strategy: parsed,
        prompt_version: MULTI_PROMPT_VERSION,
        model: MODEL,
        record: saved,
      });
    }

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
