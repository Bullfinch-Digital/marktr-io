import {
  BULLFINCH_CHECK_HOST,
  isTeamVercelPreviewHost,
} from "./bullfinchHosts.ts";

export const RESEND_WINDOW_MS = 10 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidLeadEmail(email: string): boolean {
  return email.length <= 320 && EMAIL_RE.test(email);
}

/** Production check host, or the Bullfinch Vercel preview pattern. Nothing else. */
export function isReportLeadOrigin(originHeader: string | null | undefined): boolean {
  if (!originHeader) return false;
  let url: URL;
  try {
    url = new URL(originHeader);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (host === BULLFINCH_CHECK_HOST) return true;
  return isTeamVercelPreviewHost(host);
}

export function isReportLeadTurnstileHost(hostname: string | null | undefined): boolean {
  if (!hostname || typeof hostname !== "string") return false;
  const host = hostname.trim().toLowerCase();
  if (host === BULLFINCH_CHECK_HOST) return true;
  return isTeamVercelPreviewHost(host);
}

export function shouldResendVisitorEmail(
  emailSentAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (!emailSentAt) return true;
  const sent = Date.parse(emailSentAt);
  if (Number.isNaN(sent)) return true;
  return nowMs - sent >= RESEND_WINDOW_MS;
}

export type CaptureDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; send: false }
  | { ok: true; send: true; setLead: boolean };

export function decideCapture(opts: {
  originAllowed: boolean;
  turnstileOk: boolean;
  email: string;
  reportFound: boolean;
  leadEmail: string | null;
  emailSentAt: string | null;
  nowMs: number;
}): CaptureDecision {
  if (!opts.originAllowed) return { ok: false, status: 403, error: "origin_not_allowed" };
  if (!opts.turnstileOk) return { ok: false, status: 403, error: "turnstile_failed" };
  if (!opts.reportFound) return { ok: false, status: 404, error: "not_found" };
  if (!isValidLeadEmail(opts.email)) return { ok: false, status: 400, error: "email_invalid" };
  if (!shouldResendVisitorEmail(opts.emailSentAt, opts.nowMs)) {
    return { ok: true, send: false };
  }
  return { ok: true, send: true, setLead: opts.leadEmail == null };
}

export function reportPageUrl(origin: string | null | undefined, publicToken: string): string {
  const token = encodeURIComponent(publicToken);
  let host = "";
  try {
    host = origin ? new URL(origin).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  if (host === BULLFINCH_CHECK_HOST) {
    return `https://check.bullfinchdigital.com/r/${token}`;
  }
  if (isTeamVercelPreviewHost(host) && origin) {
    const base = origin.replace(/\/$/, "");
    return `${base}/r/${token}?edition=bullfinch`;
  }
  return `https://check.bullfinchdigital.com/r/${token}`;
}

export function emailContactUrl(website: string, publicToken: string, route: string): string {
  const params = new URLSearchParams({
    website,
    report: publicToken,
    utm_source: "healthcheck",
    utm_medium: "email",
    utm_campaign: "bf-healthcheck",
    utm_content: route,
  });
  return `https://bullfinchdigital.com/contact/?${params.toString()}`;
}

export function emailMarktrUrl(): string {
  const params = new URLSearchParams({
    utm_source: "bullfinch",
    utm_medium: "email",
    utm_campaign: "bf-healthcheck",
    utm_content: "diy",
  });
  return `https://marktr.io/?${params.toString()}`;
}
