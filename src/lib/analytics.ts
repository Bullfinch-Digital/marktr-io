/**
 * Marktr GA4 helper. All marktr product events go through `track()`.
 * No-ops without consent, without gtag, on Bullfinch, or if anything throws.
 */
import { getEdition } from "./edition";
import { editionConfig } from "./editionConfig";
import { hasAnalyticsConsent } from "./cookieConsent";
import { captureLandingUtms, getStoredUtms } from "./utmCapture";

export const MARKTR_GA4_ID = editionConfig.marktr.ga4Id;

const FIRST_TOUCH_KEY = "marktr_first_touch_v1";
const AUTH_TRIGGER_KEY = "marktr_auth_trigger_v1";
const AUTH_EVENT_KEY = "marktr_auth_event_sent_v1";
const ONBOARD_PENDING_KEY = "marktr_onboarding_pending_v1";
const DASH_FIRST_PREFIX = "marktr_dashboard_first_";
const ONBOARD_PREFIX = "marktr_onboarding_complete_";
const FUNNEL_HEALTH_STARTED = "marktr_funnel_health_started";
const FUNNEL_HEALTH_COMPLETED = "marktr_funnel_health_completed";
const FUNNEL_HEALTH_LAST_STEP = "marktr_funnel_health_last_step";
const TRIAL_CLIENT_KEY = "marktr_trial_start_sent_v1";

const BLOCKED_PARAM_KEYS = new Set([
  "email",
  "name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "business",
  "businessname",
  "business_name",
  "brand",
  "brand_name",
  "website",
  "websiteurl",
  "website_url",
  "url",
  "token",
  "publictoken",
  "public_token",
  "answer",
  "answers",
]);

const PAGE_VIEW_ALLOWED = new Set(["page_path", "page_location", "page_title", "edition", "send_to"]);
const TESTIMONIAL_ALLOWED = new Set(["testimonial_id", "business"]);

type TrackParams = Record<string, string | number | boolean>;
type GtagFn = (...args: unknown[]) => void;

const onceThisLoad = new Set<string>();

function gtagFn(): GtagFn | undefined {
  return (window as Window & { gtag?: GtagFn }).gtag;
}

function safeStorage(
  area: "localStorage" | "sessionStorage",
  fn: (store: Storage) => void,
): void {
  try {
    fn(window[area]);
  } catch {
    /* private mode / quota */
  }
}

function readStorage(area: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[area].getItem(key);
  } catch {
    return null;
  }
}

export function scoreBand(score: number): "0-49" | "50-74" | "75-89" | "90-100" {
  if (score >= 90) return "90-100";
  if (score >= 75) return "75-89";
  if (score >= 50) return "50-74";
  return "0-49";
}

export function sanitizeMarktrParams(
  eventName: string,
  params: Record<string, unknown>,
): TrackParams {
  const out: TrackParams = {};
  for (const [rawKey, value] of Object.entries(params)) {
    if (Object.keys(out).length >= 25) break;
    const key = rawKey.slice(0, 40);
    if (!key) continue;
    const blocked = BLOCKED_PARAM_KEYS.has(key.toLowerCase());
    const pageViewOk = eventName === "page_view" && PAGE_VIEW_ALLOWED.has(key);
    const testimonialOk = eventName === "testimonial_video_play" && TESTIMONIAL_ALLOWED.has(key);
    if (blocked && !pageViewOk && !testimonialOk) continue;

    if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, 100);
    if (!trimmed) continue;
    if (trimmed.includes("@")) continue;
    if (/^https?:\/\//i.test(trimmed) && key !== "page_location") continue;
    out[key] = trimmed;
  }
  return out;
}

function eventNameOk(name: string): boolean {
  return /^[a-z][a-z0-9_]{0,39}$/.test(name);
}

/** Marktr product events. Never throws. */
export function track(name: string, params: Record<string, unknown> = {}): boolean {
  try {
    if (getEdition() !== "marktr") return false;
    if (!hasAnalyticsConsent()) return false;
    if (!eventNameOk(name)) return false;
    const send = gtagFn();
    if (!send) return false;
    const measurementId = MARKTR_GA4_ID;
    if (!measurementId) return false;
    send("event", name, {
      ...sanitizeMarktrParams(name, params),
      send_to: measurementId,
    });
    return true;
  } catch {
    return false;
  }
}

export function trackOnceLoad(key: string, name: string, params?: Record<string, unknown>): boolean {
  if (onceThisLoad.has(key)) return false;
  const sent = track(name, params);
  if (sent) onceThisLoad.add(key);
  return sent;
}

export function trackOnceSession(key: string, name: string, params?: Record<string, unknown>): boolean {
  if (readStorage("sessionStorage", key) === "1") return false;
  const sent = track(name, params);
  if (sent) safeStorage("sessionStorage", (s) => s.setItem(key, "1"));
  return sent;
}

export type FirstTouch = {
  first_touch_source?: string;
  first_touch_medium?: string;
  first_touch_campaign?: string;
};

function parseFirstTouch(): FirstTouch {
  const params = new URLSearchParams(window.location.search);
  const source =
    params.get("utm_source")?.trim() ||
    params.get("source")?.trim() ||
    params.get("ref")?.trim() ||
    undefined;
  const medium = params.get("utm_medium")?.trim() || undefined;
  const campaign = params.get("utm_campaign")?.trim() || undefined;
  const referrerHost = (() => {
    try {
      if (!document.referrer) return undefined;
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      const here = window.location.hostname.replace(/^www\./, "");
      if (!host || host === here) return undefined;
      return host.slice(0, 100);
    } catch {
      return undefined;
    }
  })();
  const out: FirstTouch = {};
  if (source) out.first_touch_source = source.slice(0, 100);
  else if (referrerHost) out.first_touch_source = referrerHost;
  if (medium) out.first_touch_medium = medium.slice(0, 100);
  else if (!source && referrerHost) out.first_touch_medium = "referral";
  if (campaign) out.first_touch_campaign = campaign.slice(0, 100);
  return out;
}

/** First-touch UTMs / source / ref / referrer. localStorage only after analytics consent. */
export function captureFirstTouch(): FirstTouch {
  try {
    captureLandingUtms();
    const existing =
      (hasAnalyticsConsent() ? readStorage("localStorage", FIRST_TOUCH_KEY) : null) ||
      readStorage("sessionStorage", FIRST_TOUCH_KEY);
    if (existing) return JSON.parse(existing) as FirstTouch;

    const fromUrl = parseFirstTouch();
    const utm = getStoredUtms();
    const merged: FirstTouch = {
      first_touch_source: fromUrl.first_touch_source || utm?.utm_source,
      first_touch_medium: fromUrl.first_touch_medium || utm?.utm_medium,
      first_touch_campaign: fromUrl.first_touch_campaign || utm?.utm_campaign,
    };
    const json = JSON.stringify(merged);
    safeStorage("sessionStorage", (s) => s.setItem(FIRST_TOUCH_KEY, json));
    if (hasAnalyticsConsent()) {
      safeStorage("localStorage", (s) => s.setItem(FIRST_TOUCH_KEY, json));
    }
    return merged;
  } catch {
    return {};
  }
}

export function getFirstTouchParams(): FirstTouch {
  try {
    const raw =
      (hasAnalyticsConsent() ? readStorage("localStorage", FIRST_TOUCH_KEY) : null) ||
      readStorage("sessionStorage", FIRST_TOUCH_KEY);
    if (raw) return JSON.parse(raw) as FirstTouch;
    return captureFirstTouch();
  } catch {
    return {};
  }
}

export function rememberAuthTrigger(trigger: string): void {
  safeStorage("sessionStorage", (s) => s.setItem(AUTH_TRIGGER_KEY, trigger.slice(0, 100)));
}

export function consumeAuthTrigger(fallback = "header"): string {
  const value = readStorage("sessionStorage", AUTH_TRIGGER_KEY) || fallback;
  safeStorage("sessionStorage", (s) => s.removeItem(AUTH_TRIGGER_KEY));
  return value;
}

export function peekAuthTrigger(fallback = "header"): string {
  return readStorage("sessionStorage", AUTH_TRIGGER_KEY) || fallback;
}

export function markHealthStarted(step = 1): void {
  safeStorage("sessionStorage", (s) => {
    s.setItem(FUNNEL_HEALTH_STARTED, "1");
    s.setItem(FUNNEL_HEALTH_LAST_STEP, String(step));
  });
}

export function markHealthStep(step: number): void {
  safeStorage("sessionStorage", (s) => s.setItem(FUNNEL_HEALTH_LAST_STEP, String(step)));
}

export function markHealthCompleted(): void {
  safeStorage("sessionStorage", (s) => s.setItem(FUNNEL_HEALTH_COMPLETED, "1"));
}

export function healthFunnelState(): { started: boolean; completed: boolean; lastStep: number } {
  return {
    started: readStorage("sessionStorage", FUNNEL_HEALTH_STARTED) === "1",
    completed: readStorage("sessionStorage", FUNNEL_HEALTH_COMPLETED) === "1",
    lastStep: Number(readStorage("sessionStorage", FUNNEL_HEALTH_LAST_STEP) || 0) || 0,
  };
}

export function setAnalyticsUserId(userId: string | null): void {
  try {
    if (getEdition() !== "marktr") return;
    if (!hasAnalyticsConsent()) return;
    const send = gtagFn();
    if (!send) return;
    send("set", { user_id: userId || undefined });
  } catch {
    /* never throw */
  }
}

export function setAnalyticsUserProperties(props: Record<string, string | number | boolean>): void {
  try {
    if (getEdition() !== "marktr") return;
    if (!hasAnalyticsConsent()) return;
    const send = gtagFn();
    if (!send) return;
    send("set", "user_properties", sanitizeMarktrParams("user_properties", props));
  } catch {
    /* never throw */
  }
}

export function maybeTrackAuth(user: {
  id: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }>;
}): void {
  try {
    if (!isRealUserId(user.id)) return;
    if (readStorage("sessionStorage", AUTH_EVENT_KEY) === "1") {
      setAnalyticsUserId(user.id);
      return;
    }
    const created = user.created_at ? Date.parse(user.created_at) : NaN;
    const last = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Date.now();
    const isNew = Number.isFinite(created) && Math.abs(last - created) < 10_000;
    const provider =
      user.app_metadata?.provider ||
      user.identities?.[0]?.provider ||
      user.app_metadata?.providers?.[0] ||
      "email";
    const method = provider === "google" ? "google" : "email";
    const firstTouch = getFirstTouchParams();
    if (isNew) {
      track("sign_up", { method, ...firstTouch });
      safeStorage("sessionStorage", (s) => s.setItem(ONBOARD_PENDING_KEY, "1"));
    } else {
      track("login", { method });
    }
    safeStorage("sessionStorage", (s) => s.setItem(AUTH_EVENT_KEY, "1"));
    setAnalyticsUserId(user.id);
  } catch {
    /* never throw */
  }
}

function isRealUserId(id: string): boolean {
  return Boolean(id) && id.length > 10;
}

export function maybeDashboardFirstView(user: { id: string; created_at?: string }): void {
  try {
    const flag = DASH_FIRST_PREFIX + user.id;
    if (readStorage("localStorage", flag) === "1") return;
    const created = user.created_at ? Date.parse(user.created_at) : NaN;
    const ageMs = Number.isFinite(created) ? Date.now() - created : 0;
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      safeStorage("localStorage", (s) => s.setItem(flag, "1"));
      return;
    }
    if (track("dashboard_first_view")) {
      safeStorage("localStorage", (s) => s.setItem(flag, "1"));
    }
  } catch {
    /* never throw */
  }
}

export function maybeOnboardingComplete(userId: string): void {
  try {
    const flag = ONBOARD_PREFIX + userId;
    if (readStorage("localStorage", flag) === "1") return;
    if (readStorage("sessionStorage", ONBOARD_PENDING_KEY) !== "1") return;
    if (track("onboarding_complete")) {
      safeStorage("localStorage", (s) => s.setItem(flag, "1"));
      safeStorage("sessionStorage", (s) => s.removeItem(ONBOARD_PENDING_KEY));
    }
  } catch {
    /* never throw */
  }
}

export function maybeClientTrialStart(plan = "annual"): void {
  trackOnceSession(TRIAL_CLIENT_KEY, "trial_start", { plan });
}

export function getGaClientId(): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      if (!hasAnalyticsConsent()) {
        done(null);
        return;
      }
      const send = gtagFn();
      if (!send || !MARKTR_GA4_ID) {
        done(null);
        return;
      }
      send("get", MARKTR_GA4_ID, "client_id", (id: unknown) => {
        done(typeof id === "string" && id ? id : null);
      });
      window.setTimeout(() => done(null), 1200);
    } catch {
      done(null);
    }
  });
}

function destinationFromEl(el: Element): string {
  const explicit = el.getAttribute("data-track-destination");
  if (explicit) return explicit.slice(0, 100);
  const href = el.getAttribute("href");
  if (href) {
    try {
      const url = new URL(href, window.location.origin);
      return `${url.pathname}${url.hash}`.slice(0, 100);
    } catch {
      return href.slice(0, 100);
    }
  }
  const nested = el.querySelector("a[href]");
  if (nested) return destinationFromEl(nested);
  return window.location.pathname.slice(0, 100);
}

function ctaTextFromEl(el: Element): string {
  const explicit = el.getAttribute("data-track-text");
  if (explicit) return explicit.slice(0, 100);
  const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
  return label.slice(0, 100);
}

function onDelegatedClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const el = target.closest("[data-track-id]");
  if (!el) return;
  const ctaId = el.getAttribute("data-track-id");
  if (!ctaId) return;
  track("cta_click", {
    cta_id: ctaId.slice(0, 40),
    cta_text: ctaTextFromEl(el),
    location: (el.getAttribute("data-track-location") || "unknown").slice(0, 40),
    destination: destinationFromEl(el),
  });
}

function observeOnce(
  selector: string,
  threshold: number,
  fire: (el: Element) => boolean | void,
): () => void {
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || seen.has(entry.target)) continue;
        const sent = fire(entry.target);
        if (sent === false) continue;
        seen.add(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { threshold },
  );
  const scan = () => {
    document.querySelectorAll(selector).forEach((el) => {
      if (!seen.has(el)) observer.observe(el);
    });
  };
  scan();
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("marktr:analytics-consent-granted", scan);
  return () => {
    observer.disconnect();
    mo.disconnect();
    window.removeEventListener("marktr:analytics-consent-granted", scan);
  };
}

function installScrollDepth(): () => void {
  const marks = [25, 50, 75, 90];
  const fired = new Set<number>();
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 0) return;
    const percent = (doc.scrollTop / scrollable) * 100;
    for (const mark of marks) {
      if (percent >= mark && !fired.has(mark)) {
        if (track("scroll_depth", { percent: mark })) fired.add(mark);
      }
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("marktr:analytics-consent-granted", onScroll);
  onScroll();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("marktr:analytics-consent-granted", onScroll);
  };
}

function installHealthAbandon(): () => void {
  const onHide = () => {
    const state = healthFunnelState();
    if (state.started && !state.completed) {
      track("health_check_abandon", { last_step: state.lastStep });
    }
  };
  window.addEventListener("pagehide", onHide);
  return () => window.removeEventListener("pagehide", onHide);
}

/** Homepage + site-wide declarative listeners. */
export function installMarktrAnalyticsListeners(): () => void {
  if (typeof window === "undefined") return () => {};
  captureFirstTouch();
  document.addEventListener("click", onDelegatedClick, true);
  const stopSections = observeOnce("[data-track-section]", 0.5, (el) => {
    const sectionId = el.getAttribute("data-track-section");
    if (!sectionId) return false;
    return trackOnceLoad(`section:${sectionId}`, "section_view", { section_id: sectionId });
  });
  const stopCases = observeOnce("[data-track-case-study]", 0.6, (el) => {
    const client = el.getAttribute("data-track-client") || el.getAttribute("data-track-case-study");
    if (!client) return false;
    return trackOnceLoad(`case:${client}`, "case_study_view", { client });
  });
  const stopScroll = installScrollDepth();
  const stopAbandon = installHealthAbandon();
  const onConsent = () => captureFirstTouch();
  window.addEventListener("marktr:analytics-consent-granted", onConsent);
  return () => {
    document.removeEventListener("click", onDelegatedClick, true);
    stopSections();
    stopCases();
    stopScroll();
    stopAbandon();
    window.removeEventListener("marktr:analytics-consent-granted", onConsent);
    onceThisLoad.clear();
  };
}
