// Supabase Edge Function: generate-icps
// Deploy with: supabase functions deploy generate-icps
// Set secret with: supabase secrets set OPENAI_API_KEY=sk-...
//
// This function calls OpenAI server-side (safe) and returns structured ICP JSON.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type GenerateInput = {
  name: string;
  brandName: string;
  businessDescription: string;
  productOrService: string;
  assumedAudience: string[];
  marketingChannels: string[];
  country?: string;
  regionOrCity?: string;
  currency?: string;
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

function buildPrompt(input: GenerateInput) {
  const country = (input.country || "").trim();
  const regionOrCity = (input.regionOrCity || "").trim();
  const currency = (input.currency || "").trim();
  const geoLine = [country, regionOrCity].filter(Boolean).join(" — ");

  return `
You are an expert marketing strategist.
Generate 3 Ideal Customer Profiles (ICPs) as STRICT JSON ONLY (no markdown).

Return shape:
{
  "icps": [
    {
      "name": string,
      "description": string,
      "industry": string,
      "company_size": string,
      "location": string,
      "goals": string[],
      "pain_points": string[],
      "budget": string,
      "decision_makers": string[],
      "tech_stack": string[],
      "challenges": string[],
      "opportunities": string[]
    }
  ]
}

Context:
- Founder name: ${input.name}
- Brand name: ${input.brandName}
- Business description: ${input.businessDescription}
- Product/service: ${input.productOrService}
- Assumed audience: ${input.assumedAudience.join(", ")}
- Marketing channels: ${input.marketingChannels.join(", ")}
The founder currently uses these platforms: ${input.marketingChannels.join(", ")}. Lean each ICP's tech_stack and opportunities toward the platforms the founder already uses. Also suggest one or two platforms they are not using where this ICP is active, with a one-line reason inside opportunities. If 'None yet', recommend the single best platform to start with and why.
- Customer geography: ${geoLine || "Not provided"}
- Currency: ${currency || "Not provided"}

Constraints:
- goals/pain_points must be highly specific to the context
- provide realistic budgets + decision maker roles
- keep it usable for marketing campaigns
- IMPORTANT GEO RULES:
  - The ICP "location" field MUST reflect the customer's geography above. If a country is provided, location MUST include that country.
  - If Customer geography includes "United States", location MUST include "United States" (optionally plus region/city) and MUST NOT say "UK".
  - If Customer geography is NOT "United Kingdom", you MUST NOT mention UK/British/London/GBP anywhere in the ICP text.
- IMPORTANT CURRENCY RULES:
  - Any monetary amounts (especially "budget") MUST be expressed in the specified currency (e.g. USD for United States).
  - If currency is provided, NEVER output budgets in a different currency.
`;
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json(
        {
          error:
            "OPENAI_API_KEY missing. Set it via `supabase secrets set OPENAI_API_KEY=...` then redeploy.",
        },
        500
      );
    }

    const body = (await req.json()) as GenerateInput;

    // Debug mode: return received payload + prompt (no OpenAI call)
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    // Minimal validation
    if (
      !body?.name ||
      !body?.brandName ||
      !body?.businessDescription ||
      !body?.productOrService
    ) {
      return json({ error: "Invalid input payload" }, 400);
    }

    const cleaned = {
      ...body,
      country: (body.country || "").trim() || "United Kingdom",
      regionOrCity: (body.regionOrCity || "").trim() || "",
      currency: (body.currency || "").trim() || "GBP",
    };

    const prompt = buildPrompt(cleaned);

    if (debug) {
      return json({ ok: true, received: body, prompt });
    }

    // OpenAI Responses API call (server-side)
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        input: prompt,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json(
        { error: "OpenAI call failed", status: resp.status, details: errText },
        500
      );
    }

    const data = await resp.json();

    // The SDK exposes output_text; here we extract from Responses API raw JSON:
    // We'll try common patterns and fall back to stringify.
    const outputText =
      data?.output_text ??
      data?.output?.[0]?.content?.[0]?.text ??
      data?.output?.[0]?.content?.[0]?.value ??
      "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      // Sometimes models include stray text; attempt to extract the first JSON block.
      const match = String(outputText).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed?.icps || !Array.isArray(parsed.icps) || parsed.icps.length === 0) {
      return json(
        {
          error: "Model response did not contain valid icps[] JSON.",
          raw: outputText,
        },
        500
      );
    }

    const debugParam = new URL(req.url).searchParams.get("debug");
    if (debugParam === "1") {
      return json({ icps: parsed.icps, debug: { received: body, prompt } });
    }

    return json({ icps: parsed.icps });
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
