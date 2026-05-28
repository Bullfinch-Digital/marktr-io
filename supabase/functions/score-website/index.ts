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
  strengths?: string[];
  gaps?: string[];
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

function extractAllSignals(html: string, url: string): string {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m?.[1]?.trim() ?? "";
  };
  const getAll = (pattern: RegExp) => {
    return [...html.matchAll(pattern)]
      .map((m) => m[1]?.trim())
      .filter(Boolean) as string[];
  };

  const title = get(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc =
    get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{10,})/i) ||
    get(
      /<meta[^>]*content=["']([^"']{10,})["'][^>]*name=["']description["']/i
    );
  const ogTitle =
    get(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
    get(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const ogDesc =
    get(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i
    ) ||
    get(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
    );

  const h1s = getAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)
    .map((h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 2)
    .slice(0, 3);

  const h2s = getAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
    .map((h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 2 && t.length < 120)
    .slice(0, 5);

  const navLinks = getAll(/<a[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)
    .map((t) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 1 && t.length < 40)
    .filter((t) => !/^(£|\$|[0-9])/.test(t))
    .slice(0, 20);

  const ctaPatterns =
    /\b(buy|shop|get|start|subscribe|sign up|book|order|download|try|learn|discover|explore|contact|join|apply)\b/i;
  const ctaLinks = navLinks.filter((t) => ctaPatterns.test(t)).slice(0, 5);

  const socialProofPatterns =
    /(★|☆|\d+(\.\d+)?\s*stars?|\d+\s*reviews?|award|rated|certified|trusted|verified|testimonial|customers?)/gi;
  const socialProofMatches = (html.match(socialProofPatterns) || []).slice(0, 5);

  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  let schemaType = "";
  let schemaDesc = "";
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      schemaType = schema["@type"] ?? "";
      schemaDesc = schema["description"] ?? "";
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  const footerText = footerMatch
    ? footerMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400)
    : "";

  const mainMatch =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<div[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/div>/i);
  const mainText = mainMatch
    ? mainMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200)
    : "";

  const hasContact = /contact|get in touch|reach us|email us|call us/i.test(html);
  const hasEmail =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(html);

  const socialPlatforms = [
    "instagram",
    "facebook",
    "twitter",
    "linkedin",
    "tiktok",
    "youtube",
  ].filter((p) => new RegExp(p, "i").test(html));

  const parts = [
    `URL: ${url}`,
    title && `Page title: ${title}`,
    metaDesc && `Meta description: ${metaDesc}`,
    ogTitle && ogTitle !== title && `OG title: ${ogTitle}`,
    ogDesc && ogDesc !== metaDesc && `OG description: ${ogDesc}`,
    h1s.length && `H1 headings: ${h1s.join(" | ")}`,
    h2s.length && `H2 headings: ${h2s.join(" | ")}`,
    navLinks.length && `Navigation: ${navLinks.join(", ")}`,
    ctaLinks.length && `CTA buttons/links: ${ctaLinks.join(", ")}`,
    socialProofMatches.length &&
      `Social proof signals: ${socialProofMatches.join(", ")}`,
    schemaType && `Schema type: ${schemaType}`,
    schemaDesc && `Schema description: ${schemaDesc}`,
    socialPlatforms.length && `Social media: ${socialPlatforms.join(", ")}`,
    hasContact && "Has contact information: yes",
    hasEmail && "Has email address: yes",
    footerText && `Footer content: ${footerText}`,
    mainText && `Main page content: ${mainText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return parts || "No readable content found";
}

const SYSTEM_PROMPT = `You are a senior digital marketing strategist conducting a website audit for a small business owner. You have been given signals extracted from their website's HTML.

Assess the website across these five criteria and return ONLY valid JSON with no markdown or backticks:

{
  "hasValueProposition": boolean,
  "hasClearAudience": boolean,
  "hasCallToAction": boolean,
  "hasSocialProof": boolean,
  "hasContactOrCapture": boolean,
  "clarityScore": number (0-100),
  "observation": string (max 15 words, most important specific finding),
  "strengths": [string, string],
  "gaps": [string, string]
}

Scoring guidance:
- hasValueProposition: true if the title/meta/headings clearly explain what the business does and who for
- hasClearAudience: true if the content signals a specific target customer
- hasCallToAction: true if there are clear action-oriented links or buttons
- hasSocialProof: true if there are reviews, ratings, awards, testimonials or trust badges
- hasContactOrCapture: true if there is contact info, a contact page, email capture or booking option
- clarityScore: 0-100 based on how well the homepage communicates value to a first-time visitor. Be fair — a site with a clear title, meta description, headings and CTAs should score 60-80 minimum.
- observation: one specific, honest observation about the biggest opportunity for improvement. Be specific — name what you see, not generic advice.
- strengths: two specific things the site does well based on the signals provided
- gaps: two specific improvement opportunities based on actual gaps in the signals`;

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

    let signals = "";
    try {
      const res = await fetch(websiteUrl, {
        headers: { "User-Agent": "marktr-bot/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await res.text();
      signals = extractAllSignals(html, websiteUrl);

      if (signals === "No readable content found") {
        throw new Error("No readable content found");
      }
    } catch {
      return json({
        score: 35,
        observation: "Could not access your website — check the URL",
        strengths: [],
        gaps: [],
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
          max_tokens: 400,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Website signals:\n\n${signals}`,
            },
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
      ].filter(Boolean).length * 14;

      const finalScore = Math.min(
        98,
        Math.round(criteriaScore + Number(result.clarityScore || 0) * 0.3)
      );

      return json({
        score: finalScore,
        observation: String(result.observation || "").trim().slice(0, 180),
        strengths: Array.isArray(result.strengths)
          ? result.strengths.map((s) => String(s).trim()).filter(Boolean)
          : [],
        gaps: Array.isArray(result.gaps)
          ? result.gaps.map((g) => String(g).trim()).filter(Boolean)
          : [],
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
        strengths: [],
        gaps: [],
        breakdown: null,
      });
    }
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
