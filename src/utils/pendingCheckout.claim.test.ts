import { afterEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_CLAIM_TTL_MS,
  claimResumablePendingCheckout,
  clearPendingCheckoutPlan,
  getCheckoutTabId,
  getResumablePendingCheckoutPlan,
  otherTabHoldsFreshCheckoutClaim,
  setPendingCheckoutPlan,
  thisTabOwnsFreshClaim,
  trialConfirmRedirectUrl,
} from "./pendingCheckout";

const PLAN_KEY = "marktr_pending_checkout_plan";
const INTENT_KEY = "marktr_checkout_resume_intent";
const CLAIM_KEY = "marktr_pending_checkout_claim";

function storedIntentId(): string {
  const raw = localStorage.getItem(PLAN_KEY);
  if (!raw) throw new Error("missing pending plan");
  return (JSON.parse(raw) as { intentId: string }).intentId;
}

afterEach(() => {
  clearPendingCheckoutPlan();
  localStorage.removeItem(CLAIM_KEY);
  sessionStorage.clear();
});

describe("pending checkout claim", () => {
  it("gives the plan to one tab and blocks the other until the claim expires", async () => {
    setPendingCheckoutPlan("annual");
    const intentId = storedIntentId();

    const won = await claimResumablePendingCheckout();
    expect(won).toBe("annual");
    expect(thisTabOwnsFreshClaim()).toBe(true);

    localStorage.setItem(
      CLAIM_KEY,
      JSON.stringify({ tabId: "other-tab", intentId, claimedAt: Date.now() })
    );
    expect(otherTabHoldsFreshCheckoutClaim()).toBe(true);
    expect(await claimResumablePendingCheckout()).toBeNull();

    localStorage.setItem(
      CLAIM_KEY,
      JSON.stringify({
        tabId: "other-tab",
        intentId,
        claimedAt: Date.now() - CHECKOUT_CLAIM_TTL_MS - 1,
      })
    );
    expect(await claimResumablePendingCheckout()).toBe("annual");
    expect(getCheckoutTabId()).not.toBe("other-tab");
  });

  it("lets a takeover replace a fresh claim, and a later write cancels the first", async () => {
    setPendingCheckoutPlan("annual");
    const intentId = storedIntentId();
    localStorage.setItem(
      CLAIM_KEY,
      JSON.stringify({ tabId: "other-tab", intentId, claimedAt: Date.now() })
    );

    const taken = await claimResumablePendingCheckout(null, { takeover: true });
    expect(taken).toBe("annual");
    expect(thisTabOwnsFreshClaim()).toBe(true);

    const racing = claimResumablePendingCheckout(null, { takeover: true });
    await new Promise((resolve) => setTimeout(resolve, 10));
    localStorage.setItem(
      CLAIM_KEY,
      JSON.stringify({ tabId: "other-tab", intentId, claimedAt: Date.now() })
    );
    expect(await racing).toBeNull();
    expect(thisTabOwnsFreshClaim()).toBe(false);
  });

  it("reads intent=trial from the callback URL and ignores sessionStorage", async () => {
    expect(trialConfirmRedirectUrl("https://www.marktr.io", "monthly")).toBe(
      "https://www.marktr.io/auth/callback?intent=trial&plan=monthly"
    );
    sessionStorage.setItem(
      PLAN_KEY,
      JSON.stringify({ plan: "monthly", intentId: "session-only", createdAt: Date.now() })
    );
    sessionStorage.setItem(INTENT_KEY, "session-only");

    expect(
      getResumablePendingCheckoutPlan("?intent=trial&plan=annual", { storage: "local" })
    ).toBe("annual");
    expect(await claimResumablePendingCheckout("?intent=trial&plan=annual", { storage: "local" })).toBe(
      "annual"
    );
  });

  it("falls back to localStorage and not sessionStorage", () => {
    sessionStorage.setItem(
      PLAN_KEY,
      JSON.stringify({ plan: "monthly", intentId: "session-only", createdAt: Date.now() })
    );
    sessionStorage.setItem(INTENT_KEY, "session-only");
    localStorage.setItem(
      PLAN_KEY,
      JSON.stringify({ plan: "annual", intentId: "local-intent", createdAt: Date.now() })
    );
    localStorage.setItem(INTENT_KEY, "local-intent");

    expect(getResumablePendingCheckoutPlan(null, { storage: "local" })).toBe("annual");
  });
});
