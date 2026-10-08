// Supabase Edge Function: request-resource-download
// - Verifies Cloudflare Turnstile (mirrors capture-onboarding-lead)
// - Inserts into resource_leads
// - Returns a short-lived signed Storage URL (never public)

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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function notifyCaptureError(code: string) {
  const notifier = createDefaultAdminNotifier(supabase);
  scheduleAdminNotify(
    notifier.notifyAdmin({
      type: "error",
      dedupeKey: `error:request-resource-download:${code}:${Date.now()}`,
      subject: "Error: request-resource-download",
      lines: [
        "Function: request-resource-download",
        `Error: ${code}`,
        `Logs: ${functionLogsUrl("request-resource-download", supabaseUrl)}`,
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
    const resourceId = typeof body?.resourceId === "string" ? body.resourceId.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    const email = emailRaw.trim();
    if (!email || !isValidEmail(email)) {
      return json({ error: "A valid email is required", code: "email_invalid" }, 400);
    }
    if (!resourceId && !slug) {
      return json({ error: "resourceId or slug is required", code: "resource_missing" }, 400);
    }

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

    let query = supabase
      .from("resources")
      .select("id, title, slug, storage_path, published")
      .eq("published", true)
      .limit(1);

    query = resourceId ? query.eq("id", resourceId) : query.eq("slug", slug);

    const { data: resource, error: resourceError } = await query.maybeSingle();
    if (resourceError) {
      console.error("request-resource-download: resource lookup failed", resourceError);
      notifyCaptureError("resource_lookup_failed");
      return json({ error: "Unable to load resource", code: "resource_lookup_failed" }, 500);
    }
    if (!resource) {
      return json({ error: "Resource not found", code: "resource_not_found" }, 404);
    }

    const storagePath = String(resource.storage_path || "").trim();
    if (!storagePath) {
      notifyCaptureError("storage_path_missing");
      return json({ error: "Resource file missing", code: "storage_path_missing" }, 500);
    }

    const emailNormalized = email.trim().toLowerCase();
    const { data: existingLead } = await supabase
      .from("resource_leads")
      .select("id")
      .eq("resource_id", resource.id)
      .eq("email_normalized", emailNormalized)
      .limit(1)
      .maybeSingle();

    const { error: leadError } = await supabase.from("resource_leads").insert({
      resource_id: resource.id,
      email,
    });
    if (leadError) {
      console.error("request-resource-download: lead insert failed", leadError);
      notifyCaptureError("lead_insert_failed");
      return json({ error: "Unable to save email", code: "lead_insert_failed" }, 500);
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      console.error("request-resource-download: signed URL failed", signedError);
      notifyCaptureError("signed_url_failed");
      return json(
        {
          error: "Unable to create download link",
          code: "signed_url_failed",
          hint: "Confirm the PDF exists at resources.storage_path inside the resource-downloads bucket.",
        },
        500,
      );
    }

    const hasAccount = await emailHasExistingAccount(supabase, email);
    if (shouldNotifyNewLead({ isNewRow: !existingLead, hasExistingAccount: hasAccount })) {
      const notifier = createDefaultAdminNotifier(supabase);
      scheduleAdminNotify(
        notifier.notifyAdmin({
          type: "lead",
          dedupeKey: `lead:resource:${resource.id}:${emailNormalized}`,
          subject: `Lead: resource (${resource.slug})`,
          email,
          replyTo: email,
          lines: [
            `Email: ${email}`,
            `Source: resource-download`,
            `Resource id: ${resource.id}`,
            `Resource: ${resource.slug}`,
            `Time: ${new Date().toISOString()}`,
            "Marketing opt-in: —",
          ],
        }),
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
    notifyCaptureError("server_error");
    return json({ error: "Server error" }, 500);
  }
});
