// Supabase Edge Function: capture-newsletter-signup
// - Verifies Cloudflare Turnstile (same pattern as capture-onboarding-lead)
// - Upserts into newsletter_signups on email_normalized

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import {
  createDefaultAdminNotifier,
  emailHasExistingAccount,
  functionLogsUrl,
  scheduleAdminNotify,
  shouldNotifyNewLead,
} from "../_shared/adminNotify.ts";
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function notifyCaptureError(code: string) {
  const notifier = createDefaultAdminNotifier(supabase);
  scheduleAdminNotify(
    notifier.notifyAdmin({
      type: "error",
      dedupeKey: `error:capture-newsletter-signup:${code}:${Date.now()}`,
      subject: "Error: capture-newsletter-signup",
      lines: [
        "Function: capture-newsletter-signup",
        `Error: ${code}`,
        `Logs: ${functionLogsUrl("capture-newsletter-signup", supabaseUrl)}`,
      ],
    }),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
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

    const turnstileResult = await verifyTurnstile(token, clientIpFromRequest(req));
    if (!turnstileResult.ok) {
      return json(
        {
          error: "Turnstile verification failed",
          code: turnstileRejectCode(turnstileResult.errorCodes),
          errorCodes: turnstileResult.errorCodes,
        },
        TURNSTILE_REJECT_STATUS,
      );
    }

    const now = new Date().toISOString();
    const emailNormalized = email.trim().toLowerCase();
    const { data: existing } = await supabase
      .from("newsletter_signups")
      .select("id")
      .eq("email_normalized", emailNormalized)
      .maybeSingle();

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
      notifyCaptureError("signup_failed");
      return json({ error: "Unable to save signup", code: "signup_failed" }, 500);
    }

    const hasAccount = await emailHasExistingAccount(supabase, email);
    if (shouldNotifyNewLead({ isNewRow: !existing, hasExistingAccount: hasAccount })) {
      const notifier = createDefaultAdminNotifier(supabase);
      scheduleAdminNotify(
        notifier.notifyAdmin({
          type: "lead",
          dedupeKey: `lead:newsletter:${emailNormalized}`,
          subject: `Lead: newsletter (${source})`,
          email,
          replyTo: email,
          lines: [
            `Email: ${email}`,
            `Source: ${source}`,
            `Time: ${now}`,
            "Marketing opt-in: —",
          ],
        }),
      );
    }

    return json({ ok: true });
  } catch (err) {
    console.error("capture-newsletter-signup error", err);
    notifyCaptureError("server_error");
    return json({ error: "Server error" }, 500);
  }
});
