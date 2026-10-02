import { afterEach, describe, expect, it, vi } from "vitest";
import { editionConfig } from "./editionConfig";
import { COOKIE_CONSENT_STORAGE_KEY, ga4ConfigFields, initCookieConsent, saveCookieConsent } from "./cookieConsent";
import {
  analyticsUrl,
  bullfinchPageView,
  ctaTarget,
  sanitizeEventParams,
  scanErrorCode,
  track,
} from "./bullfinchAnalytics";

const BULLFINCH_ID = editionConfig.bullfinch.ga4Id;
const MARKTR_ID = editionConfig.marktr.ga4Id;

function setPath(path: string) {
  window.history.pushState({}, "", path);
}

function grantAnalytics() {
  localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify({ essential: true, analytics: true, updatedAt: "2026-10-02T00:00:00.000Z" }),
  );
}

afterEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((node) => node.remove());
  delete (window as Window & { gtag?: unknown; dataLayer?: unknown }).gtag;
  delete (window as Window & { dataLayer?: unknown }).dataLayer;
  setPath("/");
});

describe("bullfinch analytics", () => {
  it("does nothing until analytics consent, then sends only the Bullfinch property", () => {
    setPath("/?edition=bullfinch");
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;

    track("bf_check_start", { has_social: false });
    expect(gtag).not.toHaveBeenCalled();

    grantAnalytics();
    track("bf_check_start", { has_social: true, email: "ada@example.com", website: "https://example.com" });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0]).toEqual([
      "event",
      "bf_check_start",
      { has_social: true, send_to: BULLFINCH_ID },
    ]);
  });

  it("does not send Bullfinch events on marktr", () => {
    setPath("/");
    grantAnalytics();
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    track("bf_report_view", { source: "link" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends the named events with their params and drops personal data", () => {
    expect(sanitizeEventParams({
      route: "talk",
      marketing_opt_in: false,
      overall: 60,
      has_social: false,
      source: "scan",
      target: "contact",
      code: "turnstile",
      email: "ada@example.com",
      business_name: "Phase 5",
      url: "https://example.com",
      token: "secret-token",
      page_path: "/r/secret-token",
    })).toEqual({
      route: "talk",
      marketing_opt_in: false,
      overall: 60,
      has_social: false,
      source: "scan",
      target: "contact",
      code: "turnstile",
    });

    expect(scanErrorCode(403, { error: "Turnstile verification failed", code: "turnstile_failed" })).toBe(
      "turnstile",
    );
    expect(scanErrorCode(429, { code: "throttled" })).toBe("throttled");
    expect(scanErrorCode(500, { error: "Unhandled error" })).toBe("scan_failed");

    expect(ctaTarget("https://bullfinchdigital.com/contact/?website={url}&report={publicToken}")).toBe(
      "contact",
    );
    expect(ctaTarget("https://bullfinchdigital.com/#system")).toBe("how_we_work");
    expect(ctaTarget("https://bullfinchdigital.com/resources/")).toBe("resources");
    expect(ctaTarget("https://marktr.io/?utm_content=diy")).toBe("marktr");
  });

  it("strips the report token from the page path and keeps UTMs", () => {
    const view = bullfinchPageView(
      new URL("https://check.bullfinchdigital.com/r/secret-token?utm_campaign=phase5&utm_source=email"),
    );
    expect(view.page_path).toBe("/r/");
    expect(view.page_location).toBe(
      "https://check.bullfinchdigital.com/r/?utm_campaign=phase5&utm_source=email",
    );
    expect(view.page_location).not.toContain("secret-token");

    const home = bullfinchPageView(new URL("https://check.bullfinchdigital.com/?utm_campaign=phase5"));
    expect(home.page_path).toBe("/?utm_campaign=phase5");

    setPath("/");
    expect(analyticsUrl("https://marktr.io/r/secret-token")).toBe("https://marktr.io/r/secret-token");

    setPath("/?edition=bullfinch");
    expect(analyticsUrl("https://check.bullfinchdigital.com/r/secret-token?utm_source=email")).toBe(
      "https://check.bullfinchdigital.com/r/?utm_source=email",
    );
  });

  it("loads one GA4 property, and only after analytics consent", () => {
    setPath("/?edition=bullfinch");
    initCookieConsent();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    const defaults = (window as Window & { dataLayer?: unknown[][] }).dataLayer?.[0];
    expect(defaults?.[0]).toBe("consent");
    expect(defaults?.[1]).toBe("default");
    expect(defaults?.[2]).toMatchObject({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    saveCookieConsent(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();

    saveCookieConsent(true);
    const scripts = [...document.querySelectorAll('script[src*="googletagmanager"]')].map(
      (node) => (node as HTMLScriptElement).src,
    );
    expect(scripts.some((src) => src.includes(BULLFINCH_ID))).toBe(true);
    expect(scripts.some((src) => src.includes(MARKTR_ID))).toBe(false);
  });

  it("does not load a second property if the other is already on the page", () => {
    setPath("/?edition=bullfinch");
    const existing = document.createElement("script");
    existing.src = `https://www.googletagmanager.com/gtag/js?id=${MARKTR_ID}`;
    document.head.appendChild(existing);
    initCookieConsent();
    saveCookieConsent(true);
    const scripts = [...document.querySelectorAll('script[src*="googletagmanager"]')].map(
      (node) => (node as HTMLScriptElement).src,
    );
    expect(scripts.some((src) => src.includes(BULLFINCH_ID))).toBe(false);
    expect(scripts.filter((src) => src.includes(MARKTR_ID))).toHaveLength(1);
  });

  it("shares the Bullfinch cookie domain only on bullfinchdigital.com", () => {
    expect(ga4ConfigFields("marktr", "marktr.io")).toEqual({ send_page_view: false });
    expect(ga4ConfigFields("bullfinch", "check.bullfinchdigital.com")).toEqual({
      send_page_view: false,
      cookie_domain: "bullfinchdigital.com",
    });
    expect(
      ga4ConfigFields("bullfinch", "marktr-app-git-bullfinch-preview-bullfinch-digital.vercel.app"),
    ).toEqual({ send_page_view: false });
  });
});
