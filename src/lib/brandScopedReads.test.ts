import { afterEach, describe, expect, it } from "vitest";
import {
  ACTIVE_BRAND_STORAGE_KEY,
  persistActiveBrandId,
  pickActiveBrandId,
  readStoredActiveBrandId,
} from "./brandScopedReads";
import { otherBrandCounts } from "./otherBrandCounts";

afterEach(() => {
  localStorage.removeItem(ACTIVE_BRAND_STORAGE_KEY);
});

describe("pickActiveBrandId", () => {
  const brands = [{ id: "old" }, { id: "new" }];

  it("prefers an explicit id that is already in the list", () => {
    expect(pickActiveBrandId(brands, "new")).toBe("new");
  });

  it("keeps a pending preferred id instead of snapping to brands[0]", () => {
    persistActiveBrandId("pending");
    expect(pickActiveBrandId([{ id: "old" }], "pending")).toBe("pending");
  });

  it("falls back to brands[0] when nothing is selected", () => {
    expect(pickActiveBrandId(brands, null)).toBe("old");
  });
});

describe("persistActiveBrandId", () => {
  it("writes and clears localStorage", () => {
    persistActiveBrandId("brand-1");
    expect(readStoredActiveBrandId()).toBe("brand-1");
    persistActiveBrandId(null);
    expect(readStoredActiveBrandId()).toBeNull();
  });
});

describe("otherBrandCounts", () => {
  it("excludes the active brand and sums the rest", () => {
    const result = otherBrandCounts(
      { a: 6, b: 2, c: 0 },
      "b",
      [
        { id: "a", name: "Apostle Coffee" },
        { id: "b", name: "Turnstile QA Co" },
        { id: "c", name: "Empty" },
      ],
    );
    expect(result.total).toBe(6);
    expect(result.brands).toEqual([{ id: "a", name: "Apostle Coffee", count: 6 }]);
  });
});
