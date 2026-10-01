import {
  BULLFINCH_CHECK_HOST,
  isTeamVercelPreviewHost,
} from "./bullfinchHosts.ts";

export const SEND_WINDOW_MS = 60 * 60 * 1000;
export const SENDS_PER_REPORT_PER_HOUR = 3;
export const SENDS_PER_IP_PER_HOUR = 10;

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

export function storedBusinessName(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 120) : null;
}

/** Name on the report, or the domain when the scan stored nothing. */
export function businessDisplayName(stored: string | null | undefined, domain: string): string {
  return storedBusinessName(stored) || domain;
}

export type CaptureInternal = "full" | "resend" | "none";

export type CaptureDecision =
  | { ok: false; status: number; error: string }
  | { ok: true; send: true; setLead: boolean; internal: CaptureInternal };

export function decideCapture(opts: {
  originAllowed: boolean;
  turnstileOk: boolean;
  email: string;
  reportFound: boolean;
  leadEmail: string | null;
  recentReportSends: number;
  recentIpSends: number;
}): CaptureDecision {
  if (!opts.originAllowed) return { ok: false, status: 403, error: "origin_not_allowed" };
  if (!opts.turnstileOk) return { ok: false, status: 403, error: "turnstile_failed" };
  if (!opts.reportFound) return { ok: false, status: 404, error: "not_found" };
  if (!isValidLeadEmail(opts.email)) return { ok: false, status: 400, error: "email_invalid" };
  if (
    opts.recentReportSends >= SENDS_PER_REPORT_PER_HOUR ||
    opts.recentIpSends >= SENDS_PER_IP_PER_HOUR
  ) {
    return { ok: false, status: 429, error: "throttled" };
  }
  const entered = opts.email.trim().toLowerCase();
  const first = opts.leadEmail?.trim().toLowerCase() ?? "";
  if (!first) return { ok: true, send: true, setLead: true, internal: "full" };
  return {
    ok: true,
    send: true,
    setLead: false,
    internal: first === entered ? "none" : "resend",
  };
}

/** Throttle is `{ ok: false, code: "throttled" }`. Other failures stay `{ error }`. */
export function captureFailureBody(error: string): { ok: false; code: "throttled" } | { error: string } {
  if (error === "throttled") return { ok: false, code: "throttled" };
  return { error };
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
