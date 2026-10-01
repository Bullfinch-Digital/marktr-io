import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import {
  decideCapture,
  emailContactUrl,
  emailMarktrUrl,
  isReportLeadOrigin,
  isReportLeadTurnstileHost,
  reportPageUrl,
} from "../_shared/reportLeadCapture.ts";
import {
  bullfinchScoreEmailCopy,
  domainFromUrl,
  renderInternalLeadEmail,
  renderVisitorScoreEmail,
  socialHandlesMissing,
  type BfEmailRoute,
} from "../_shared/reportLeadEmail.ts";
import { createGmailSender, readGmailEnv } from "../_shared/sendEmail.ts";
import {
  clientIpFromRequest,
  TURNSTILE_REJECT_STATUS,
  verifyTurnstile,
} from "../_shared/verifyTurnstile.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);
const gmail = createGmailSender({ env: readGmailEnv() });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const JON = "hello@bullfinchdigital.com";

function asRoute(value: unknown): BfEmailRoute | null {
  return value === "talk" || value === "polish" || value === "diy" ? value : null;
}

function utmRecord(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return Object.keys(out).length ? out : null;
}

function scoreNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const origin = req.headers.get("origin") || req.headers.get("Origin");
    const publicToken = typeof body?.publicToken === "string" ? body.publicToken.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const businessName =
      typeof body?.businessName === "string" ? body.businessName.trim().slice(0, 120) : "";
    const marketingOptIn = body?.marketingOptIn === true;

    const turnstile = await verifyTurnstile(body?.turnstileToken, clientIpFromRequest(req), {
      allowedHostname: isReportLeadTurnstileHost,
    });

    if (!isReportLeadOrigin(origin)) return json({ error: "origin_not_allowed" }, 403);
    if (!turnstile.ok) return json({ error: "turnstile_failed" }, TURNSTILE_REJECT_STATUS);
    if (!publicToken) return json({ error: "not_found" }, 404);

    const { data: row, error: readError } = await supabase
      .from("health_check_reports")
      .select(
        "public_token,url,overall,website_score,brand_story_score,content_score,social_score,bf_route,scores,utm,lead_email,lead_first_name,lead_business,marketing_opt_in,lead_captured_at,email_sent_at",
      )
      .eq("public_token", publicToken)
      .maybeSingle();

    if (readError) {
      console.error("capture-report-lead read failed");
      return json({ error: "server_error" }, 500);
    }

    const decision = decideCapture({
      originAllowed: isReportLeadOrigin(origin),
      turnstileOk: turnstile.ok,
      email,
      reportFound: Boolean(row),
      leadEmail: row?.lead_email ?? null,
      emailSentAt: row?.email_sent_at ?? null,
      nowMs: Date.now(),
    });

    if (!decision.ok) {
      const status = decision.error === "turnstile_failed" ? TURNSTILE_REJECT_STATUS : decision.status;
      return json({ error: decision.error }, status);
    }
    if (!decision.send || !row) return json({ ok: true });

    const scores = row.scores as { inputs?: { instagramHandle?: string; facebookUrl?: string } } | null;
    const socialNotChecked = socialHandlesMissing(scores?.inputs);
    const route = asRoute(row.bf_route);
    const domain = domainFromUrl(row.url);
    const reportUrl = reportPageUrl(origin, row.public_token);
    const contactUrl = emailContactUrl(row.url, row.public_token, route ?? "talk");
    const emailCopy = bullfinchScoreEmailCopy;
    const visitor = renderVisitorScoreEmail(emailCopy, {
      firstName: row.lead_first_name || firstName,
      domain,
      overall: scoreNumber(row.overall),
      website: scoreNumber(row.website_score),
      brandStory: scoreNumber(row.brand_story_score),
      social: scoreNumber(row.social_score),
      content: scoreNumber(row.content_score),
      socialNotChecked,
      route,
      reportUrl,
      contactUrl,
      marktrUrl: emailMarktrUrl(),
    });
    const internal = renderInternalLeadEmail(emailCopy, {
      firstName: firstName || row.lead_first_name,
      domain,
      overall: scoreNumber(row.overall),
      website: scoreNumber(row.website_score),
      brandStory: scoreNumber(row.brand_story_score),
      social: scoreNumber(row.social_score),
      content: scoreNumber(row.content_score),
      socialNotChecked,
      route,
      reportUrl,
      contactUrl,
      marktrUrl: emailMarktrUrl(),
      businessName: row.lead_business || businessName,
      websiteUrl: row.url,
      email: row.lead_email || email,
      marketingOptIn: row.lead_email != null ? row.marketing_opt_in === true : marketingOptIn,
      utm: utmRecord(row.utm),
    });

    const visitorSend = await gmail.send({ to: row.lead_email || email, ...visitor });
    if (!visitorSend.ok) return json({ error: visitorSend.error }, 502);
    const internalSend = await gmail.send({
      to: JON,
      replyTo: row.lead_email || email,
      ...internal,
    });
    if (!internalSend.ok) return json({ error: internalSend.error }, 502);

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { email_sent_at: nowIso };
    if (decision.setLead) {
      patch.lead_email = email;
      patch.lead_first_name = firstName || null;
      patch.lead_business = businessName || null;
      patch.marketing_opt_in = marketingOptIn;
      patch.marketing_consent = marketingOptIn;
      patch.consent_at = nowIso;
      patch.lead_captured_at = nowIso;
    }

    const { error: writeError } = await supabase
      .from("health_check_reports")
      .update(patch)
      .eq("public_token", publicToken);
    if (writeError) {
      console.error("capture-report-lead write failed");
      return json({ error: "server_error" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("capture-report-lead failed", err instanceof Error ? err.name : "error");
    return json({ error: "server_error" }, 500);
  }
});
