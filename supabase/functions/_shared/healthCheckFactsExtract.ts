/** Facts JSON schema, scrape hashing, and extraction seed — no Deno. */

export const FACTS_JSON_SCHEMA_NAME = "health_check_facts";

export const FACTS_PROPERTY_KEYS = [
  "valueProp",
  "namesCustomer",
  "usesSecondPerson",
  "primaryCTA",
  "proofOnPage",
  "pathToBuyContact",
  "founderStory",
  "storySpecific",
  "storyNamesConcrete",
  "pointOfView",
  "valuesMission",
  "socialReflectsStory",
  "igProfileComplete",
  "bioOnMessage",
] as const;

export const FACTS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...FACTS_PROPERTY_KEYS],
  properties: {
    valueProp: { type: "string", enum: ["clear", "vague", "absent"] },
    namesCustomer: { type: "string", enum: ["clear", "hinted", "absent"] },
    usesSecondPerson: { type: "boolean" },
    primaryCTA: { type: "string", enum: ["single", "competing", "absent"] },
    proofOnPage: { type: "string", enum: ["real", "claimed", "absent"] },
    pathToBuyContact: { type: "string", enum: ["clear", "buried", "absent"] },
    founderStory: { type: "string", enum: ["present", "partial", "absent"] },
    storySpecific: { type: "string", enum: ["specific", "mixed", "boilerplate"] },
    storyNamesConcrete: { type: "boolean" },
    pointOfView: { type: "string", enum: ["distinct", "implied", "absent"] },
    valuesMission: { type: "string", enum: ["concrete", "generic", "absent"] },
    socialReflectsStory: {
      type: "string",
      enum: ["expresses", "loose", "disconnected"],
    },
    igProfileComplete: { type: "string", enum: ["complete", "thin", "absent"] },
    bioOnMessage: { type: "string", enum: ["complete", "thin", "absent"] },
  },
} as const;

export const FACTS_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: FACTS_JSON_SCHEMA_NAME,
    strict: true,
    schema: FACTS_JSON_SCHEMA,
  },
};

/** Extra prompt rules for the three labels that flip on thin pages. */
export const FACTS_BOUNDARY_RULES = `
BORDERLINE RULE (all fields): if two labels both seem plausible, pick the MORE CONSERVATIVE (lower) label. Never round up.

valueProp — offer in the hero:
- "clear": the H1 / primary hero line states what they sell AND who it is for in concrete words.
- "vague": an offer exists but is buried, jargon-heavy, or aspirational-only ("Empowering learners, changing lives") with the real product in body copy.
- "absent": you cannot tell what they do from the scrape.
Examples: H1 "Payroll software for UK cafes" → clear. H1 "Grow with confidence" and a product buried in a footer → vague. Brand name + atmosphere, no offer → absent.
Borderline clear vs vague → vague. Borderline vague vs absent → absent.

namesCustomer — who it is for:
- "clear": names a specific audience ("first-time founders", "independent roasters").
- "hinted": "you"/"your" or a fuzzy "businesses" with no named group.
- "absent": no audience signal.
Examples: "for first-time founders" → clear. "Grow your brand" with no who → hinted. "Acme Ltd — established 2019" with no audience → absent.
Borderline clear vs hinted → hinted. Borderline hinted vs absent → absent.

valuesMission — values / mission copy:
- "concrete": specific and checkable ("we donate 1% of sales to soil restoration").
- "generic": warm boilerplate ("passionate about quality", "we care about our customers").
- "absent": no values or mission language.
Examples: "1% of every bag funds reforestation" → concrete. "We're passionate about great coffee" → generic. Product/features only, no mission → absent.
Borderline concrete vs generic → generic. Borderline generic vs absent → absent.
`;

export function normaliseScrapedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function pageTextForCache(
  homepageSignals: string,
  storySignals: string,
): string {
  return [homepageSignals, storySignals]
    .map((part) => normaliseScrapedText(part))
    .filter(Boolean)
    .join("\n\n");
}

/** Skip lookup/store when homepage+about scrape is empty or a thin stub. */
export const MIN_PAGE_TEXT_CHARS_FOR_FACT_CACHE = 200;

export function shouldUseFactCache(pageText: string): boolean {
  return pageText.length >= MIN_PAGE_TEXT_CHARS_FOR_FACT_CACHE;
}

/** Stable URL form so https://Marktr.io/ and https://marktr.io hash the same. */
export function normaliseWebsiteUrlForCache(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    const path =
      parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Material hashed for health_check_fact_cache.content_hash:
 * normalised URL + model version + page text + IG/FB signals that go into combinedText.
 */
export function factsCacheKeyMaterial(input: {
  websiteUrl: string;
  modelVersion: string;
  homepageSignals: string;
  storySignals: string;
  instagramSignals?: string;
  facebookSignals?: string;
}): string {
  const pageText = pageTextForCache(input.homepageSignals, input.storySignals);
  const socialText = pageTextForCache(
    input.instagramSignals ?? "",
    input.facebookSignals ?? "",
  );
  return [
    normaliseWebsiteUrlForCache(input.websiteUrl),
    input.modelVersion,
    pageText,
    socialText,
  ].join("\n");
}

export async function factsCacheContentHash(
  input: Parameters<typeof factsCacheKeyMaterial>[0],
): Promise<string> {
  return sha256Hex(factsCacheKeyMaterial(input));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** OpenAI Chat Completions `seed` — unsigned 31-bit, stable for URL + scorer version. */
export async function factsExtractionSeed(
  websiteUrl: string,
  scorerVersion: string,
): Promise<number> {
  const hex = await sha256Hex(`${websiteUrl.trim()}\n${scorerVersion}`);
  return Number.parseInt(hex.slice(0, 8), 16) % 2_147_483_647;
}
