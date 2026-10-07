import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE_CONSENT_STORAGE_KEY } from "./cookieConsent";
import {
  captureFirstTouch,
  markHealthCompleted,
  markHealthStarted,
  maybeTrackHealthAbandon,
  sanitizeMarktrParams,
  scoreBand,
  track,
  trackOnceLoad,
} from "./analytics";

function grantAnalytics() {
  localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify({ essential: true, analytics: true, updatedAt: "2026-10-02T00:00:00.000Z" }),
  );
}

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete (window as Window & { gtag?: unknown }).gtag;
});

describe("marktr analytics", () => {
  it("maps score bands without exposing the raw score", () => {
    expect(scoreBand(12)).toBe("0-49");
    expect(scoreBand(50)).toBe("50-74");
    expect(scoreBand(75)).toBe("75-89");
    expect(scoreBand(90)).toBe("90-100");
  });

  it("strips PII and URLs from params", () => {
    const out = sanitizeMarktrParams("cta_click", {
      email: "ada@example.com",
      name: "Ada",
      cta_id: "hero_card_1",
      destination: "/health-check",
      website: "https://example.com",
      note: "hello@x.com",
    });
    expect(out).toEqual({
      cta_id: "hero_card_1",
      destination: "/health-check",
    });
  });

  it("is a no-op without consent or gtag", () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    track("cta_click", { cta_id: "x" });
    expect(gtag).not.toHaveBeenCalled();

    grantAnalytics();
    delete (window as Window & { gtag?: unknown }).gtag;
    expect(track("cta_click", { cta_id: "x" })).toBe(false);
  });

  it("is a no-op on /admin even with consent", () => {
    grantAnalytics();
    window.history.pushState({}, "", "/admin");
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    expect(track("cta_click", { cta_id: "x", email: "ada@example.com" })).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
    window.history.pushState({}, "", "/");
  });

  it("sends consented events to the marktr property", () => {
    grantAnalytics();
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    track("cta_click", { cta_id: "hero_card_1", location: "card_1" });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][0]).toBe("event");
    expect(gtag.mock.calls[0][1]).toBe("cta_click");
    expect(gtag.mock.calls[0][2]).toMatchObject({
      cta_id: "hero_card_1",
      location: "card_1",
      send_to: "G-0EFXQPEYY6",
    });
  });

  it("does not double-fire once-per-load events", () => {
    grantAnalytics();
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    trackOnceLoad("section:hero", "section_view", { section_id: "hero" });
    trackOnceLoad("section:hero", "section_view", { section_id: "hero" });
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("retries once-per-load events until they actually send", () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    expect(trackOnceLoad("section:cards", "section_view", { section_id: "cards" })).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
    grantAnalytics();
    expect(trackOnceLoad("section:cards", "section_view", { section_id: "cards" })).toBe(true);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("never throws if gtag throws", () => {
    grantAnalytics();
    (window as Window & { gtag?: () => void }).gtag = () => {
      throw new Error("gtag unavailable");
    };
    expect(() => track("cta_click", { cta_id: "x" })).not.toThrow();
  });

  it("allows page_view location URLs", () => {
    const out = sanitizeMarktrParams("page_view", {
      page_path: "/health-check",
      page_location: "https://www.marktr.io/health-check",
      edition: "marktr",
    });
    expect(out).toMatchObject({
      page_path: "/health-check",
      page_location: "https://www.marktr.io/health-check",
      edition: "marktr",
    });
  });

  it("captures first-touch source without overwriting", () => {
    window.history.pushState({}, "", "/?utm_source=google&utm_medium=cpc&utm_campaign=spring");
    const first = captureFirstTouch();
    expect(first.first_touch_source).toBe("google");
    window.history.pushState({}, "", "/?utm_source=later");
    const again = captureFirstTouch();
    expect(again.first_touch_source).toBe("google");
    window.history.pushState({}, "", "/");
  });

  it("fires health_check_abandon at most once per started attempt", () => {
    grantAnalytics();
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    markHealthStarted(2);
    expect(maybeTrackHealthAbandon()).toBe(true);
    expect(maybeTrackHealthAbandon()).toBe(false);
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("beforeunload"));
    expect(gtag.mock.calls.filter((c) => c[1] === "health_check_abandon")).toHaveLength(1);
  });

  it("does not fire health_check_abandon when never started or already completed", () => {
    grantAnalytics();
    const gtag = vi.fn();
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    expect(maybeTrackHealthAbandon()).toBe(false);
    markHealthStarted(1);
    markHealthCompleted();
    expect(maybeTrackHealthAbandon()).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });
});
