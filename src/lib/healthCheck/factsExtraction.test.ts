import { describe, expect, it } from "vitest";
import {
  FACTS_BOUNDARY_RULES,
  FACTS_JSON_SCHEMA,
  FACTS_PROPERTY_KEYS,
  FACTS_RESPONSE_FORMAT,
  factsCacheContentHash,
  factsExtractionSeed,
  MIN_PAGE_TEXT_CHARS_FOR_FACT_CACHE,
  normaliseScrapedText,
  pageTextForCache,
  sha256Hex,
  shouldUseFactCache,
} from "../../../supabase/functions/_shared/healthCheckFactsExtract.ts";
import { HEALTH_CHECK_MODEL_VERSION, HEALTH_CHECK_SCORER_VERSION } from "./constants";

const LONG_PAGE = "Marktr is a marketing platform for founders. ".repeat(8);

describe("facts extraction schema and cache key", () => {
  it("covers every Health Check fact field with a strict json_schema", () => {
    expect([...FACTS_PROPERTY_KEYS].sort()).toEqual(
      [...FACTS_JSON_SCHEMA.required].sort(),
    );
    expect(FACTS_PROPERTY_KEYS).toHaveLength(14);
    expect(FACTS_RESPONSE_FORMAT.type).toBe("json_schema");
    expect(FACTS_RESPONSE_FORMAT.json_schema.strict).toBe(true);
    expect(FACTS_RESPONSE_FORMAT.json_schema.schema.additionalProperties).toBe(
      false,
    );
    expect(FACTS_JSON_SCHEMA.properties.valueProp.enum).toEqual([
      "clear",
      "vague",
      "absent",
    ]);
    expect(FACTS_JSON_SCHEMA.properties.namesCustomer.enum).toEqual([
      "clear",
      "hinted",
      "absent",
    ]);
    expect(FACTS_JSON_SCHEMA.properties.valuesMission.enum).toEqual([
      "concrete",
      "generic",
      "absent",
    ]);
  });

  it("uses a stable seed from URL + scorer version", async () => {
    const a = await factsExtractionSeed("https://www.marktr.io", "1.0.3");
    const b = await factsExtractionSeed("https://www.marktr.io", "1.0.3");
    const c = await factsExtractionSeed("https://www.marktr.io/", "1.0.3");
    const otherVersion = await factsExtractionSeed(
      "https://www.marktr.io",
      "1.0.2",
    );
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2_147_483_647);
    expect(c).not.toBe(a);
    expect(otherVersion).not.toBe(a);
  });

  it("hashes normalised page text so the same scrape reuses facts", async () => {
    const once = await sha256Hex(
      pageTextForCache("  Hello\n\n\nworld  ", "About us"),
    );
    const twice = await sha256Hex(
      pageTextForCache("Hello\n\nworld", "About us"),
    );
    expect(once).toBe(twice);
    expect(once).toHaveLength(64);
  });

  it("busts the cache when page text changes", async () => {
    const original = await sha256Hex(
      pageTextForCache("We help founders.", ""),
    );
    const edited = await sha256Hex(
      pageTextForCache("We help founders. New proof on the homepage.", ""),
    );
    expect(original).not.toBe(edited);
  });

  it("does not share a cache key across two URLs with empty scrapes", async () => {
    const empty = {
      modelVersion: HEALTH_CHECK_MODEL_VERSION,
      homepageSignals: "",
      storySignals: "",
    };
    const a = await factsCacheContentHash({
      ...empty,
      websiteUrl: "https://empty-a.example",
    });
    const b = await factsCacheContentHash({
      ...empty,
      websiteUrl: "https://empty-b.example",
    });
    expect(a).not.toBe(b);
    expect(shouldUseFactCache("")).toBe(false);
    expect(shouldUseFactCache("x".repeat(MIN_PAGE_TEXT_CHARS_FOR_FACT_CACHE - 1))).toBe(
      false,
    );
    expect(shouldUseFactCache("x".repeat(MIN_PAGE_TEXT_CHARS_FOR_FACT_CACHE))).toBe(
      true,
    );
  });

  it("changes the cache key when Instagram signal text is added", async () => {
    const base = {
      websiteUrl: "https://www.marktr.io",
      modelVersion: HEALTH_CHECK_MODEL_VERSION,
      homepageSignals: LONG_PAGE,
      storySignals: "",
    };
    const withoutHandle = await factsCacheContentHash(base);
    const withHandle = await factsCacheContentHash({
      ...base,
      instagramSignals: "Instagram @marktr — bio: marketing for founders",
    });
    expect(withoutHandle).not.toBe(withHandle);
  });

  it("includes model version and normalised URL in the cache key", async () => {
    const page = {
      homepageSignals: LONG_PAGE,
      storySignals: "About the founders",
    };
    const a = await factsCacheContentHash({
      websiteUrl: "https://www.Marktr.io/",
      modelVersion: HEALTH_CHECK_MODEL_VERSION,
      ...page,
    });
    const b = await factsCacheContentHash({
      websiteUrl: "https://www.marktr.io",
      modelVersion: HEALTH_CHECK_MODEL_VERSION,
      ...page,
    });
    const otherModel = await factsCacheContentHash({
      websiteUrl: "https://www.marktr.io",
      modelVersion: "gpt-4o-mini-other",
      ...page,
    });
    expect(a).toBe(b);
    expect(otherModel).not.toBe(a);
  });

  it("tells the model to pick the conservative label on a borderline", () => {
    expect(FACTS_BOUNDARY_RULES).toMatch(/MORE CONSERVATIVE/i);
    expect(FACTS_BOUNDARY_RULES).toMatch(/Borderline clear vs hinted → hinted/);
    expect(FACTS_BOUNDARY_RULES).toMatch(/Borderline clear vs vague → vague/);
    expect(FACTS_BOUNDARY_RULES).toMatch(
      /Borderline concrete vs generic → generic/,
    );
  });

  it("keeps edge and client scorer versions in sync at 1.0.4", () => {
    expect(HEALTH_CHECK_SCORER_VERSION).toBe("1.0.4");
  });

  it("normalises whitespace without dropping words", () => {
    expect(normaliseScrapedText("a\r\n\r\nb\t\tc")).toBe("a\n\nb c");
    expect(normaliseScrapedText("hello  \nworld")).toBe("hello\nworld");
  });
});
