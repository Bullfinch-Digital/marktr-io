import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCE_POSTS } from "../content/resources";
import {
  buildSitemapXml,
  canonicalRedirectUrl,
  canonicalUrl,
  getMarketingPage,
  isNoIndexPath,
  isResourcePostPath,
  MARKETING_PAGES,
  PUBLIC_SITEMAP_PATHS,
  SITE_ORIGIN,
} from "./seo";

describe("canonicalUrl", () => {
  it("uses https www with a trailing slash only on home", () => {
    expect(canonicalUrl("/")).toBe("https://www.marktr.io/");
    expect(canonicalUrl("/story/")).toBe("https://www.marktr.io/story");
    expect(canonicalUrl("/resources/hormozi-marketing-strategy-tested?ref=x")).toBe(
      "https://www.marktr.io/resources/hormozi-marketing-strategy-tested",
    );
  });
});

describe("isNoIndexPath", () => {
  it("noindexes app and admin routes without blocking public funnels", () => {
    expect(isNoIndexPath("/admin")).toBe(true);
    expect(isNoIndexPath("/dashboard")).toBe(true);
    expect(isNoIndexPath("/strategy/abc")).toBe(true);
    expect(isNoIndexPath("/onboarding-build")).toBe(true);
    expect(isNoIndexPath("/health-check/results")).toBe(true);
    expect(isNoIndexPath("/story/results")).toBe(true);

    expect(isNoIndexPath("/")).toBe(false);
    expect(isNoIndexPath("/story")).toBe(false);
    expect(isNoIndexPath("/health-check")).toBe(false);
    expect(isNoIndexPath("/resources")).toBe(false);
    expect(isNoIndexPath("/newsletter")).toBe(false);
  });
});

describe("marketing pages", () => {
  it("covers the public routes Search Console needs", () => {
    const paths = MARKETING_PAGES.map((p) => p.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/story",
        "/health-check",
        "/pricing",
        "/resources",
        "/newsletter",
        "/privacy-policy",
        "/terms-of-service",
        "/cookie-policy",
      ]),
    );
    expect(paths).not.toContain("/onboarding-build");
    expect(getMarketingPage("/pricing")).toMatchObject({ title: "Pricing | marktr" });
    expect(isResourcePostPath("/resources/hormozi-marketing-strategy-tested")).toBe(true);
    expect(isResourcePostPath("/resources")).toBe(false);
  });
});

describe("buildSitemapXml", () => {
  it("emits absolute www URLs, post lastmod, and no app/auth routes", () => {
    const xml = buildSitemapXml(RESOURCE_POSTS);
    expect(xml.startsWith("<?xml")).toBe(true);
    for (const path of PUBLIC_SITEMAP_PATHS) {
      expect(xml).toContain(`<loc>${canonicalUrl(path)}</loc>`);
    }
    for (const post of RESOURCE_POSTS) {
      expect(xml).toContain(`<loc>${SITE_ORIGIN}/resources/${post.slug}</loc>`);
      if (post.date) expect(xml).toContain(`<lastmod>${post.date}</lastmod>`);
    }
    expect(xml).not.toMatch(/<loc>[^<]*\?/);
    expect(xml).not.toContain("/dashboard");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/onboarding-build");
    expect(xml).not.toMatch(/<loc>http:/);
    expect(xml).not.toContain("<loc>https://marktr.io/");
  });
});

describe("canonicalRedirectUrl", () => {
  it("sends http and apex hosts to https www in one hop", () => {
    expect(canonicalRedirectUrl("http://marktr.io/")).toBe("https://www.marktr.io/");
    expect(canonicalRedirectUrl("http://www.marktr.io/")).toBe("https://www.marktr.io/");
    expect(canonicalRedirectUrl("https://marktr.io/story")).toBe("https://www.marktr.io/story");
    expect(canonicalRedirectUrl("https://marktr.io/robots.txt")).toBe(
      "https://www.marktr.io/robots.txt",
    );
    expect(canonicalRedirectUrl("https://app.marktr.io/pricing")).toBe(
      "https://www.marktr.io/pricing",
    );
    expect(canonicalRedirectUrl("https://www.marktr.io/")).toBeNull();
    expect(
      canonicalRedirectUrl(
        "https://marktr-app-git-preview.vercel.app/",
        "marktr-app-git-preview.vercel.app",
      ),
    ).toBeNull();
  });
});

describe("robots.txt", () => {
  it("allows public pages, disallows app routes, and points at the sitemap", () => {
    const body = readFileSync(join(process.cwd(), "public/robots.txt"), "utf8");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    for (const path of [
      "/admin",
      "/dashboard",
      "/strategy",
      "/content",
      "/icps",
      "/my-brands",
      "/collections",
      "/scheduling",
      "/account",
      "/team",
      "/onboarding",
    ]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
    expect(body).toContain("Sitemap: https://www.marktr.io/sitemap.xml");
  });
});
