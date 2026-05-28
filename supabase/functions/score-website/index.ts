import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Input = { websiteUrl: string };

type WebsiteScoreResult = {
  hasValueProposition: boolean;
  hasClearAudience: boolean;
  hasCallToAction: boolean;
  hasSocialProof: boolean;
  hasContactOrCapture: boolean;
  clarityScore: number;
  observation: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
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

function parseMaybeJson(raw: string): WebsiteScoreResult {
  try {
    return JSON.parse(raw) as WebsiteScoreResult;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON.");
    return JSON.parse(match[0]) as WebsiteScoreResult;
  }
}

function normaliseUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const SYSTEM_PROMPT = `You are a marketing expert assessing a business website. Based on the homepage text provided, score the website on these five criteria and return ONLY valid JSON:

{
  "hasValueProposition": boolean,
  "hasClearAudience": boolean,
  "hasCallToAction": boolean,
  "hasSocialProof": boolean,
  "hasContactOrCapture": boolean,
  "clarityScore": number (0-100),
  "observation": string (one sentence, max 12 words, about the biggest gap you can see)
}`;

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return json(
      {
        error:
          "OPENAI_API_KEY missing. Set it via `supabase secrets set OPENAI_API_KEY=...` and redeploy.",
      },
      500
    );
  }

  try {
    const body = (await req.json()) as Partial<Input>;
    const websiteUrl = normaliseUrl(body.websiteUrl ?? "");
    if (!websiteUrl) return json({ error: "websiteUrl is required" }, 400);

    let text = "";
    try {
      const res = await fetch(websiteUrl, {
        headers: { "User-Agent": "marktr-bot/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await res.text();
      text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);

      if (!text) {
        throw new Error("No readable text extracted");
      }

      const hasUsefulContent = text.trim().length > 200;
      if (!hasUsefulContent) {
        return json({
          score: 52,
          observation:
            "Your website loaded but uses a modern JavaScript framework — connect your account for a deeper analysis",
          breakdown: null,
        });
      }
    } catch {
      return json({
        score: 35,
        observation: "Could not access your website — check the URL",
        breakdown: null,
      });
    }

    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 200,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Homepage text: ${text}` },
          ],
        }),
      });

      if (!aiResp.ok) throw new Error("OpenAI request failed");

      const data = await aiResp.json();
      const content =
        data?.choices?.[0]?.message?.content != null
          ? String(data.choices[0].message.content)
          : "";
      if (!content) throw new Error("Empty model response");

      const result = parseMaybeJson(content);

      const criteriaScore = [
        Boolean(result.hasValueProposition),
        Boolean(result.hasClearAudience),
        Boolean(result.hasCallToAction),
        Boolean(result.hasSocialProof),
        Boolean(result.hasContactOrCapture),
      ].filter(Boolean).length * 12;

      const finalScore = Math.round(
        (criteriaScore + Number(result.clarityScore || 0) * 0.4) / 1.4
      );

      return json({
        score: finalScore,
        observation: String(result.observation || "").trim().slice(0, 180),
        breakdown: {
          hasValueProposition: Boolean(result.hasValueProposition),
          hasClearAudience: Boolean(result.hasClearAudience),
          hasCallToAction: Boolean(result.hasCallToAction),
          hasSocialProof: Boolean(result.hasSocialProof),
          hasContactOrCapture: Boolean(result.hasContactOrCapture),
        },
      });
    } catch {
      return json({
        score: 40,
        observation: "Website found but could not be fully analysed",
        breakdown: null,
      });
    }
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
