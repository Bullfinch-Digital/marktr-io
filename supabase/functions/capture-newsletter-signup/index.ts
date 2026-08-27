// Supabase Edge Function: capture-newsletter-signup
// - Verifies Cloudflare Turnstile (same pattern as capture-onboarding-lead)
// - Upserts into newsletter_signups on email_normalized

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

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
    console.error("capture-newsletter-signup: Turnstile siteverify failed", {
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
        "capture-newsletter-signup: TURNSTILE_SECRET_KEY is not set; refusing unverified signup",
      );
      return json(
        {
          error: "Server misconfiguration",
          code: "turnstile_secret_missing",
        },
        503,
      );
    }

    const body = await req.json();
    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const token = body?.token ?? null;
    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 64)
        : "footer";

    const email = emailRaw.trim();
    if (!email || !isValidEmail(email)) {
      return json({ error: "A valid email is required", code: "email_invalid" }, 400);
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
        },
        400,
      );
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("newsletter_signups").upsert(
      {
        email,
        source,
        updated_at: now,
      },
      { onConflict: "email_normalized" },
    );

    if (error) {
      console.error("capture-newsletter-signup: upsert failed", error);
      return json({ error: "Unable to save signup", code: "signup_failed" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("capture-newsletter-signup error", err);
    return json({ error: "Server error" }, 500);
  }
});
