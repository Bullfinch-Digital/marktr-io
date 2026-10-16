import { describe, expect, it } from "vitest";
import { STRIPE_PRICE_ANNUAL, STRIPE_PRICE_MONTHLY, planFromPriceId, priceIdForPlan } from "./checkoutPlans";

const RETIRED_ANNUAL = "price_1SpxhW1x4zWkmXI3kvHmx4b3";
const RETIRED_MONTHLY = "price_1UPiud1x4zWkmXI3zixnlb9f";

describe("checkout price ids", () => {
  it("does not start checkout on a retired price", () => {
    expect(priceIdForPlan("annual")).not.toBe(RETIRED_ANNUAL);
    expect(priceIdForPlan("monthly")).not.toBe(RETIRED_MONTHLY);
  });

  it("still maps current and retired prices to annual and monthly", () => {
    expect(planFromPriceId(RETIRED_ANNUAL)).toBe("annual");
    expect(planFromPriceId(RETIRED_MONTHLY)).toBe("monthly");
    expect(planFromPriceId(STRIPE_PRICE_ANNUAL)).toBe("annual");
    expect(planFromPriceId(STRIPE_PRICE_MONTHLY)).toBe("monthly");
    expect(planFromPriceId(priceIdForPlan("annual"))).toBe("annual");
    expect(planFromPriceId(priceIdForPlan("monthly"))).toBe("monthly");
  });
});
