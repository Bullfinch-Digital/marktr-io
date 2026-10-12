import { describe, expect, it } from "vitest";
import {
  MARKTR_TRIAL_DAYS,
  MARKTR_TRIAL_REMINDER_DAYS_BEFORE,
  PRICING_SALES,
  formatPaywallDay,
  paywallFirstChargeAmount,
  paywallFirstChargeDate,
  paywallOfferPriceLine,
  paywallReminderDate,
} from "./marktrPricing";
import { getMarketingPage } from "./seo";

describe("pricing sales copy", () => {
  it("keeps the exact sales section and pairs £25 with annual billing", () => {
    expect(PRICING_SALES.pill).toBe("One plan. Everything included.");
    expect(PRICING_SALES.h1).toBe(
      "Your own dedicated marketing team for less than one month of agency fees.",
    );
    expect(PRICING_SALES.subhead).toContain("£25 a month, billed annually (£300 a year)");
    expect(PRICING_SALES.costs[2].usualCost).toContain("For example");
    expect(PRICING_SALES.bridgeHighlight).toBe("less than one month");
    expect(PRICING_SALES.cta).toBe("Start your 14-day free trial");
    expect(getMarketingPage("/pricing")?.h1).toBe(PRICING_SALES.h1);
  });

  it("derives paywall reminder and charge dates from the trial constants", () => {
    const today = new Date(2026, 9, 12);
    const charge = paywallFirstChargeDate(today);
    const reminder = paywallReminderDate(today);

    expect(charge).toEqual(new Date(2026, 9, 12 + MARKTR_TRIAL_DAYS));
    expect(reminder).toEqual(
      new Date(2026, 9, 12 + MARKTR_TRIAL_DAYS - MARKTR_TRIAL_REMINDER_DAYS_BEFORE),
    );
    expect(formatPaywallDay(new Date(2026, 9, 24))).toBe("24 Oct");
    expect(formatPaywallDay(paywallFirstChargeDate(new Date(2026, 9, 20)))).toBe("3 Nov");
    expect(paywallOfferPriceLine("annual")).toBe("£25/month, billed annually (£300 a year)");
    expect(paywallOfferPriceLine("monthly")).toBe("£35 a month");
    expect(paywallFirstChargeAmount("annual")).toBe("£300/year");
    expect(paywallFirstChargeAmount("monthly")).toBe("£35/month");
  });
});
