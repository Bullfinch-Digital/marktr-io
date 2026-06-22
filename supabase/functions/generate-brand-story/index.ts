// Supabase Edge Function: generate-brand-story
// Deploy with: supabase functions deploy generate-brand-story --project-ref <ref>
// Requires secret: OPENAI_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type GenerateBrandStoryInput = {
  answers: string[];
  email: string;
  businessName?: string;
};

type BrandStoryFinding = {
  title: string;
  recommendation: string;
};

type BrandStoryOutput = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
  findings?: BrandStoryFinding[];
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

const SYSTEM_PROMPT = `You are a sharp, experienced brand strategist helping a founder articulate the story behind THEIR specific business. You are given the business name and their answers — use their real specifics (the actual name, the place, the product, the real reason they started) throughout.

Hard rules:
- Use the business's ACTUAL NAME (provided) in every section. Never write "the business", "our business", "the company", or a placeholder like "[business]". If no name is given, refer to it naturally from their answers — never a placeholder.
- No clichés or filler. Banned: "passionate about quality", "flooded with mediocrity", "game-changing", "elevate", "seamless", "exceptional service", "transformative power". If a sentence could belong to any business, rewrite it until it could only belong to this one.
- Ground every sentence in what they actually told you. If a detail is missing, write around it honestly — never invent facts, awards, or claims.

Sections:
- foundingStory: A real, human founding moment in the brand's own first-person voice ("we"), anchored in the specific place, decision or frustration that started it. 2-3 sentences. True, not corporate.
- pointOfView: One brave, specific sentence — an opinion about their industry a lazy competitor would hesitate to say aloud. No safe generalities.
- positioningStatement: Two sentences: "For [their specific audience] who [their specific need], [ACTUAL BUSINESS NAME] is the [category] that [their real differentiator]." Fill every bracket — leave no placeholder in the output.
- brandPurpose: One sentence — the deeper why, plain and concrete, not aspirational fluff.

Return ONLY valid JSON with no markdown, no backticks, no preamble. Use this exact structure:
{
  "foundingStory": "string",
  "pointOfView": "string",
  "positioningStatement": "string",
  "brandPurpose": "string",
  "findings": [
    {
      "title": "3-6 word punchy title",
      "recommendation": "1-2 sentences naming the gap and what closing it would do for them, grounded in their answers."
    }
  ]
}

In addition to the brand story sections, analyse the information provided and identify 3–4 specific, honest opportunities to strengthen this brand's story and marketing. Each finding MUST be grounded in what the user actually told you — reference their specifics, never generic advice. For each finding return: a short punchy title (3–6 words) and a 1–2 sentence recommendation that names the gap and what closing it would do for them. Draw from opportunities such as: speaking to one precise ideal audience instead of a broad one; owning a sharper niche or differentiator that's currently buried; building proof and credibility (testimonials, named awards, founder/origin specifics); making the point of view braver and more distinctive; putting the human/founder visibly into the story. Do NOT invent facts. If proof is missing, frame it as something to build, never as something they already have. Tone: warm, specific, honest, peer-to-peer — an experienced founder giving a straight, encouraging read. No hype, no marketing clichés.`;

function buildUserMessage(answers: string[], businessName?: string) {
  const a = answers.map((x) => String(x ?? "").trim());
  const name = businessName?.trim();
  const nameBlock = name ? `Business name: ${name}\n\n` : "";
  return `${nameBlock}Q1 (What they do): ${a[0] ?? ""}
Q2 (Why they started): ${a[1] ?? ""}
Q3 (Industry POV): ${a[2] ?? ""}
Q4 (Best customer): ${a[3] ?? ""}
Q5 (Customer feedback): ${a[4] ?? ""}
Q6 (If gone): ${a[5] ?? ""}
Q7 (5yr vision): ${a[6] ?? ""}`;
}

function parseFindings(raw: unknown): BrandStoryFinding[] {
  if (!Array.isArray(raw)) return [];
  const findings: BrandStoryFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const recommendation =
      typeof row.recommendation === "string" ? row.recommendation.trim() : "";
    if (!title || !recommendation) continue;
    findings.push({ title, recommendation });
    if (findings.length >= 4) break;
  }
  return findings;
}

function parseStoryJson(raw: string): BrandStoryOutput {
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
    typeof o.foundingStory !== "string" ||
    typeof o.pointOfView !== "string" ||
    typeof o.positioningStatement !== "string" ||
    typeof o.brandPurpose !== "string"
  ) {
    throw new Error("Model JSON missing required string fields.");
  }
  return {
    foundingStory: o.foundingStory,
    pointOfView: o.pointOfView,
    positioningStatement: o.positioningStatement,
    brandPurpose: o.brandPurpose,
    findings: parseFindings(o.findings),
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

    const body = (await req.json()) as GenerateBrandStoryInput;

    if (!Array.isArray(body?.answers) || body.answers.length !== 7) {
      return json({ error: "Invalid input: answers must be an array of 7 strings." }, 400);
    }
    if (typeof body?.email !== "string" || !body.email.trim()) {
      return json({ error: "Invalid input: email is required." }, 400);
    }

    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    const userMessage = buildUserMessage(
      body.answers,
      businessName || undefined
    );

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1800,
        temperature: 0.6,
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

    let output: BrandStoryOutput;
    try {
      output = parseStoryJson(content);
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
