/** UK PECR-aligned cookie consent (analytics opt-in). */

import { getEdition, type Edition } from "./edition";
import { editionConfig } from "./editionConfig";

export const COOKIE_CONSENT_STORAGE_KEY = "marktr_cookie_consent_v1";
export const GA_MEASUREMENT_ID = "G-0EFXQPEYY6";

export type CookieConsentChoice = {
  essential: true;
  analytics: boolean;
  updatedAt: string;
};

type GtagFn = (...args: unknown[]) => void;

function gtag(): GtagFn | undefined {
  return (window as Window & { gtag?: GtagFn }).gtag;
}

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentChoice;
    if (parsed?.essential !== true || typeof parsed.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCookieConsent(analytics: boolean): CookieConsentChoice {
  const choice: CookieConsentChoice = {
    essential: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(choice));
  applyAnalyticsConsent(analytics);
  if (analytics) {
    window.dispatchEvent(new Event("marktr:analytics-consent-granted"));
  }
  return choice;
}

function loadGtagScript(measurementId: string): void {
  if (!measurementId) return;
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) {
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

/** Call once on app boot — sets Consent Mode defaults before any tags fire. */
export function initCookieConsent(): void {
  const win = window as Window & { dataLayer?: unknown[]; gtag?: GtagFn };
  win.dataLayer = win.dataLayer || [];
  if (!gtag()) {
    win.gtag = function gtagShim(...args: unknown[]) {
      win.dataLayer?.push(args);
    };
  }
  gtag()?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  gtag()?.("js", new Date());

  // Re-declare Consent Mode from the saved preference — same path as Accept/Reject.
  // Previously we only called enableAnalytics() on restore, so analytics_storage stayed
  // "denied" for returning visitors who had already accepted.
  const saved = readCookieConsent();
  if (saved) {
    applyAnalyticsConsent(saved.analytics);
  }
}

export function applyAnalyticsConsent(granted: boolean): void {
  gtag()?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (granted) {
    enableAnalytics();
  }
}

export function usesSharedBullfinchCookieDomain(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === "bullfinchdigital.com" || host.endsWith(".bullfinchdigital.com");
}

/** marktr stays send_page_view off. Bullfinch shares cookies with bullfinchdigital.com. */
export function ga4ConfigFields(
  edition: Edition,
  hostname: string,
): { send_page_view: false; cookie_domain?: string } {
  if (edition === "bullfinch" && usesSharedBullfinchCookieDomain(hostname)) {
    return { send_page_view: false, cookie_domain: "bullfinchdigital.com" };
  }
  return { send_page_view: false };
}

function enableAnalytics(): void {
  const edition = getEdition();
  const measurementId = editionConfig[edition].ga4Id;
  if (!measurementId) return;
  const otherId =
    edition === "bullfinch" ? editionConfig.marktr.ga4Id : editionConfig.bullfinch.ga4Id;
  if (otherId && document.querySelector(`script[src*="id=${otherId}"]`)) return;
  loadGtagScript(measurementId);
  gtag()?.("config", measurementId, ga4ConfigFields(edition, window.location.hostname));
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}
