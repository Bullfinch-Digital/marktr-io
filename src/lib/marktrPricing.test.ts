import { describe, expect, it } from "vitest";
import {
  MARKTR_TRIAL_DAYS,
  MARKTR_TRIAL_REMINDER_DAYS_BEFORE,
  PRICING_SALES,
  formatPaywallDay,
  MARKTR_PAYWALL_ANNUAL_SAVINGS_BADGE,
  paywallFirstChargeAmount,
  paywallFirstChargeDate,
  paywallOfferPriceLine,
  paywallReminderDate,
} from "./marktrPricing";
import { getMarketingPage } from "./seo";

describe("pricing sales copy", () => {
  it("keeps the exact sales section and pairs £15 with annual billing", () => {
    expect(PRICING_SALES.pill).toBe("One plan. Everything included.");
    expect(PRICING_SALES.h1).toBe(
      "One place for your marketing. A clear plan for every week.",
    );
    expect(PRICING_SALES.subhead).toContain("£15 a month, billed annually (£180 a year)");
    expect(PRICING_SALES.problems).toHaveLength(3);
    expect(PRICING_SALES.included).toHaveLength(4);
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
    expect(paywallOfferPriceLine("annual")).toBe("£15/month, billed annually (£180 a year)");
    expect(paywallOfferPriceLine("monthly")).toBe("£25/month, billed monthly");
    expect(paywallFirstChargeAmount("annual")).toBe("£180/year");
    expect(paywallFirstChargeAmount("monthly")).toBe("£25/month");
    expect(MARKTR_PAYWALL_ANNUAL_SAVINGS_BADGE).toBe("Save £120 a year");
  });
});
