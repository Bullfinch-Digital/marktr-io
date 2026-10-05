import { editionConfig } from "./editionConfig";
import { getEdition } from "./edition";
import { hasAnalyticsConsent } from "./cookieConsent";

export const BULLFINCH_GA4_ID = editionConfig.bullfinch.ga4Id;

const REPORT_PATH = /^\/r\/[^/]+\/?$/;

export type BfCtaTarget = "contact" | "how_we_work" | "resources" | "marktr" | "spotlight";
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

/** Replace a /r/{token} path in a page URL or referrer. Query string is kept. */
export function stripReportToken(href: string): string {
  if (!href) return "";
  try {
    const url = new URL(href);
    return bullfinchPageView(url).page_location;
  } catch {
    return href.replace(/\/r\/[^/?#]+/g, "/r/");
  }
}

const SCAN_SEEN_PREFIX = "bf_scan_seen:";

/** scan only the first time this report is opened from a scan. Refresh and email links are link. */
export function reportArrivalSource(token: string, fromScan: boolean): "scan" | "link" {
  if (!fromScan || !token) return "link";
  try {
    if (sessionStorage.getItem(SCAN_SEEN_PREFIX + token) === "1") return "link";
  } catch {
    return "scan";
  }
  return "scan";
}

function markScanReportSeen(token: string): void {
  try {
    sessionStorage.setItem(SCAN_SEEN_PREFIX + token, "1");
  } catch {
    /* sessionStorage can throw in private mode; the events already fired. */
  }
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

/** Hit-level dl/dr. Must run before every Bullfinch event so the token never leaves the browser. */
export function setBullfinchGaLocation(): void {
  if (getEdition() !== "bullfinch") return;
  const send = gtag();
  if (!send) return;
  const view = bullfinchPageView(window.location);
  send("set", {
    page_location: view.page_location,
    page_referrer: stripReportToken(document.referrer),
  });
}

/** Bullfinch events only. Does nothing until analytics consent, and never on marktr. */
export function track(
  name: string,
  params: Record<string, unknown> = {},
  options?: { beacon?: boolean },
): boolean {
  if (getEdition() !== "bullfinch") return false;
  if (!hasAnalyticsConsent()) return false;
  const send = gtag();
  if (!send) return false;
  setBullfinchGaLocation();
  send("event", name, {
    ...sanitizeEventParams(params),
    ...(options?.beacon ? { transport_type: "beacon" } : {}),
    send_to: BULLFINCH_GA4_ID,
  });
  return true;
}

/** Sets the hit location first, then sends one page_view. marktr does not use this. */
export function trackBullfinchPageView(input: {
  measurementId: string;
  title: string;
}): boolean {
  if (getEdition() !== "bullfinch") return false;
  if (!hasAnalyticsConsent()) return false;
  const send = gtag();
  if (!send) return false;
  setBullfinchGaLocation();
  const view = bullfinchPageView(window.location);
  send("event", "page_view", {
    send_to: input.measurementId,
    page_title: input.title,
    page_location: view.page_location,
    page_path: view.page_path,
    edition: "bullfinch",
  });
  return true;
}

/** First open after a scan is source scan plus a completion. Later loads of that token are link only. */
export function trackReportArrival(input: {
  token: string;
  fromScan: boolean;
  overall: number;
  route: string | null;
  hasSocial: boolean;
}): void {
  const source = reportArrivalSource(input.token, input.fromScan);
  const sent = track("bf_report_view", { source });
  if (source === "scan" && input.route) {
    track("bf_check_complete", {
      overall: input.overall,
      route: input.route,
      has_social: input.hasSocial,
    });
  }
  if (source === "scan" && sent) markScanReportSeen(input.token);
}

/** Run now, and again if the visitor accepts analytics after the page has loaded. */
export function whenAnalyticsConsented(send: () => void): () => void {
  send();
  const onGrant = () => send();
  window.addEventListener("marktr:analytics-consent-granted", onGrant);
  return () => window.removeEventListener("marktr:analytics-consent-granted", onGrant);
}
