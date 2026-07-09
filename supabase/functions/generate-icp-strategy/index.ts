// Supabase Edge Function: generate-icp-strategy
// Deploy with: supabase functions deploy generate-icp-strategy
// Set secret with: supabase secrets set OPENAI_API_KEY=sk-...
//
// Generates a brand-scoped marketing strategy and saves to strategies + join tables.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MULTI_PROMPT_VERSION = "strategy_v2_generated_title";
const MODEL = "gpt-5.5";
const MAX_TITLE_LENGTH = 60;

type GenerateInput = {
  channel?: string | null;
  offerType?: string | null;
  tone?: string | null;
  businessStage?: string | null;
  monthlyBudgetBand?: string | null;
  objectiveHorizon?: string | null;
  marketingCapacity?: string | null;
  aimLineageIds?: string[];
  icpLineageIds?: string[];
  brandId?: string | null;
  strategyId?: string;
  title?: string;
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

function extractStructuredOutput(response: any): {
  outputText: string;
  messageTexts: string[];
  messageItemCount: number;
  outputItemTypes: string[];
} {
  const output = Array.isArray(response?.output) ? response.output : [];
  const messageTexts: string[] = [];
  let messageItemCount = 0;

  for (const item of output) {
    const itemType = item?.type;
    if (itemType !== "message") continue;
    messageItemCount += 1;
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const partType = part?.type;
      if (partType === "output_text" && typeof part?.text === "string" && part.text.trim()) {
        messageTexts.push(part.text);
      } else if (partType === "text" && typeof part?.text === "string" && part.text.trim()) {
        messageTexts.push(part.text);
      } else if (typeof part?.value === "string" && part.value.trim()) {
        messageTexts.push(part.value);
      }
    }
  }

  const helperText =
    typeof response?.output_text === "string" && response.output_text.trim()
      ? response.output_text
      : "";
  const joinedMessageText = messageTexts.join("\n").trim();
  const outputText = helperText || joinedMessageText;

  return {
    outputText,
    messageTexts,
    messageItemCount,
    outputItemTypes: output.map((item: any) => item?.type ?? "unknown"),
  };
}

function logOpenAiResponse(label: string, response: any) {
  try {
    console.log(
      `[generate-icp-strategy] ${label} OpenAI response`,
      JSON.stringify(response, null, 2)
    );
  } catch (err) {
    console.log(`[generate-icp-strategy] ${label} OpenAI response (stringify failed)`, err);
    console.log(response);
  }
}

function deriveStrategyTitle(
  aims: Array<Record<string, any>>,
  icps: Array<Record<string, any>>,
  channel?: string | null
): string {
  const aimPart = aims
    .map((a) => String(a.title || "").trim())
    .filter(Boolean)
    .join(" + ");
  const icpPart = icps
    .map((i) => String(i.name || "").trim())
    .filter(Boolean)
    .join(" + ");
  const channelPart = channel && String(channel).trim() ? String(channel).trim() : "";

  let title = aimPart && icpPart ? `${aimPart} · ${icpPart}` : aimPart || icpPart || "Strategy";
  if (channelPart && title.length + channelPart.length + 3 <= MAX_TITLE_LENGTH) {
    title = `${title} · ${channelPart}`;
  }
  return title.slice(0, MAX_TITLE_LENGTH);
}

function isGenericGeneratedTitle(title: string, brandName?: string | null): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length > MAX_TITLE_LENGTH) return true;

  const blocked = new Set([
    "growth strategy",
    "marketing plan",
    "marketing strategy",
    "q4 campaign",
    "autumn growth strategy",
    "brand strategy",
  ]);
  if (blocked.has(normalized)) return true;
  if (normalized.endsWith(" strategy") && normalized.split(/\s+/).length <= 3) return true;

  const brand = brandName?.trim().toLowerCase();
  if (brand && (normalized === `${brand} strategy` || normalized.startsWith(`${brand} `))) {
    return true;
  }

  return false;
}

function resolveStrategyTitle(options: {
  userTitle?: string | null;
  generatedTitle?: string | null;
  brandName?: string | null;
  aims: Array<Record<string, any>>;
  icps: Array<Record<string, any>>;
  channel?: string | null;
}): string {
  const userTitle = (options.userTitle ?? "").trim();
  if (userTitle) return userTitle.slice(0, MAX_TITLE_LENGTH);

  const generatedTitle = (options.generatedTitle ?? "").trim();
  if (generatedTitle && !isGenericGeneratedTitle(generatedTitle, options.brandName)) {
    return generatedTitle.slice(0, MAX_TITLE_LENGTH);
  }

  return deriveStrategyTitle(options.aims, options.icps, options.channel);
}

function splitStrategyPayload(parsed: Record<string, unknown>): {
  generatedTitle: string;
  strategy: Record<string, unknown>;
} {
  const generatedTitle = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const strategy = { ...parsed };
  delete strategy.title;
  return { generatedTitle, strategy };
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

Title field (required in JSON):
- Campaign-flavoured and SPECIFIC — how a marketer would refer to this plan out loud (e.g. "Spiced Apple Autumn Hosting Push", not "Autumn Growth Strategy").
- Reference the substance of the aim(s) — the actual product or goal — and include persona or channel where it sharpens the name.
- Under ${MAX_TITLE_LENGTH} characters.
- Do NOT prefix with the brand name — the strategy already lives inside its brand.
- Never generic ("Growth Strategy", "Q4 Campaign", "Marketing Plan", "[Brand] strategy").
`;
}

const RESPONSE_SCHEMA = {
  name: "icp_strategy",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
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
      "title",
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
    // Multi mode whenever both arrays are provided (even empty),
    // so we can return clean 400s for empty selections.
    const isMulti =
      Array.isArray(aimLineageIds) && Array.isArray(icpLineageIds);

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
          reasoning: {
            effort: "low",
          },
          max_output_tokens: 4000,
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
      logOpenAiResponse("multi", data);
      const extracted = extractStructuredOutput(data);
      const outputText = extracted.outputText;

      let parsed: any = null;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        const match = String(outputText).match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (!parsed) {
        return json(
          {
            error: "Model response did not contain valid JSON.",
            raw: outputText,
            response_status: data?.status ?? null,
            incomplete_details: data?.incomplete_details ?? null,
            output_item_types: extracted.outputItemTypes,
            message_item_count: extracted.messageItemCount,
          },
          500
        );
      }

      const { generatedTitle, strategy: strategyPayload } = splitStrategyPayload(
        parsed as Record<string, unknown>
      );
      const title = resolveStrategyTitle({
        userTitle: body.title,
        generatedTitle,
        brandName: brand?.name,
        aims: aims as Array<Record<string, any>>,
        icps: icps as Array<Record<string, any>>,
        channel: body.channel,
      });
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
              strategy: strategyPayload,
              channel: channelArray,
              prompt_version: MULTI_PROMPT_VERSION,
              model: MODEL,
            },
          });

        if (saveError) {
          return json({ error: "Failed to save strategy", details: saveError.message }, 500);
        }

        return json({
          strategy: strategyPayload,
          title,
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
          p_strategy: strategyPayload,
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
        strategy: strategyPayload,
        title,
        prompt_version: MULTI_PROMPT_VERSION,
        model: MODEL,
        record: saved,
      });
    }

    return json({ error: "aimLineageIds and icpLineageIds are required" }, 400);
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
