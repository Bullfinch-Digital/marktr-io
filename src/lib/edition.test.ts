import { describe, expect, it } from "vitest";
import {
  isAllowedBullfinchOrigin,
  isAllowedBullfinchTurnstileHostname,
  resolveEditionFromRequest,
} from "./edition";
import { applySiteverifyResult, TURNSTILE_REJECT_STATUS } from "../../supabase/functions/_shared/siteverifyResult.ts";

describe("edition origin rules", () => {
  it("accepts the Bullfinch check host", () => {
    expect(isAllowedBullfinchOrigin("https://check.bullfinchdigital.com")).toBe(
      true,
    );
    expect(
      resolveEditionFromRequest({
        requested: "bullfinch",
        origin: "https://check.bullfinchdigital.com",
      }),
    ).toBe("bullfinch");
  });

  it("accepts this team's Vercel preview hosts", () => {
    expect(
      isAllowedBullfinchOrigin(
        "https://marktr-app-git-fix-turnstile-fail-clos-5c55eb-bullfinch-digital.vercel.app",
      ),
    ).toBe(true);
    expect(
      isAllowedBullfinchOrigin(
        "https://marktr-rb86lsq5t-bullfinch-digital.vercel.app",
      ),
    ).toBe(true);
    expect(
      resolveEditionFromRequest({
        requested: "bullfinch",
        origin:
          "https://marktr-rb86lsq5t-bullfinch-digital.vercel.app",
      }),
    ).toBe("bullfinch");
  });

  it("treats a foreign *.vercel.app origin as marktr", () => {
    expect(
      isAllowedBullfinchOrigin("https://other-app-git-main-acme.vercel.app"),
    ).toBe(false);
    expect(
      resolveEditionFromRequest({
        requested: "bullfinch",
        origin: "https://other-app-git-main-acme.vercel.app",
      }),
    ).toBe("marktr");
  });

  it("rejects marktr production hosts even if bullfinch is requested", () => {
    expect(isAllowedBullfinchOrigin("https://www.marktr.io")).toBe(false);
    expect(
      resolveEditionFromRequest({
        requested: "bullfinch",
        origin: "https://marktr.io",
      }),
    ).toBe("marktr");
  });

  it("treats missing or junk origin as marktr", () => {
    expect(resolveEditionFromRequest({ requested: "bullfinch", origin: null })).toBe(
      "marktr",
    );
    expect(
      resolveEditionFromRequest({ requested: "bullfinch", origin: "not-a-url" }),
    ).toBe("marktr");
    expect(
      resolveEditionFromRequest({
        requested: "marktr",
        origin: "https://check.bullfinchdigital.com",
      }),
    ).toBe("marktr");
  });

  it("accepts localhost in non-prod", () => {
    expect(isAllowedBullfinchOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedBullfinchOrigin("http://127.0.0.1:5173")).toBe(true);
  });
});

describe("Bullfinch siteverify hostname", () => {
  it("accepts check.bullfinchdigital.com and team previews", () => {
    expect(isAllowedBullfinchTurnstileHostname("check.bullfinchdigital.com")).toBe(
      true,
    );
    expect(
      isAllowedBullfinchTurnstileHostname(
        "marktr-rb86lsq5t-bullfinch-digital.vercel.app",
      ),
    ).toBe(true);
  });

  it("rejects a hostname mismatch with 403", () => {
    const result = applySiteverifyResult(
      { success: true, hostname: "evil-app-git-main-acme.vercel.app" },
      isAllowedBullfinchTurnstileHostname,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCodes).toEqual(["hostname-mismatch"]);
    }
    expect(TURNSTILE_REJECT_STATUS).toBe(403);
  });

  it("does not treat success:false as a pass even with a good hostname", () => {
    const result = applySiteverifyResult(
      {
        success: false,
        hostname: "check.bullfinchdigital.com",
        "error-codes": ["invalid-input-response"],
      },
      isAllowedBullfinchTurnstileHostname,
    );
    expect(result.ok).toBe(false);
  });
});
