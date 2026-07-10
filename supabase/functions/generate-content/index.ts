// Supabase Edge Function: generate-content
// Deploy with: supabase functions deploy generate-content
//
// Generates one structured content item for a strategy + single persona.
// Saves to content_items (versioned). No UI in Stage 1.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PROMPT_VERSION = "content_v1_iphone_constraint";
const MODEL = "gpt-5.5";
const MAX_TITLE_LENGTH = 60;

const CONTENT_TYPES = [
  "ig_single",
  "ig_carousel",
  "ig_story",
  "reel_brief",
  "email",
  "landing_page",
] as const;

type ContentType = (typeof CONTENT_TYPES)[number];

type GenerateInput = {
  brandId?: string | null;
  strategyLineageId?: string;
  campaignIdeaId?: string | null;
  icpLineageId?: string;
  type?: string;
  suggestedContentId?: string | null;
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

function list(arr: unknown) {
  return Array.isArray(arr) && arr.length ? arr.join("; ") : "Not provided";
}

function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value);
}

const IPHONE_CONSTRAINT = `
EXECUTION CONSTRAINT (non-negotiable — applies to EVERY visual_direction and clip_direction):
The user is a time-strapped founder filming alone with an iPhone, natural light, and a free app
(Instagram's built-in editor or CapCut). Nothing may imply a crew, a studio, a second pair of
hands, paid software, lighting kits, or post-production grading.

BAD:  "Commission a studio shoot with three-point lighting; consider a rack focus to the garnish. Grade for warmth in post."
GOOD: "Film the pour close up, next to a window in the morning. Hands in frame. Let the syrup swirl before you top it up."

Rules for visual_direction / clip_direction:
- Short sentences.
- Say what to point the camera at and what happens.
- If a founder reads it and thinks "I need a production company," rewrite it.
`;

function contentSchemaForType(type: ContentType): Record<string, unknown> {
  const stringField = { type: "string" };
  switch (type) {
    case "ig_single":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          on_image_text: stringField,
          caption: stringField,
          cta: stringField,
          visual_direction: stringField,
        },
        required: ["on_image_text", "caption", "cta", "visual_direction"],
      };
    case "ig_story":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          on_image_text: stringField,
          cta: stringField,
          visual_direction: stringField,
        },
        required: ["on_image_text", "cta", "visual_direction"],
      };
    case "ig_carousel":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          slides: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                slide_text: stringField,
                visual_direction: stringField,
              },
              required: ["slide_text", "visual_direction"],
            },
          },
          caption: stringField,
          cta: stringField,
        },
        required: ["slides", "caption", "cta"],
      };
    case "reel_brief":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          hook_text: stringField,
          beats: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                on_screen_text: stringField,
                clip_direction: stringField,
              },
              required: ["on_screen_text", "clip_direction"],
            },
          },
          caption: stringField,
          cta: stringField,
        },
        required: ["hook_text", "beats", "caption", "cta"],
      };
    case "email":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          subject: stringField,
          preheader: stringField,
          body_sections: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                heading: stringField,
                body: stringField,
              },
              required: ["heading", "body"],
            },
          },
          cta: stringField,
        },
        required: ["subject", "preheader", "body_sections", "cta"],
      };
    case "landing_page":
      return {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: stringField,
          subhead: stringField,
          sections: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                heading: stringField,
                body: stringField,
              },
              required: ["heading", "body"],
            },
          },
          cta: stringField,
        },
        required: ["headline", "subhead", "sections", "cta"],
      };
  }
}

function responseSchema(type: ContentType) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      content: contentSchemaForType(type),
    },
    required: ["title", "content"],
  };
}

function typeShapeGuidance(type: ContentType): string {
  switch (type) {
    case "ig_single":
      return `- ig_single: on_image_text (short), caption, cta, visual_direction.
- One still. visual_direction must be iPhone-filmable.`;
    case "ig_story":
      return `- ig_story: on_image_text, cta, visual_direction.
- Vertical still or short clip. Keep on_image_text sparse.`;
    case "ig_carousel":
      return `- ig_carousel: 3–6 slides, each with slide_text + visual_direction; plus caption + cta.
- Each slide is a separate phone photo or simple graphic the founder can make alone.`;
    case "reel_brief":
      return `- reel_brief: hook_text; 3–5 beats with on_screen_text + clip_direction; caption; cta.
- Beats are shot on an iPhone in order. clip_direction = what to film, not how to grade.`;
    case "email":
      return `- email: subject, preheader, body_sections (heading + body), cta.
- Short sections. Speak as the brand to this one persona.`;
    case "landing_page":
      return `- landing_page: headline, subhead, sections (heading + body), cta.
- Conversion-focused. No design jargon — copy only.`;
  }
}

function buildPrompt(options: {
  brand: Record<string, any> | null;
  strategy: Record<string, any>;
  strategyTitle: string;
  campaignIdea: Record<string, any> | null;
  icp: Record<string, any>;
  type: ContentType;
}) {
  const { brand, strategy, strategyTitle, campaignIdea, icp, type } = options;
  const positioning = strategy?.positioning ?? {};
  const messaging = strategy?.messaging ?? {};
  const channelPlan = strategy?.channel_plan ?? {};
  const offer = strategy?.offer ?? {};

  const ideaBlock = campaignIdea
    ? `
Campaign idea this piece serves:
- Name: ${campaignIdea.name || "Not provided"}
- Hook: ${campaignIdea.hook || "Not provided"}
- Angle: ${campaignIdea.angle || "Not provided"}
- CTA: ${campaignIdea.cta || "Not provided"}
`
    : `
Campaign idea: none — this is a STRATEGY-LEVEL piece (serves the whole strategy, not one idea).
`;

  return `
You are a senior content strategist writing for a craft brand founder who markets alone.
Use UK English. Be concise and practical.
Do not invent company-specific facts. If details are missing, use "Not provided" or plausible generic examples — never invent claims about the company.
Return STRICT JSON ONLY that matches the given schema. No markdown.

${IPHONE_CONSTRAINT}

Brand context:
- Brand name: ${brand?.name || "Not provided"}
- Brand description: ${brand?.business_description || "Not provided"}
- Product/service: ${brand?.product_or_service || "Not provided"}
- Business type: ${brand?.business_type || "Not provided"}
- Assumed audience: ${list(brand?.assumed_audience)}
- Existing channels: ${list(brand?.marketing_channels)}
- Country: ${brand?.country || "Not provided"}
- Region/city: ${brand?.region_or_city || "Not provided"}
- Currency: ${brand?.currency || "Not provided"}

Strategy: ${strategyTitle || "Not provided"}
Positioning:
- One-liner: ${positioning.one_liner || "Not provided"}
- Why us: ${positioning.why_us || "Not provided"}
- Differentiators: ${list(positioning.differentiators)}

Messaging:
- Value props: ${list(messaging.value_props)}
- Pain to promise: ${list(messaging.pain_to_promise)}
- Objections: ${list(messaging.objections_and_rebuttals)}

Channel plan:
- Primary: ${channelPlan.primary_channel || "Not provided"}
- Secondary: ${list(channelPlan.secondary_channels)}

Offer:
- Recommended offer: ${offer.recommended_offer || "Not provided"}
- Lead magnet: ${offer.lead_magnet_idea || "Not provided"}

${ideaBlock}

ONE persona this piece speaks to (voice comes from here — do not write for a crowd):
- Name: ${icp.name || "Not provided"}
- Description: ${icp.description || "Not provided"}
- Industry: ${icp.industry || "Not provided"}
- Company size: ${icp.company_size || "Not provided"}
- Location: ${icp.location || "Not provided"}
- Goals: ${list(icp.goals)}
- Pain points: ${list(icp.pain_points)}
- Budget: ${icp.budget || "Not provided"}
- Decision makers: ${list(icp.decision_makers)}
- Challenges: ${list(icp.challenges)}
- Opportunities: ${list(icp.opportunities)}

Content type to generate: ${type}
${typeShapeGuidance(type)}

Title field (required):
- Short roster label for this piece. Specific. Under ${MAX_TITLE_LENGTH} characters.
- No brand-name prefix. Never generic ("Instagram Post", "Email", "Content Piece").
- Campaign-flavoured — how the founder would refer to it out loud.
`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeContentByType(type: ContentType, raw: unknown): Record<string, unknown> {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (type) {
    case "ig_single":
      return {
        on_image_text: asString(src.on_image_text),
        caption: asString(src.caption),
        cta: asString(src.cta),
        visual_direction: asString(src.visual_direction),
      };
    case "ig_story":
      return {
        on_image_text: asString(src.on_image_text),
        cta: asString(src.cta),
        visual_direction: asString(src.visual_direction),
      };
    case "ig_carousel": {
      const slides = Array.isArray(src.slides) ? src.slides : [];
      return {
        slides: slides.map((slide: any) => ({
          slide_text: asString(slide?.slide_text),
          visual_direction: asString(slide?.visual_direction),
        })),
        caption: asString(src.caption),
        cta: asString(src.cta),
      };
    }
    case "reel_brief": {
      const beats = Array.isArray(src.beats) ? src.beats : [];
      return {
        hook_text: asString(src.hook_text),
        beats: beats.map((beat: any) => ({
          on_screen_text: asString(beat?.on_screen_text),
          clip_direction: asString(beat?.clip_direction),
        })),
        caption: asString(src.caption),
        cta: asString(src.cta),
      };
    }
    case "email": {
      const sections = Array.isArray(src.body_sections) ? src.body_sections : [];
      return {
        subject: asString(src.subject),
        preheader: asString(src.preheader),
        body_sections: sections.map((section: any) => ({
          heading: asString(section?.heading),
          body: asString(section?.body),
        })),
        cta: asString(src.cta),
      };
    }
    case "landing_page": {
      const sections = Array.isArray(src.sections) ? src.sections : [];
      return {
        headline: asString(src.headline),
        subhead: asString(src.subhead),
        sections: sections.map((section: any) => ({
          heading: asString(section?.heading),
          body: asString(section?.body),
        })),
        cta: asString(src.cta),
      };
    }
  }
}

function deriveTitleFallback(
  type: ContentType,
  campaignIdeaName: string | null,
  icpName: string
): string {
  const typeLabel: Record<ContentType, string> = {
    ig_single: "Feed post",
    ig_carousel: "Carousel",
    ig_story: "Story",
    reel_brief: "Reel",
    email: "Email",
    landing_page: "Landing page",
  };
  const base = campaignIdeaName
    ? `${campaignIdeaName} · ${typeLabel[type]}`
    : `${typeLabel[type]} · ${icpName}`;
  return base.slice(0, MAX_TITLE_LENGTH);
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

    if (!body.strategyLineageId) {
      return json({ error: "strategyLineageId is required" }, 400);
    }
    if (!body.icpLineageId) {
      return json({ error: "icpLineageId is required" }, 400);
    }
    if (!isContentType(body.type)) {
      return json({ error: "type must be a valid content type" }, 400);
    }

    const contentType = body.type;
    const strategyLineageId = body.strategyLineageId;
    const icpLineageId = body.icpLineageId;
    const campaignIdeaId =
      typeof body.campaignIdeaId === "string" && body.campaignIdeaId.trim()
        ? body.campaignIdeaId.trim()
        : null;
    const suggestedContentId =
      typeof body.suggestedContentId === "string" && body.suggestedContentId.trim()
        ? body.suggestedContentId.trim()
        : null;

    const { data: strategyRow, error: strategyError } = await supabase
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .eq("lineage_id", strategyLineageId)
      .is("superseded_at", null)
      .is("deleted_at", null)
      .maybeSingle();

    if (strategyError || !strategyRow) {
      return json({ error: "Strategy not found" }, 404);
    }

    const strategyBrandId = strategyRow.brand_id as string;
    if (body.brandId && body.brandId !== strategyBrandId) {
      return json({ error: "brandId does not match strategy brand" }, 400);
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", strategyBrandId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (brandError || !brand) {
      return json({ error: "Brand not found" }, 400);
    }

    const { data: icp, error: icpError } = await supabase
      .from("icps")
      .select("*")
      .eq("user_id", user.id)
      .eq("brand_id", strategyBrandId)
      .eq("lineage_id", icpLineageId)
      .is("superseded_at", null)
      .is("deleted_at", null)
      .maybeSingle();

    if (icpError || !icp) {
      return json({ error: "ICP not found for this brand" }, 400);
    }

    const strategyPayload =
      strategyRow.strategy && typeof strategyRow.strategy === "object"
        ? (strategyRow.strategy as Record<string, any>)
        : {};

    const campaignIdeas = Array.isArray(strategyPayload.campaign_ideas)
      ? strategyPayload.campaign_ideas
      : [];

    let campaignIdea: Record<string, any> | null = null;
    let campaignIdeaNameSnapshot: string | null = null;

    if (campaignIdeaId) {
      campaignIdea =
        campaignIdeas.find(
          (idea: any) => typeof idea?.id === "string" && idea.id === campaignIdeaId
        ) ?? null;
      if (!campaignIdea) {
        return json({ error: "campaignIdeaId not found on current strategy version" }, 400);
      }
      campaignIdeaNameSnapshot =
        typeof campaignIdea.name === "string" && campaignIdea.name.trim()
          ? campaignIdea.name.trim()
          : null;
    }

    if (suggestedContentId) {
      const suggestions = Array.isArray(strategyPayload.suggested_content)
        ? strategyPayload.suggested_content
        : [];
      const match = suggestions.find(
        (s: any) => typeof s?.id === "string" && s.id === suggestedContentId
      );
      if (!match) {
        console.warn(
          "[generate-content] suggestedContentId not found on current strategy; continuing without link",
          suggestedContentId
        );
      }
    }

    const icpNameSnapshot =
      typeof icp.name === "string" && icp.name.trim() ? icp.name.trim() : "Persona";

    const prompt = buildPrompt({
      brand,
      strategy: strategyPayload,
      strategyTitle: strategyRow.title,
      campaignIdea,
      icp,
      type: contentType,
    });

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
            name: `${PROMPT_VERSION}_${contentType}`,
            schema: responseSchema(contentType),
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

    const generatedTitle =
      typeof parsed.title === "string" ? parsed.title.trim() : "";
    const title =
      generatedTitle.slice(0, MAX_TITLE_LENGTH) ||
      deriveTitleFallback(contentType, campaignIdeaNameSnapshot, icpNameSnapshot);

    const content = normalizeContentByType(contentType, parsed.content);

    const row = {
      brand_id: strategyBrandId,
      user_id: user.id,
      strategy_lineage_id: strategyLineageId,
      campaign_idea_id: campaignIdeaId,
      campaign_idea_name_snapshot: campaignIdeaNameSnapshot,
      icp_lineage_id: icpLineageId,
      icp_name_snapshot: icpNameSnapshot,
      suggested_content_id: suggestedContentId,
      type: contentType,
      title,
      content,
      status: "draft",
      prompt_version: PROMPT_VERSION,
      model: MODEL,
    };

    const { data: saved, error: saveError } = await supabase
      .from("content_items")
      .insert(row)
      .select()
      .single();

    if (saveError) {
      return json({ error: "Failed to save content item", details: saveError.message }, 500);
    }

    return json({
      title,
      content,
      prompt_version: PROMPT_VERSION,
      model: MODEL,
      record: saved,
    });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
