// Supabase Edge Function: generate-brand-story
// Deploy with: supabase functions deploy generate-brand-story --project-ref <ref>
// Requires secret: OPENAI_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type GenerateBrandStoryInput = {
  answers: string[];
  email: string;
};

type BrandStoryOutput = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
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

const SYSTEM_PROMPT = `You are a brand strategist helping a founder articulate the story behind their business. Based on their answers, generate 4 distinct brand story outputs. Return ONLY valid JSON with no markdown, no backticks, no preamble. Use this exact structure:
{
  "foundingStory": "2-3 sentence narrative paragraph about why this business exists, written in third person, grounded in their specific answers.",
  "pointOfView": "A single sentence capturing their distinctive belief about their industry.",
  "positioningStatement": "2 sentences starting with: For [customer] who [pain], [business] is the [category] that [key differentiator].",
  "brandPurpose": "A single sentence capturing why this business exists beyond profit."
}`;

function buildUserMessage(answers: string[]) {
  const a = answers.map((x) => String(x ?? "").trim());
  return `Q1 (What they do): ${a[0] ?? ""}
Q2 (Why they started): ${a[1] ?? ""}
Q3 (Industry POV): ${a[2] ?? ""}
Q4 (Best customer): ${a[3] ?? ""}
Q5 (Customer feedback): ${a[4] ?? ""}
Q6 (If gone): ${a[5] ?? ""}
Q7 (5yr vision): ${a[6] ?? ""}`;
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

    const userMessage = buildUserMessage(body.answers);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1000,
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
