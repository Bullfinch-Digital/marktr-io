import { describe, expect, it } from "vitest";
import { PRICING_SALES } from "./marktrPricing";
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
});
