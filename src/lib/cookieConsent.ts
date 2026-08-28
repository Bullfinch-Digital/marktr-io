/** UK PECR-aligned cookie consent (analytics opt-in). */

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

function loadGtagScript(): void {
  if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
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

  const saved = readCookieConsent();
  if (saved?.analytics) {
    enableAnalytics();
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

function enableAnalytics(): void {
  loadGtagScript();
  gtag()?.("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}
