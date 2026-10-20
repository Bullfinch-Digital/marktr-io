import { afterEach, describe, expect, it } from "vitest";
import {
  clearPendingCheckoutPlan,
  getResumablePendingCheckoutPlan,
  hasSameTabCheckoutIntent,
  setPendingCheckoutPlan,
} from "./pendingCheckout";

const PLAN_KEY = "marktr_pending_checkout_plan";
const INTENT_KEY = "marktr_checkout_resume_intent";

afterEach(() => {
  clearPendingCheckoutPlan();
  sessionStorage.clear();
  localStorage.clear();
});

describe("same-tab pending checkout", () => {
  it("resumes a plan stored in this tab and ignores a localStorage-only copy", () => {
    setPendingCheckoutPlan("annual");
    expect(hasSameTabCheckoutIntent()).toBe(true);
    expect(getResumablePendingCheckoutPlan()).toBe("annual");

    sessionStorage.clear();
    localStorage.setItem(
      PLAN_KEY,
      JSON.stringify({ plan: "monthly", intentId: "other-tab", createdAt: Date.now() }),
    );
    localStorage.setItem(INTENT_KEY, "other-tab");

    expect(getResumablePendingCheckoutPlan()).toBeNull();
    expect(localStorage.getItem(PLAN_KEY)).toBeNull();
  });

  it("does not treat intent and plan query params as a checkout", () => {
    expect(getResumablePendingCheckoutPlan("?intent=trial&plan=monthly")).toBeNull();
  });

  it("still resumes resumeCheckout on an OAuth return path", () => {
    expect(getResumablePendingCheckoutPlan("/dashboard?resumeCheckout=annual")).toBe("annual");
  });
});
