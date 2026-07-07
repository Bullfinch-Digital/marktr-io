// supabase/functions/generate-icp-profile/index.ts
//
// Edge function to generate an ICP profile using OpenAI and
// insert it into the "icps" table, then return the created row.
//
// Expects a POST body like:
// {
//   "projectName": "B2B SaaS CRM",
//   "productDescription": "We help small B2B SaaS teams track trials and conversions.",
//   "targetMarket": "B2B SaaS companies with 5–50 employees",
//   "pricePoint": "£99/month",
//   "extraContext": "Focus on marketing leads / demand gen managers."
// }
//
// It uses the caller's JWT (Authorization: Bearer <token>) to
// associate the ICP with the authenticated user.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type GenerateInput = {
  projectName: string;
  productDescription: string;
  targetMarket: string;
  pricePoint?: string;
  extraContext?: string;
  brandId?: string;
};

type GeneratedICP = {
  name: string;
  summary: string;
  industry: string;
  companySize?: string;
  location?: string;
  goals?: string[];
  painPoints?: string[];
  tags?: string[];
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4.1-mini";

async function resolveBrandIdForIcpOps(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  preferredBrandId?: string | null
): Promise<string | null> {
  if (preferredBrandId) return preferredBrandId;

  const { data, error } = await supabaseClient
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("brand lookup failed", error);
    return null;
  }

  return data?.[0]?.id ?? null;
}

async function ensureDefaultBrandForUser(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseClient
    .from("brands")
    .insert([
      {
        user_id: userId,
        name: "My Brand",
        created_at: now,
        updated_at: now,
      },
    ])
    .select("id")
    .single();

  if (error) {
    const existing = await resolveBrandIdForIcpOps(supabaseClient, userId, null);
    if (existing) return existing;
    console.error("failed to ensure default brand", error);
    throw new Error("ICP write blocked: could not resolve or create brand");
  }

  return data.id;
}

async function resolveBrandIdForIcpWrite(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  preferredBrandId?: string | null
): Promise<string> {
  let brandId = await resolveBrandIdForIcpOps(supabaseClient, userId, preferredBrandId ?? null);
  if (brandId) return brandId;
  return ensureDefaultBrandForUser(supabaseClient, userId);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !openaiKey) {
      console.error("Missing env vars");
      return new Response("Server misconfigured", { status: 500 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response("Missing or invalid Authorization header", {
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authed user (so we can link the ICP to them)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error", userError);
      return new Response("Unauthenticated", { status: 401 });
    }

    const body = (await req.json()) as Partial<GenerateInput>;

    if (!body.projectName || !body.productDescription || !body.targetMarket) {
      return new Response(
        "projectName, productDescription and targetMarket are required",
        { status: 400 },
      );
    }

    const generateInput: GenerateInput = {
      projectName: body.projectName,
      productDescription: body.productDescription,
      targetMarket: body.targetMarket,
      pricePoint: body.pricePoint ?? "",
      extraContext: body.extraContext ?? "",
      brandId: body.brandId,
    };

    // Call OpenAI to generate a structured ICP object
    const openaiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "icp_profile",
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                summary: { type: "string" },
                industry: { type: "string" },
                companySize: { type: "string" },
                location: { type: "string" },
                goals: {
                  type: "array",
                  items: { type: "string" },
                },
                painPoints: {
                  type: "array",
                  items: { type: "string" },
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["name", "summary", "industry"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You are an expert B2B marketer. Generate a realistic, non-cringey Ideal Customer Profile as JSON only. Use UK English.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Project name: ${generateInput.projectName}\n` +
                  `Product: ${generateInput.productDescription}\n` +
                  `Target market: ${generateInput.targetMarket}\n` +
                  `Price point: ${generateInput.pricePoint || "n/a"}\n` +
                  `Extra context: ${generateInput.extraContext || "none"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI error", errText);
      return new Response("Failed to generate ICP", { status: 500 });
    }

    const completion = await openaiResponse.json();
    const content =
      completion.choices?.[0]?.message?.content ??
      completion.choices?.[0]?.message?.parsed ??
      null;

    if (!content) {
      console.error("No content in OpenAI response", completion);
      return new Response("Invalid AI response", { status: 500 });
    }

    const icp: GeneratedICP =
      typeof content === "string" ? JSON.parse(content) : content;

    const brandId = await resolveBrandIdForIcpWrite(
      supabase,
      user.id,
      generateInput.brandId ?? null
    );

    const rowToInsert: Record<string, unknown> = {
      user_id: user.id,
      brand_id: brandId,
      name: icp.name,
      description: icp.summary,
      industry: icp.industry,
      company_size: icp.companySize ?? null,
      location: icp.location ?? null,
      goals: icp.goals ?? [],
      pain_points: icp.painPoints ?? [],
      tags: icp.tags ?? [],
    };

    const { data, error } = await supabase
      .from("icps")
      .insert(rowToInsert)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error", error);
      return new Response("Failed to save ICP", { status: 500 });
    }

    return new Response(JSON.stringify({ icp: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error in generate-icp-profile", err);
    return new Response("Internal server error", { status: 500 });
  }
});
