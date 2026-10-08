import { describe, expect, it } from "vitest";
import { RESOURCE_POSTS, getRelatedResources } from "./resources";

describe("getRelatedResources", () => {
  it("returns 3 other posts for every article, never the current slug", () => {
    for (const post of RESOURCE_POSTS) {
      const related = getRelatedResources(post.slug, 3);
      expect(related).toHaveLength(3);
      expect(related.map((p) => p.slug)).not.toContain(post.slug);
    }
  });
});
