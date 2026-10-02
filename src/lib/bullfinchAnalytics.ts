import { editionConfig } from "./editionConfig";
import { getEdition } from "./edition";
import { hasAnalyticsConsent } from "./cookieConsent";

export const BULLFINCH_GA4_ID = editionConfig.bullfinch.ga4Id;

const REPORT_PATH = /^\/r\/[^/]+\/?$/;

export type BfCtaTarget = "contact" | "how_we_work" | "resources" | "marktr";
export type BfScanErrorCode = "turnstile" | "scan_failed" | "throttled";

type TrackParams = Record<string, string | number | boolean>;

const BLOCKED_PARAM_KEYS = new Set([
  "email",
  "name",
  "firstname",
  "first_name",
  "business",
  "businessname",
  "business_name",
  "website",
  "websiteurl",
  "website_url",
  "url",
  "token",
  "publictoken",
  "public_token",
  "page_path",
  "page_location",
]);

/** Report pages are sent as /r/ so the token never reaches Analytics. UTMs stay on the query. */
export function bullfinchPageView(url: {
  origin: string;
  pathname: string;
  search: string;
  hash: string;
}): { page_path: string; page_location: string } {
  if (!REPORT_PATH.test(url.pathname)) {
    const page_path = `${url.pathname}${url.search}${url.hash}`;
    return { page_path, page_location: `${url.origin}${page_path}` };
  }
  return {
    page_path: "/r/",
    page_location: `${url.origin}/r/${url.search}${url.hash}`,
  };
}

/** Vercel pageviews have no custom properties. Strip a Bullfinch report token from the URL. */
export function analyticsUrl(href: string): string {
  if (getEdition() !== "bullfinch") return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  return bullfinchPageView(url).page_location;
}

export function sanitizeEventParams(params: Record<string, unknown>): TrackParams {
  const out: TrackParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (BLOCKED_PARAM_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (trimmed.includes("@")) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (REPORT_PATH.test(trimmed) || trimmed.includes("/r/")) continue;
    out[key] = trimmed;
  }
  return out;
}

export function ctaTarget(href: string): BfCtaTarget | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "marktr.io") return "marktr";
  if (host !== "bullfinchdigital.com") return null;
  if (url.pathname.startsWith("/contact")) return "contact";
  if (url.pathname.startsWith("/resources")) return "resources";
  if (url.hash === "#system") return "how_we_work";
  return null;
}

export function scanErrorCode(
  status: number | undefined,
  data: { error?: unknown; code?: unknown } | null | undefined,
): BfScanErrorCode {
  const code = typeof data?.code === "string" ? data.code.toLowerCase() : "";
  const message = typeof data?.error === "string" ? data.error.toLowerCase() : "";
  if (status === 429 || code === "throttled") return "throttled";
  if (status === 403 || code.includes("turnstile") || message.includes("turnstile")) return "turnstile";
  return "scan_failed";
}

type GtagFn = (...args: unknown[]) => void;

function gtag(): GtagFn | undefined {
  return (window as Window & { gtag?: GtagFn }).gtag;
}

/** Bullfinch events only. Does nothing until analytics consent, and never on marktr. */
export function track(name: string, params: Record<string, unknown> = {}): void {
  if (getEdition() !== "bullfinch") return;
  if (!hasAnalyticsConsent()) return;
  const send = gtag();
  if (!send) return;
  send("event", name, {
    ...sanitizeEventParams(params),
    send_to: BULLFINCH_GA4_ID,
  });
}

/** Run now, and again if the visitor accepts analytics after the page has loaded. */
export function whenAnalyticsConsented(send: () => void): () => void {
  send();
  const onGrant = () => send();
  window.addEventListener("marktr:analytics-consent-granted", onGrant);
  return () => window.removeEventListener("marktr:analytics-consent-granted", onGrant);
}
