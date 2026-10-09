import { describe, expect, it } from "vitest";
import {
  RESOURCE_POSTS,
  RESOURCE_TOPICS,
  countPostsByTopic,
  isTopicId,
} from "./resources";
import { buildSitemapXml, canonicalUrl } from "../lib/seo";

const EXPECTED_TOPICS: Record<string, string[]> = {
  "psychology-of-premium-branding": ["brand", "pricing"],
  "5-stage-marketing-strategy-framework": ["strategy", "brand"],
  "hormozi-marketing-strategy-tested": ["pricing", "strategy"],
  "hollywood-brand-storytelling-framework": ["brand"],
  "what-an-icp-really-is": ["icp"],
  "turn-an-icp-into-better-content-and-ads": ["ads", "icp"],
  "why-your-marketing-isnt-landing": ["strategy", "icp"],
  "why-we-built-icp-generator": ["icp"],
  "how-to-validate-an-icp": ["icp"],
  "stop-wasting-ad-spend": ["ads", "icp"],
};

describe("resource topic tags", () => {
  it("tags every article and derives the expected filter counts", () => {
    expect(RESOURCE_POSTS).toHaveLength(10);
    for (const post of RESOURCE_POSTS) {
      expect(post.topics.length).toBeGreaterThan(0);
      expect(post.topics).toEqual(EXPECTED_TOPICS[post.slug]);
    }

    const counts = countPostsByTopic(RESOURCE_POSTS);
    expect(counts.all).toBe(10);
    expect(counts.icp).toBe(6);
    expect(counts.brand).toBe(3);
    expect(counts.strategy).toBe(3);
    expect(counts.pricing).toBe(2);
    expect(counts.ads).toBe(2);
  });

  it("keeps a single editable topic list and rejects invalid query values", () => {
    expect(RESOURCE_TOPICS.map((topic) => topic.id)).toEqual([
      "icp",
      "brand",
      "strategy",
      "pricing",
      "ads",
    ]);
    expect(isTopicId("icp")).toBe(true);
    expect(isTopicId("nonsense")).toBe(false);
    expect(isTopicId(null)).toBe(false);
  });

  it("keeps filtered URLs off the canonical and sitemap", () => {
    expect(canonicalUrl("/resources?topic=icp")).toBe("https://www.marktr.io/resources");
    expect(buildSitemapXml(RESOURCE_POSTS)).not.toContain("topic=");
  });
});
