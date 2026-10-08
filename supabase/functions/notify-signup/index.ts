// Called by a Database Webhook on auth.users INSERT/UPDATE (dashboard config).
// Best-effort admin notice. Never throws to the webhook.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import {
  createDefaultAdminNotifier,
  parseAuthUserWebhook,
  shouldNotifySignup,
  signupMethodFromAuthRecord,
  firstTouchSourceFromUnknown,
  normaliseNotifyEmail,
} from "../_shared/adminNotify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") || "";
  const parts = header.split(" ");
  return parts.length === 2 ? parts[1].trim() : "";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!serviceRole || !supabaseUrl) return json({ ok: true, skipped: "missing_env" });
    if (!timingSafeEqual(bearerToken(req), serviceRole)) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const record = parseAuthUserWebhook(body);
    if (!record || !shouldNotifySignup(record)) return json({ ok: true, skipped: "not_a_signup" });

    const email = normaliseNotifyEmail(record.email ?? undefined);
    const supabase = createClient(supabaseUrl, serviceRole);
    const notifier = createDefaultAdminNotifier(supabase);
    const method = signupMethodFromAuthRecord(record);
    const beta =
      record.raw_user_meta_data?.beta_user === true || record.user_metadata?.beta_user === true;

    const [{ data: guest }, { data: health }, { data: onboarding }] = await Promise.all([
      supabase.from("guest_checkouts").select("guest_ref").ilike("email", email).limit(1).maybeSingle(),
      supabase.from("health_check_reports").select("id").ilike("lead_email", email).limit(1).maybeSingle(),
      supabase
        .from("onboarding_leads")
        .select("source, metadata")
        .eq("email_normalized", email)
        .maybeSingle(),
    ]);

    const firstTouch =
      firstTouchSourceFromUnknown(onboarding?.metadata) ??
      firstTouchSourceFromUnknown((body as { record?: { raw_user_meta_data?: unknown } })?.record?.raw_user_meta_data);

    const time = record.created_at || new Date().toISOString();
    await notifier.notifyAdmin({
      type: "signup",
      dedupeKey: `signup:${record.id}`,
      subject: `Sign-up: ${email} (${method})`,
      email,
      replyTo: email,
      lines: [
        `Email: ${email}`,
        `Method: ${method}`,
        `Time: ${time}`,
        `User id: ${record.id}`,
        `Beta invite: ${beta ? "yes" : "no"}`,
        `Guest checkout: ${guest?.guest_ref ? "yes" : "no"}`,
        `Health-check lead: ${health?.id ? "yes" : "no"}`,
        `Onboarding source: ${typeof onboarding?.source === "string" && onboarding.source.trim() ? onboarding.source : "—"}`,
        `First-touch source: ${firstTouch || "—"}`,
      ],
    });

    return json({ ok: true });
  } catch (err) {
    console.error("notify-signup failed", err instanceof Error ? err.name : "error");
    return json({ ok: true, skipped: "caught" });
  }
});
