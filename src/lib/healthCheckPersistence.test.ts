import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_BRAND_STORAGE_KEY, persistActiveBrandId } from "./brandScopedReads";

type QueryResult = { data: unknown; error: unknown };

const from = vi.fn();

vi.mock("../config/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

import {
  fetchLatestHealthCheck,
  insertHealthCheckResult,
  resolveBrandIdForHealthWrite,
} from "./healthCheckPersistence";

function dim(name: string, score: number) {
  return { name, score, observation: "ok" };
}

function sampleScores() {
  return {
    websiteClarity: dim("Website Clarity", 70),
    brandStory: dim("Brand Story", 60),
    contentConsistency: dim("Content Consistency", 50),
    socialPresence: dim("Social Presence", 40),
    overall: 55,
    lowestDimension: "Social Presence",
    lowestScore: 40,
  };
}

function chain(result: QueryResult) {
  const q: Record<string, unknown> = {};
  const self = () => q;
  q.insert = vi.fn(self);
  q.select = vi.fn(self);
  q.eq = vi.fn(self);
  q.order = vi.fn(self);
  q.limit = vi.fn(self);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return q as {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
}

describe("health check save + read against the active brand", () => {
  beforeEach(() => {
    from.mockReset();
    localStorage.removeItem(ACTIVE_BRAND_STORAGE_KEY);
  });

  it("inserts and fetches with the same user_id and active brand_id", async () => {
    const userId = "user-jon";
    const brandId = "brand-apostle";
    const inserted = {
      id: "row-1",
      user_id: userId,
      brand_id: brandId,
      domain: "apostle.coffee",
      instagram_handle: "",
      facebook_url: "",
      overall_score: 55,
      scores: sampleScores(),
      created_at: "2026-10-08T10:00:00.000Z",
    };

    const insertQuery = chain({ data: inserted, error: null });
    const fetchQuery = chain({ data: inserted, error: null });
    let resultsCalls = 0;
    from.mockImplementation((table: string) => {
      if (table === "health_check_results") {
        resultsCalls += 1;
        return resultsCalls === 1 ? insertQuery : fetchQuery;
      }
      return chain({ data: [], error: null });
    });

    const saved = await insertHealthCheckResult(userId, brandId, {
      scores: sampleScores(),
      inputSnapshot: {
        domain: "apostle.coffee",
        instagram_handle: "",
        facebook_url: "",
        website_url: "https://apostle.coffee",
      },
    });

    expect(saved?.brand_id).toBe(brandId);
    expect(saved?.user_id).toBe(userId);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        brand_id: brandId,
        domain: "apostle.coffee",
        overall_score: 55,
      }),
    );

    const latest = await fetchLatestHealthCheck(userId, brandId);
    expect(latest?.id).toBe("row-1");
    expect(fetchQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(fetchQuery.eq).toHaveBeenCalledWith("brand_id", brandId);
  });

  it("resolves the active owned brand, not a deleted localStorage id", async () => {
    persistActiveBrandId("deleted-turnstile");
    const resolved = await resolveBrandIdForHealthWrite("user-jon", "brand-apostle", [
      { id: "brand-apostle" },
    ]);
    expect(resolved).toEqual({ brandId: "brand-apostle", source: "context" });
    expect(from).not.toHaveBeenCalled();
  });

  it("ignores a stored id that the user no longer owns and uses the remaining brand", async () => {
    persistActiveBrandId("deleted-turnstile");
    from.mockImplementation((table: string) => {
      if (table === "brands") {
        return chain({ data: [{ id: "brand-apostle" }], error: null });
      }
      return chain({ data: null, error: null });
    });

    const resolved = await resolveBrandIdForHealthWrite("user-jon", null, []);
    expect(resolved.brandId).toBe("brand-apostle");
    expect(resolved.source).toBe("db");
  });

  it("keeps two brands isolated — stored active brand wins over the other owned brand", async () => {
    persistActiveBrandId("brand-b");
    const resolved = await resolveBrandIdForHealthWrite("user-jon", null, [
      { id: "brand-a" },
      { id: "brand-b" },
    ]);
    expect(resolved).toEqual({ brandId: "brand-b", source: "localStorage" });
  });
});
