import { describe, expect, it } from "vitest";
import {
  RESOURCE_POSTS,
  getRelatedResources,
  getResourceBySlug,
  getYoutubeBlocks,
  youtubeEmbedUrl,
  youtubeVideoObjects,
} from "./resources";

describe("getRelatedResources", () => {
  it("returns 3 other posts for every article, never the current slug", () => {
    for (const post of RESOURCE_POSTS) {
      const related = getRelatedResources(post.slug, 3);
      expect(related).toHaveLength(3);
      expect(related.map((p) => p.slug)).not.toContain(post.slug);
    }
  });
});

describe("psychology-of-premium-branding videos", () => {
  it("lists the full breakdown then the 5-minute version, with nocookie embeds", () => {
    const post = getResourceBySlug("psychology-of-premium-branding");
    expect(post).not.toBeNull();
    const videos = getYoutubeBlocks(post!);
    expect(videos.map((v) => v.videoId)).toEqual(["69GW3omZUuc", "2LOKhfy3UDU"]);
    expect(videos[1]?.title).toBe(
      "Give Me 5 Minutes I'll Give You 5 Psychology Tricks That Let Brands Charge More",
    );
    expect(youtubeEmbedUrl("2LOKhfy3UDU")).toBe(
      "https://www.youtube-nocookie.com/embed/2LOKhfy3UDU",
    );
    expect(youtubeEmbedUrl("2LOKhfy3UDU")).not.toContain("autoplay");
    expect(youtubeEmbedUrl("2LOKhfy3UDU")).not.toContain("start=");

    const objects = youtubeVideoObjects(post!, "https://www.marktr.io/resources/psychology-of-premium-branding");
    expect(objects).toHaveLength(2);
    expect(objects[1]?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/2LOKhfy3UDU");
  });
});
