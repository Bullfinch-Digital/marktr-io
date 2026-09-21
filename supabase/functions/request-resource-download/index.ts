// Supabase Edge Function: request-resource-download
// - Verifies Cloudflare Turnstile (mirrors capture-onboarding-lead)
// - Inserts into resource_leads
// - Returns a short-lived signed Storage URL (never public)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
const STORAGE_BUCKET = "resource-downloads";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type TurnstileVerifyResult = { ok: true } | { ok: false; errorCodes: string[] };

function clientIpFromRequest(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string | null,
): Promise<TurnstileVerifyResult> {
  if (!token) return { ok: false, errorCodes: ["missing-token"] };
  if (!turnstileSecret) return { ok: false, errorCodes: ["missing-secret"] };
  try {
    const form = new FormData();
    form.append("secret", turnstileSecret);
    form.append("response", token);
    if (remoteip) form.append("remoteip", remoteip);
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await resp.json();
    if (data?.success) return { ok: true };
    const codes = Array.isArray(data?.["error-codes"])
      ? data["error-codes"]
      : ["verification-failed"];
    console.error("request-resource-download: Turnstile siteverify failed", {
      errorCodes: codes,
      httpStatus: resp.status,
    });
    return { ok: false, errorCodes: codes };
  } catch {
    return { ok: false, errorCodes: ["turnstile-request-failed"] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!turnstileSecret) {
      console.error(
        "request-resource-download: TURNSTILE_SECRET_KEY is not set; refusing unverified download",
      );
      return json(
        {
          error: "Server misconfiguration",
          code: "turnstile_secret_missing",
          hint: "Set TURNSTILE_SECRET_KEY on the Edge Function (Supabase Dashboard → Edge Functions → Secrets).",
        },
        503,
      );
    }

    const body = await req.json();
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const token = body?.token ?? null;
    const resourceId = typeof body?.resourceId === "string" ? body.resourceId.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    const email = emailRaw.trim();
    if (!email || !isValidEmail(email)) {
      return json({ error: "A valid email is required", code: "email_invalid" }, 400);
    }
    if (!resourceId && !slug) {
      return json({ error: "resourceId or slug is required", code: "resource_missing" }, 400);
    }
    if (!token) {
      return json({ error: "Turnstile token required", code: "turnstile_token_missing" }, 400);
    }

    const turnstileResult = await verifyTurnstile(token, clientIpFromRequest(req));
    if (!turnstileResult.ok) {
      return json(
        {
          error: "Turnstile verification failed",
          code: "turnstile_failed",
          errorCodes: turnstileResult.errorCodes,
          hint:
            "Check Cloudflare Turnstile widget hostnames include this origin, and TURNSTILE_SECRET_KEY matches the widget’s site key.",
        },
        400,
      );
    }

    let query = supabase
      .from("resources")
      .select("id, title, slug, storage_path, published")
      .eq("published", true)
      .limit(1);

    query = resourceId ? query.eq("id", resourceId) : query.eq("slug", slug);

    const { data: resource, error: resourceError } = await query.maybeSingle();
    if (resourceError) {
      console.error("request-resource-download: resource lookup failed", resourceError);
      return json({ error: "Unable to load resource", code: "resource_lookup_failed" }, 500);
    }
    if (!resource) {
      return json({ error: "Resource not found", code: "resource_not_found" }, 404);
    }

    const storagePath = String(resource.storage_path || "").trim();
    if (!storagePath) {
      return json({ error: "Resource file missing", code: "storage_path_missing" }, 500);
    }

    const { error: leadError } = await supabase.from("resource_leads").insert({
      resource_id: resource.id,
      email,
    });
    if (leadError) {
      console.error("request-resource-download: lead insert failed", leadError);
      return json({ error: "Unable to save email", code: "lead_insert_failed" }, 500);
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      console.error("request-resource-download: signed URL failed", signedError);
      return json(
        {
          error: "Unable to create download link",
          code: "signed_url_failed",
          hint: "Confirm the PDF exists at resources.storage_path inside the resource-downloads bucket.",
        },
        500,
      );
    }

    return json({
      ok: true,
      downloadUrl: signed.signedUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      title: resource.title,
      slug: resource.slug,
    });
  } catch (err) {
    console.error("request-resource-download error", err);
    return json({ error: "Server error" }, 500);
  }
});
