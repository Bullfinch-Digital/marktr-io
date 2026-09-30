// Supabase Edge Function: capture-onboarding-lead
// - Captures onboarding emails (with Cloudflare Turnstile verification for anon)
// - Supports "convert" intent for authenticated users (mark has_account=true)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import {
  clientIpFromRequest,
  turnstileRejectCode,
  TURNSTILE_REJECT_STATUS,
  verifyTurnstile,
} from "../_shared/verifyTurnstile.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const emailRaw = body?.email ?? "";
    const intent = body?.intent === "convert" ? "convert" : "capture";
    // Client canonical field is `token` (see leadCapture.ts). Accept turnstileToken as a fallback only.
    const token = body?.token ?? body?.turnstileToken ?? null;
    const userIdFromBody = body?.userId ?? null;
    const metadata = body?.metadata ?? null;
    const source = body?.source ?? "onboarding";
    const nameRaw = body?.name ?? null;

    const email = (emailRaw as string).trim();
    if (!email) return json({ error: "Email is required" }, 400);
    let userId: string | null = null;

    if (intent === "convert") {
      // Require authenticated user; no Turnstile needed
      const authHeader = req.headers.get("Authorization") || "";
      const tokenParts = authHeader.split(" ");
      const accessToken = tokenParts.length === 2 ? tokenParts[1] : null;

      if (!accessToken) return json({ error: "Unauthorized" }, 401);

      const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

      userId = userData.user.id;
      // If caller provided a userId, ensure it matches
      if (userIdFromBody && userIdFromBody !== userId) {
        return json({ error: "User mismatch" }, 403);
      }
    } else {
      // capture intent: require Turnstile (site token + server secret). Fail closed (403).
      const turnstileResult = await verifyTurnstile(token, clientIpFromRequest(req));
      if (!turnstileResult.ok) {
        return json(
          {
            error: "Turnstile verification failed",
            code: turnstileRejectCode(turnstileResult.errorCodes),
            errorCodes: turnstileResult.errorCodes,
            hint:
              "Check Cloudflare Turnstile widget hostnames include this origin, and TURNSTILE_SECRET_KEY matches the widget’s site key.",
          },
          TURNSTILE_REJECT_STATUS,
        );
      }
      userId = userIdFromBody; // optional for capture
    }

    const now = new Date().toISOString();
    const payload: any = {
      email,
      source,
      last_seen_at: now,
      updated_at: now,
      metadata,
    };

    if (typeof nameRaw === "string" && nameRaw.trim().length) {
      payload.name = nameRaw.trim();
    }

    if (userId) {
      payload.user_id = userId;
    }

    if (intent === "convert") {
      payload.has_account = true;
      payload.converted_at = now;
    }

    const { error } = await supabase
      .from("onboarding_leads")
      .upsert(payload, { onConflict: "email_normalized" });

    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    console.error("capture-onboarding-lead error", err);
    return json({ error: "Server error" }, 500);
  }
});
