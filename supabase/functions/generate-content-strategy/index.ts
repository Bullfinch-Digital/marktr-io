import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type GenerateContentStrategyInput = {
  icpName: string;
  icpSummary: string;
  brandName: string;
  brandDescription: string;
  platform: string;
  primaryGoal: string;
};

type StrategyOutput = {
  themes: Array<{
    name: string;
    description: string;
    weeklyFocus: string;
  }>;
  postFormats: Array<{
    type: string;
    percentage: number;
    rationale: string;
  }>;
  postingFrequency: string;
  hooks: string[];
  openingMonth: string;
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const SYSTEM_PROMPT = `You are an expert social media strategist. Generate a 30-day content strategy for a founder business. Return ONLY valid JSON with no markdown or backticks:
{
  "themes": [
    { "name": string, "description": string, "weeklyFocus": string }
  ],
  "postFormats": [
    { "type": string, "percentage": number, "rationale": string }
  ],
  "postingFrequency": string,
  "hooks": [string, string, string, string, string],
  "openingMonth": string
}

themes: 4 monthly content themes tailored to the ICP and platform.
postFormats: 3-4 content types with percentage split (must total 100).
postingFrequency: specific recommendation e.g. "4x per week".
hooks: 5 specific opening line hooks written for this ICP.
openingMonth: 2-sentence summary of the strategy approach.`;

function parseStrategyJson(raw: string): StrategyOutput {
  const trimmed = raw.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return valid JSON.");
    parsed = JSON.parse(match[0]);
  }

  const o = parsed as Record<string, unknown>;

  if (
    !Array.isArray(o.themes) ||
    !Array.isArray(o.postFormats) ||
    typeof o.postingFrequency !== "string" ||
    !Array.isArray(o.hooks) ||
    typeof o.openingMonth !== "string"
  ) {
    throw new Error("Model JSON missing required fields.");
  }

  const themes = (o.themes as unknown[]).map((t) => {
    const x = t as Record<string, unknown>;
    return {
      name: String(x.name ?? "").trim(),
      description: String(x.description ?? "").trim(),
      weeklyFocus: String(x.weeklyFocus ?? "").trim(),
    };
  });

  const postFormats = (o.postFormats as unknown[]).map((p) => {
    const x = p as Record<string, unknown>;
    return {
      type: String(x.type ?? "").trim(),
      percentage: Number(x.percentage ?? 0),
      rationale: String(x.rationale ?? "").trim(),
    };
  });

  const hooks = (o.hooks as unknown[]).map((h) => String(h ?? "").trim()).filter(Boolean);

  if (
    themes.length < 1 ||
    postFormats.length < 1 ||
    hooks.length < 1 ||
    !String(o.postingFrequency).trim() ||
    !String(o.openingMonth).trim()
  ) {
    throw new Error("Model JSON has empty required values.");
  }

  return {
    themes,
    postFormats,
    postingFrequency: String(o.postingFrequency).trim(),
    hooks,
    openingMonth: String(o.openingMonth).trim(),
  };
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

    const body = (await req.json()) as Partial<GenerateContentStrategyInput>;

    const icpName = body.icpName?.trim() ?? "";
    const icpSummary = body.icpSummary?.trim() ?? "";
    const brandName = body.brandName?.trim() ?? "";
    const brandDescription = body.brandDescription?.trim() ?? "";
    const platform = body.platform?.trim() ?? "";
    const primaryGoal = body.primaryGoal?.trim() ?? "";

    if (!icpName || !icpSummary || !brandName || !brandDescription || !platform || !primaryGoal) {
      return json(
        {
          error:
            "icpName, icpSummary, brandName, brandDescription, platform, and primaryGoal are required.",
        },
        400
      );
    }

    const userMessage = `Business: ${brandName}
Description: ${brandDescription}
Platform: ${platform}
Ideal customer: ${icpName}
ICP summary: ${icpSummary}
Primary goal: ${primaryGoal}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
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
    const content =
      data?.choices?.[0]?.message?.content != null
        ? String(data.choices[0].message.content)
        : "";

    if (!content) {
      return json({ error: "Empty model response" }, 500);
    }

    let output: StrategyOutput;
    try {
      output = parseStrategyJson(content);
    } catch (err) {
      return json(
        { error: "Failed to parse model JSON", message: String(err), raw: content },
        500
      );
    }

    return json(output);
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
