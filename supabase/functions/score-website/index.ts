import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { computeDeterministicScores, HEALTH_CHECK_SCORER_VERSION, OVERALL_CAP_FRAMING_COPY } from "./deterministicScores.ts";
import {
  findingsQualityIssues,
  mergePillarFindings,
  parsePillarFindings,
  type PillarFinding,
} from "../_shared/pillarFindings.ts";
import {
  extractAllSignals,
  findProductUrl,
  parseAggregateRating,
  type AggregateRatingSignal,
} from "./extractSignals.ts";
import { isAllowedBullfinchTurnstileHostname } from "../_shared/bullfinchHosts.ts";
import {
  FACTS_BOUNDARY_RULES,
  FACTS_RESPONSE_FORMAT,
  factsCacheContentHash,
  factsExtractionSeed,
  pageTextForCache,
  shouldUseFactCache,
} from "../_shared/healthCheckFactsExtract.ts";
import { lookupFactCache, storeFactCache } from "./factCache.ts";
import { persistHealthCheckReport, resolveEditionFromRequest } from "./persistReport.ts";
import { clientIpFromRequest, TURNSTILE_REJECT_STATUS, turnstileRejectCode, verifyTurnstile } from "../_shared/verifyTurnstile.ts";

type PriorRunInput = {
  scores: {
    website: number;
    brandStory: number;
    content: number;
    social: number;
    overall: number;
  };
  findings: Array<{ dimension: string; finding: string }>;
  gaps?: string[];
  missingElements?: string[];
  created_at: string;
};

type BrandStoryPillarInput = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
  hasDefinedStory: boolean;
};

type PillarContextInput = {
  brandStory?: BrandStoryPillarInput | null;
};

type Input = {
  websiteUrl: string;
  instagramHandle?: string;
  facebookUrl?: string;
  /** Optional prior run — findings prose ONLY; never affects fact extraction or scores. */
  priorRun?: PriorRunInput;
  /** Pillar definitions (marktr) — findings prose ONLY; never affects facts or scores. */
  pillarContext?: PillarContextInput;
  edition?: "marktr" | "bullfinch";
  turnstileToken?: string | null;
  utm?: Record<string, unknown> | null;
  /** Business name from the scan form. Stored set-once on the report. */
  businessName?: string;
};

/** Pinned model version — same string recorded client-side (§6). */
const HEALTH_CHECK_MODEL_VERSION = "gpt-4o-mini-2024-07-18";

type HealthCheckFacts = {
  valueProp: "clear" | "vague" | "absent";
  namesCustomer: "clear" | "hinted" | "absent";
  usesSecondPerson: boolean;
  primaryCTA: "single" | "competing" | "absent";
  proofOnPage: "real" | "claimed" | "absent";
  pathToBuyContact: "clear" | "buried" | "absent";
  founderStory: "present" | "partial" | "absent";
  storySpecific: "specific" | "mixed" | "boilerplate";
  storyNamesConcrete: boolean;
  pointOfView: "distinct" | "implied" | "absent";
  valuesMission: "concrete" | "generic" | "absent";
  socialReflectsStory: "expresses" | "loose" | "disconnected";
  igProfileComplete: "complete" | "thin" | "absent";
  bioOnMessage: "complete" | "thin" | "absent";
};

type ApifySocialMetrics = {
  instagramFound: boolean;
  facebookFound: boolean;
  instagramFetchStatus: "not_provided" | "found" | "incomplete";
  followers: number;
  avgLikes: number;
  avgComments: number;
  latestPostDaysAgo: number | null;
  postsPerWeek: number | null;
  bioLength: number;
  hasExternalUrl: boolean;
  hasFullName: boolean;
};

type InstagramFetchResult = {
  signals: string;
  found: boolean;
  /** not_provided | found | incomplete — incomplete means handle given but scrape failed. */
  status: "not_provided" | "found" | "incomplete";
  followers: string;
  postCount: string;
  avgLikes: number;
  avgComments: number;
  latestPostDaysAgo: number | null;
  postsPerWeek: number | null;
  bio: string;
  hasExternalUrl: boolean;
  hasFullName: boolean;
};

type FacebookFetchResult = {
  signals: string;
  found: boolean;
};

const ABOUT_PATHS = [
  "/pages/about",
  "/about",
  "/about-us",
  "/our-story",
  "/story",
  "/pages/our-story",
  "/pages/about-us",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

function extractDomain(url: string): string {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

async function jsonWithOptionalReport(
  payload: Record<string, unknown>,
  persistBullfinch: boolean,
  snapshot: {
    websiteUrl: string;
    instagramHandle: string;
    facebookUrl: string;
    facts: HealthCheckFacts;
    apifyMetrics: ApifySocialMetrics;
    observation: string;
    strengths?: string[];
    gaps?: string[];
    findings?: FindingsResponse["findings"] | null;
    utm?: Record<string, unknown> | null;
    businessName?: string;
  },
) {
  if (persistBullfinch) {
    try {
      const report = await persistHealthCheckReport({
        url: snapshot.websiteUrl,
        instagramHandle: snapshot.instagramHandle,
        facebookUrl: snapshot.facebookUrl,
        businessName: snapshot.businessName,
        domain: extractDomain(snapshot.websiteUrl),
        facts: snapshot.facts,
        apifyMetrics: snapshot.apifyMetrics,
        modelVersion: HEALTH_CHECK_MODEL_VERSION,
        observation: snapshot.observation,
        strengths: snapshot.strengths,
        gaps: snapshot.gaps,
        findings: snapshot.findings,
        utm: snapshot.utm,
      });
      if (report) {
        payload.report = { publicToken: report.publicToken };
      }
    } catch (err) {
      console.error("Bullfinch report persist failed", err);
    }
  }
  return json(payload);
}

function absentFacts(): HealthCheckFacts {
  return {
    valueProp: "absent",
    namesCustomer: "absent",
    usesSecondPerson: false,
    primaryCTA: "absent",
    proofOnPage: "absent",
    pathToBuyContact: "absent",
    founderStory: "absent",
    storySpecific: "boilerplate",
    storyNamesConcrete: false,
    pointOfView: "absent",
    valuesMission: "absent",
    socialReflectsStory: "disconnected",
    igProfileComplete: "absent",
    bioOnMessage: "absent",
  };
}

function parsePostTimestamp(post: Record<string, unknown>): number | null {
  const candidates = [
    post.timestamp,
    post.takenAt,
    post.taken_at_timestamp,
    post.createdAt,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && c > 0) return c > 1e12 ? c : c * 1000;
    if (typeof c === "string" && c.trim()) {
      const ms = Date.parse(c);
      if (!Number.isNaN(ms)) return ms;
    }
  }
  return null;
}

function computeLatestPostDaysAgo(timestamps: number[]): number | null {
  const valid = timestamps.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length === 0) return null;
  const newest = Math.max(...valid);
  return Math.max(0, Math.round((Date.now() - newest) / (24 * 60 * 60 * 1000)));
}

function computePostsPerWeek(timestamps: number[]): number | null {
  const valid = timestamps.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length < 2) return valid.length === 1 ? 0 : null;
  const sorted = [...valid].sort((a, b) => b - a);
  const spanWeeks =
    (sorted[0] - sorted[sorted.length - 1]) / (7 * 24 * 60 * 60 * 1000);
  if (spanWeeks < 0.5) return sorted.length;
  return sorted.length / spanWeeks;
}

function normalizeFacts(raw: unknown): HealthCheckFacts {
  if (!raw || typeof raw !== "object") return absentFacts();
  const f = raw as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: T[], fb: T) =>
    typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fb;
  return {
    valueProp: pick(f.valueProp, ["clear", "vague", "absent"], "absent"),
    namesCustomer: pick(f.namesCustomer, ["clear", "hinted", "absent"], "absent"),
    usesSecondPerson: Boolean(f.usesSecondPerson),
    primaryCTA: pick(f.primaryCTA, ["single", "competing", "absent"], "absent"),
    proofOnPage: pick(f.proofOnPage, ["real", "claimed", "absent"], "absent"),
    pathToBuyContact: pick(f.pathToBuyContact, ["clear", "buried", "absent"], "absent"),
    founderStory: pick(f.founderStory, ["present", "partial", "absent"], "absent"),
    storySpecific: pick(
      f.storySpecific,
      ["specific", "mixed", "boilerplate"],
      "boilerplate"
    ),
    storyNamesConcrete: Boolean(f.storyNamesConcrete),
    pointOfView: pick(f.pointOfView, ["distinct", "implied", "absent"], "absent"),
    valuesMission: pick(f.valuesMission, ["concrete", "generic", "absent"], "absent"),
    socialReflectsStory: pick(
      f.socialReflectsStory,
      ["expresses", "loose", "disconnected"],
      "disconnected"
    ),
    igProfileComplete: pick(f.igProfileComplete, ["complete", "thin", "absent"], "absent"),
    bioOnMessage: pick(f.bioOnMessage, ["complete", "thin", "absent"], "absent"),
  };
}

function parseFactsJson(raw: string): HealthCheckFacts {
  try {
    return normalizeFacts(JSON.parse(raw));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON.");
    return normalizeFacts(JSON.parse(match[0]));
  }
}

function toApifyMetrics(
  instagram: InstagramFetchResult,
  facebook: FacebookFetchResult
): ApifySocialMetrics {
  return {
    instagramFound: instagram.found,
    facebookFound: facebook.found,
    instagramFetchStatus: instagram.status,
    followers: instagram.found ? Number(instagram.followers) || 0 : 0,
    avgLikes: instagram.avgLikes,
    avgComments: instagram.avgComments,
    latestPostDaysAgo: instagram.latestPostDaysAgo,
    postsPerWeek: instagram.postsPerWeek,
    bioLength: instagram.bio.length,
    hasExternalUrl: instagram.hasExternalUrl,
    hasFullName: instagram.hasFullName,
  };
}

function normaliseUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normaliseFacebookUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutAt = trimmed.replace(/^@+/, "").replace(/^\/+/, "");

  if (/facebook\.com/i.test(withoutAt)) {
    if (/^https?:\/\//i.test(withoutAt)) return withoutAt;
    return `https://${withoutAt.replace(/^\/\//, "")}`;
  }

  const slug = withoutAt.split(/[/?#]/)[0]?.trim();
  if (!slug) return "";

  return `https://facebook.com/${slug}`;
}

async function fetchPage(baseUrl: string, path: string): Promise<string> {
  try {
    const url = baseUrl.replace(/\/+$/, "") + path;
    const res = await fetch(url, {
      headers: { "User-Agent": "marktr-bot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html.length > 500 ? html : "";
  } catch {
    return "";
  }
}

/** Fetch an already-absolute URL's HTML. Degrades to "" on any error/timeout (never throws/hangs). */
async function fetchAbsoluteHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "marktr-bot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html.length > 500 ? html : "";
  } catch {
    return "";
  }
}

const INSTAGRAM_FETCH_ATTEMPTS = 3;

/**
 * Apify often returns HTTP 200 with a truthy stub for unknown usernames
 * (e.g. `{ username, error }` or an object with no followersCount).
 * Those must NOT be treated as found — that caused phantom Social/Content scores.
 */
function isUsableInstagramProfile(profile: unknown): profile is Record<string, unknown> {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;

  if (typeof p.error === "string" && p.error.trim()) return false;
  if (p.exists === false) return false;

  const followers = p.followersCount;
  if (typeof followers === "number" && Number.isFinite(followers) && followers >= 0) {
    return true;
  }
  if (
    typeof followers === "string" &&
    followers.trim() !== "" &&
    Number.isFinite(Number(followers))
  ) {
    return true;
  }

  return false;
}

async function fetchInstagramOnce(username: string, apiToken: string): Promise<InstagramFetchResult | null> {
  const emptyIncomplete: InstagramFetchResult = {
    signals: "",
    found: false,
    status: "incomplete",
    followers: "",
    postCount: "",
    avgLikes: 0,
    avgComments: 0,
    latestPostDaysAgo: null,
    postsPerWeek: null,
    bio: "",
    hasExternalUrl: false,
    hasFullName: false,
  };

  try {
    const res = await fetch(
      "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items" +
        `?token=${apiToken}&timeout=25&memory=256`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernames: [username],
        }),
        signal: AbortSignal.timeout(28000),
      }
    );

    if (!res.ok) {
      console.error("Apify API error:", res.status, await res.text());
      return emptyIncomplete;
    }

    const items = await res.json();
    const profile = Array.isArray(items) ? items[0] : null;

    // HTTP 200 empty OR stub/error object → incomplete (not genuine absent).
    if (!isUsableInstagramProfile(profile)) {
      console.warn(
        "Apify Instagram unusable profile (treating as incomplete):",
        JSON.stringify(
          profile && typeof profile === "object"
            ? {
                keys: Object.keys(profile as object),
                error: (profile as Record<string, unknown>).error ?? null,
                followersCount: (profile as Record<string, unknown>).followersCount ?? null,
                username: (profile as Record<string, unknown>).username ?? null,
              }
            : profile
        )
      );
      return emptyIncomplete;
    }

    const followers = profile.followersCount?.toString() ?? "";
    const following = profile.followingCount?.toString() ?? "";
    const posts = profile.postsCount?.toString() ?? "";
    const bio = profile.biography ?? "";
    const fullName = profile.fullName ?? "";
    const isVerified = profile.verified ?? false;
    const businessCategory = profile.businessCategoryName ?? "";
    const isBusinessAccount = profile.isBusinessAccount ?? false;
    const website = profile.externalUrl ?? "";

    const latestPosts = profile.latestPosts ?? [];
    let avgLikes = 0;
    let avgComments = 0;
    if (Array.isArray(latestPosts) && latestPosts.length > 0) {
      avgLikes = Math.round(
        latestPosts.reduce(
          (sum: number, p: { likesCount?: number }) => sum + (p.likesCount ?? 0),
          0
        ) / latestPosts.length
      );
      avgComments = Math.round(
        latestPosts.reduce(
          (sum: number, p: { commentsCount?: number }) =>
            sum + (p.commentsCount ?? 0),
          0
        ) / latestPosts.length
      );
    }

    const postTimestamps = (latestPosts as Record<string, unknown>[])
      .map((p) => parsePostTimestamp(p))
      .filter((t): t is number => t !== null);
    const latestPostDaysAgo = computeLatestPostDaysAgo(postTimestamps);
    const postsPerWeek = computePostsPerWeek(postTimestamps);

    const signals = [
      `Instagram handle: @${username}`,
      fullName && `Account name: ${fullName}`,
      followers && `Followers: ${Number(followers).toLocaleString()}`,
      following && `Following: ${Number(following).toLocaleString()}`,
      posts && `Total posts: ${Number(posts).toLocaleString()}`,
      bio && `Bio: ${bio}`,
      isVerified && "Verified account",
      isBusinessAccount && "Business account: yes",
      businessCategory && `Category: ${businessCategory}`,
      website && `External website: ${website}`,
      avgLikes > 0 && `Average likes per post: ${avgLikes}`,
      avgComments > 0 && `Average comments per post: ${avgComments}`,
    ]
      .filter(Boolean)
      .join("\n");

    console.log(
      "Apify Instagram result:",
      JSON.stringify({
        username,
        found: true,
        followers,
        posts,
        avgLikes,
        avgComments,
      })
    );

    return {
      signals,
      found: true,
      status: "found",
      followers,
      postCount: posts,
      avgLikes,
      avgComments,
      latestPostDaysAgo,
      postsPerWeek,
      bio: String(bio),
      hasExternalUrl: Boolean(website),
      hasFullName: Boolean(fullName),
    };
  } catch (err) {
    console.error("Apify fetch error:", err);
    return emptyIncomplete;
  }
}

async function fetchInstagramPublic(handle: string): Promise<InstagramFetchResult> {
  const notProvided: InstagramFetchResult = {
    signals: "",
    found: false,
    status: "not_provided",
    followers: "",
    postCount: "",
    avgLikes: 0,
    avgComments: 0,
    latestPostDaysAgo: null,
    postsPerWeek: null,
    bio: "",
    hasExternalUrl: false,
    hasFullName: false,
  };

  const username = handle.replace("@", "").trim().toLowerCase();
  if (!username) return notProvided;

  const apiToken = Deno.env.get("APIFY_API_TOKEN");
  if (!apiToken) {
    console.error("APIFY_API_TOKEN not set");
    return { ...notProvided, status: "incomplete" };
  }

  let last: InstagramFetchResult | null = null;
  for (let attempt = 1; attempt <= INSTAGRAM_FETCH_ATTEMPTS; attempt++) {
    last = await fetchInstagramOnce(username, apiToken);
    if (last?.found) return last;
    console.warn(
      `Apify Instagram attempt ${attempt}/${INSTAGRAM_FETCH_ATTEMPTS} incomplete for @${username}`
    );
    if (attempt < INSTAGRAM_FETCH_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  return (
    last ?? {
      ...notProvided,
      status: "incomplete",
    }
  );
}

async function fetchFacebookPublic(facebookUrl: string): Promise<FacebookFetchResult> {
  const empty: FacebookFetchResult = { signals: "", found: false };

  try {
    const url = normaliseFacebookUrl(facebookUrl);
    if (!url) return empty;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; marktr-bot/1.0)",
        Accept: "text/html",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return empty;
    const html = await res.text();

    const get = (pattern: RegExp) => {
      const m = html.match(pattern);
      return m?.[1]?.trim() ?? "";
    };

    const ogTitle =
      get(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
      get(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    const ogDesc =
      get(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i
      ) ||
      get(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
      );

    const likesMatch = ogDesc.match(/([\d,.]+[km]?)\s*(?:people\s*)?likes?/i);
    const followersMatch = ogDesc.match(/([\d,.]+[km]?)\s*followers?/i);

    const signals =
      [
        ogTitle && `Facebook page name: ${ogTitle}`,
        ogDesc && `Facebook page description: ${ogDesc}`,
        likesMatch && `Page likes: ${likesMatch[1]}`,
        followersMatch && `Page followers: ${followersMatch[1]}`,
      ]
        .filter(Boolean)
        .join("\n") || "Facebook page found but limited data";

    return {
      signals,
      found: Boolean(ogTitle || ogDesc),
    };
  } catch {
    return empty;
  }
}

function extractStorySignals(html: string): string {
  if (!html) return "";

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    )
    .filter((t) => t.length > 40 && t.length < 600)
    .slice(0, 8);

  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 3)
    .slice(0, 6);

  const yearMatch = html.match(
    /\b(since|founded|established|started|began|in)\s+(19|20)\d{2}/i
  );

  const founderMatch = html.match(
    /\b(founder|started by|created by|built by|by\s+[A-Z][a-z]+\s+[A-Z][a-z]+)\b/i
  );

  const missionMatch = html.match(
    /\b(mission|purpose|believe|committed|dedicated|passionate about|why we|we exist)\b/i
  );

  const parts = [
    headings.length && `About page headings: ${headings.join(" | ")}`,
    paragraphs.length && `About page content:\n${paragraphs.join("\n")}`,
    yearMatch && `Founding reference: ${yearMatch[0]}`,
    founderMatch && "Founder reference found",
    missionMatch && "Mission/purpose language found",
  ]
    .filter(Boolean)
    .join("\n\n");

  return parts;
}

const FACTS_SYSTEM_PROMPT = `You extract observable marketing FACTS from website and social content. Return ONLY valid JSON — no markdown, no backticks, NO scores, NO points, NO dimension ratings.

{
  "valueProp": "clear" | "vague" | "absent",
  "namesCustomer": "clear" | "hinted" | "absent",
  "usesSecondPerson": boolean,
  "primaryCTA": "single" | "competing" | "absent",
  "proofOnPage": "real" | "claimed" | "absent",
  "pathToBuyContact": "clear" | "buried" | "absent",
  "founderStory": "present" | "partial" | "absent",
  "storySpecific": "specific" | "mixed" | "boilerplate",
  "storyNamesConcrete": boolean,
  "pointOfView": "distinct" | "implied" | "absent",
  "valuesMission": "concrete" | "generic" | "absent",
  "socialReflectsStory": "expresses" | "loose" | "disconnected",
  "igProfileComplete": "complete" | "thin" | "absent",
  "bioOnMessage": "complete" | "thin" | "absent"
}

WEBSITE CLARITY:
- valueProp: "clear" ONLY if the hero/above-the-fold headline (H1 or primary hero text) plainly states what they offer and who it's for in concrete terms. Mission-statement, aspirational-only, or values-only heroes (e.g. "Empowering Learners, Changing Lives") where the actual offer lives only in body copy → "vague", NOT "clear". "vague" = offer present but buried, jargon-heavy, or generic. "absent" = can't tell what they do.
- namesCustomer: clear = names/implies who it's for; hinted = weak audience signal; absent = speaks to no one
- usesSecondPerson: true if hero/body uses "you"/"your" addressing the reader
- primaryCTA: single = one clear next step; competing = multiple competing CTAs; absent = no clear action
- proofOnPage: "real" when the scrape shows specific proof — named reviewers with product/experience detail, "Verified Customer" quotes with specifics, named client logos, credentials, press mentions, or celebrity/public-figure endorsement quotes (with or without a named publication attached). Multiple detailed customer quotes (even without surnames) with concrete product language count as "real". Attributed press pull-quotes (e.g. [GQ] "…") count as "real". "claimed" ONLY for generic/anonymous praise without specifics ("great service!", bare star counts, marketing boasts with no verifiable detail). "absent" = no proof signals or review quotes in the scrape.
- pathToBuyContact: clear = obvious shop/contact/book path; buried = hard to find; absent = none found

BRAND STORY (from about/story pages + homepage):
- founderStory: present = real origin narrative; partial = a line or two; absent = none
- storySpecific: "specific" only if TWO+ concrete anchors from: named year/date, named person, named place/origin, specific turning point/problem, concrete achievement/award, heritage marker (e.g. "150 years"). "mixed" = exactly one anchor. "boilerplate" = none — pure abstract claims like "passionate about quality" without anchors
- storyNamesConcrete: true if ANY concrete anchor above is present
- pointOfView: distinct = clear belief/stance; implied = weak stance; absent = none
- valuesMission: concrete = specific values/mission; generic = present but generic; absent = none

STORY ↔ SOCIAL (ONLY when Instagram/Facebook data is present in the input — otherwise skip these three fields; they will be forced absent in code):
- socialReflectsStory: expresses = socials reflect brand story/POV; loose = loosely connected; disconnected = unrelated generic socials

SOCIAL PROFILE (ONLY when Instagram data is present in the input):
- igProfileComplete: complete = bio, name, link feel complete; thin = sparse; absent = empty/default or no IG data
- bioOnMessage: complete = bio on-brand and names audience; thin = generic bio; absent = empty or no IG

If NO social sections appear in the input, set socialReflectsStory="disconnected", igProfileComplete="absent", bioOnMessage="absent".

${FACTS_BOUNDARY_RULES}

Do NOT output scores, points, or findings. Facts only.`;

function hasAnySocialProfile(metrics: ApifySocialMetrics): boolean {
  return metrics.instagramFound || metrics.facebookFound;
}

function sanitizeFactsForScoring(
  facts: HealthCheckFacts,
  apifyMetrics: ApifySocialMetrics
): HealthCheckFacts {
  if (hasAnySocialProfile(apifyMetrics)) return facts;
  return {
    ...facts,
    socialReflectsStory: "disconnected",
    igProfileComplete: "absent",
    bioOnMessage: "absent",
  };
}

function normalizePillarContext(raw: unknown): PillarContextInput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const brandStoryRaw = record.brandStory;
  if (!brandStoryRaw || typeof brandStoryRaw !== "object") return undefined;
  const bs = brandStoryRaw as Record<string, unknown>;
  const foundingStory = typeof bs.foundingStory === "string" ? bs.foundingStory.trim() : "";
  const pointOfView = typeof bs.pointOfView === "string" ? bs.pointOfView.trim() : "";
  const positioningStatement =
    typeof bs.positioningStatement === "string" ? bs.positioningStatement.trim() : "";
  const brandPurpose = typeof bs.brandPurpose === "string" ? bs.brandPurpose.trim() : "";
  const hasDefinedStory = Boolean(bs.hasDefinedStory);
  if (!hasDefinedStory) return undefined;
  return {
    brandStory: {
      foundingStory,
      pointOfView,
      positioningStatement,
      brandPurpose,
      hasDefinedStory: true,
    },
  };
}

const FINDINGS_SYSTEM_PROMPT = `You write advisory findings for a digital health check. Return ONLY valid JSON — no markdown.

{
  "findings": [
    { "dimension": "Website Clarity", "score": number, "observation": "string", "next_step": "string" },
    { "dimension": "Brand Story", "score": number, "observation": "string", "next_step": "string" },
    { "dimension": "Content Consistency", "score": number, "observation": "string", "next_step": "string" },
    { "dimension": "Social Presence", "score": number, "observation": "string", "next_step": "string" }
  ],
  "strengths": ["string"],
  "gaps": ["string"]
}

RULES:
- You receive CURRENT dimension scores (already computed from the live site). Each finding's "score" MUST exactly match the provided score for that dimension. Never invent or adjust scores. Return one finding for every dimension whose score is a number, including 0. Omit a dimension only when its score is null. When socialIncomplete is false, Website Clarity, Brand Story, Content Consistency and Social Presence are all required.
- observation: ONE sentence that names something actually seen. Quote a short headline or bio line, name the page, or cite a number from socialMetrics (followers, latestPostDaysAgo, postsInLast30Days). If there is nothing specific to cite, say what is missing and where you looked (homepage, about page, Instagram bio, recent posts). Do not restate the score. Do not repeat a strengths bullet. The only time a score number may appear is a prior-run comparison.
- next_step: ONE action the owner could do this week, naming the page or place it goes.
- When a score is 85 or higher, next_step must build on that strength (put the good line somewhere else, or reuse it). Never say "maintain", "no action needed", or "already strong". Do not start the sentence with "Consider".
- Write as you would say it to the owner across a table. Plain UK English. No runs of short punchy sentences. No three-part lists.
- Banned words, never use them: CTA, call-to-action, value proposition, boilerplate, engagement, engage, leverage, enhance, optimise, optimize, ICP, brand voice, synergy, "more compelling". Say "the customer you most want" instead of ICP. Say "button" instead of CTA.
- Stay STRICTLY within that dimension.
  - Website Clarity: the homepage headline, a button, or another page on the site. No Instagram, posting, followers, or the founder story.
  - Brand Story: the about page or the homepage story. No follower counts or posting.
  - Content Consistency: cite followers, latestPostDaysAgo, or postsInLast30Days. If instagramFetchStatus is "not_provided", say no Instagram was entered on this check, so there are no posts to count. Do not say you looked the profile up. Do not talk about the homepage wording.
  - Social Presence: quote the bio, cite the follower count, or say which profile was missing. If instagramFetchStatus is "not_provided", say no Instagram or Facebook was entered. Do not talk about the homepage headline.
  - When Brand Story is 85 or higher and founderStory is already "present", do not tell them to add a founding story. Name another page that should use a line from the about page.
- strengths: at most 2 items, Website Clarity only (what is already working on the website). If Website Clarity is at raw max (100) or display-capped, return an empty strengths array. Do not repeat the observation.
- gaps: at most 2 items, Website Clarity only, and only from website facts below their top band. If Website Clarity is at raw max (100) or display-capped (dimensionCapped true), return an EMPTY gaps array. Never invent gaps. Never mention posting, bios, Instagram, Facebook, or the founder story in strengths or gaps.

EXAMPLES:
- Bad observation: "The value proposition is vague, which may confuse potential customers."
  Good observation: "The homepage headline says 'Marketing that works' and never names who it is for."
- Bad next_step: "Enhance the clarity of the primary CTA."
  Good next_step: "Change the 'Contact us' button on the homepage to 'Book a site visit', so people know what happens next."
- Bad next_step when the score is already high: "No action needed as this dimension is strong."
  Good next_step: "Put the founder story from your About page on the homepage too."
- Bad social observation: "The Instagram profile is thin and lacks engaging content."
  Good social observation: "The Instagram bio is one line, 'Log cabins built in Britain', and the last post was 46 days ago."

WHEN socialIncomplete IS TRUE:
- Only write findings for Website Clarity and Brand Story.
- Do NOT invent Content or Social scores or advice. Mention briefly that social could not be read this run and the overall covers website + story only.
- strengths/gaps still follow the Website Clarity rules above.

WHEN priorRun IS PROVIDED (follow-up check):
- Acknowledge progress: if a prior gap or finding is now addressed on the live site, say so briefly and move to the next priority — do NOT re-list a resolved gap.
- Explain movement: if a dimension score changed vs priorRun.scores, explain why using the EXACT prior and current numbers (e.g. "Brand Story rose from 0 to 100 because your founder story is now live on the about page").
- If ANY scoreDeltas value is non-zero, at least ONE finding MUST reference a specific prior→current score change in plain language.
- If a score is unchanged, say honestly that nothing material changed on the live site since last time — do not invent movement.
- Advance priorities: do not repeat the same advice verbatim; progress to the next most important gap.
- Compare against priorRun.findings, priorRun.gaps, and priorRun.missingElements when judging what was fixed.

WHEN priorRun IS ABSENT (first check):
- Fresh advice only — no "compared to last time" language.

WHEN pillarContext.brandStory IS PROVIDED (marktr-defined story — findings ONLY, scores already set from live site):
- Compare DEFINED (in marktr) vs LIVE (on public website from extractedFacts/scrape).
- If a strong story is defined in marktr but site facts show thin/absent founder story → Brand Story finding MUST call this out: they've defined a founder story/POV in marktr but it's not live on the website; getting it onto the about page would help visitors and could lift Brand Story over time. Reference a specific element from pillarContext.brandStory (founding story, POV, etc.).
- If defined AND live site facts align → acknowledge alignment briefly.
- pillarContext NEVER changes scores — only enriches advice.`;

type FindingsResponse = {
  findings: PillarFinding[];
  strengths: string[];
  gaps: string[];
};

function normalizePriorRun(raw: unknown): PriorRunInput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const scoresRaw = p.scores;
  if (!scoresRaw || typeof scoresRaw !== "object") return undefined;
  const s = scoresRaw as Record<string, unknown>;
  const website = Number(s.website);
  const brandStory = Number(s.brandStory);
  const content = Number(s.content);
  const social = Number(s.social);
  const overall = Number(s.overall);
  if ([website, brandStory, content, social, overall].some((n) => Number.isNaN(n))) {
    return undefined;
  }
  const findings = Array.isArray(p.findings)
    ? p.findings
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const dimension = typeof row.dimension === "string" ? row.dimension.trim() : "";
          const finding = typeof row.finding === "string" ? row.finding.trim() : "";
          if (!dimension || !finding) return null;
          return { dimension, finding };
        })
        .filter((item): item is { dimension: string; finding: string } => item !== null)
    : [];
  const gaps = Array.isArray(p.gaps)
    ? p.gaps.map((g) => String(g).trim()).filter(Boolean)
    : undefined;
  const missingElements = Array.isArray(p.missingElements)
    ? p.missingElements.map((g) => String(g).trim()).filter(Boolean)
    : undefined;
  const created_at = typeof p.created_at === "string" ? p.created_at : "";
  if (!created_at) return undefined;
  return {
    scores: { website, brandStory, content, social, overall },
    findings,
    gaps: gaps?.length ? gaps : undefined,
    missingElements: missingElements?.length ? missingElements : undefined,
    created_at,
  };
}

function parseFindingsJson(raw: string): FindingsResponse | null {
  return parsePillarFindings(raw);
}

async function generateFindingsProse(
  apiKey: string,
  facts: HealthCheckFacts,
  apifyMetrics: ApifySocialMetrics,
  scores: ReturnType<typeof computeDeterministicScores>,
  priorRun: PriorRunInput | undefined,
  pillarContext: PillarContextInput | undefined,
  scrapeSummary: string
): Promise<FindingsResponse | null> {
  const userPayload = {
    currentScores: {
      "Website Clarity": scores.website,
      "Brand Story": scores.brandStory,
      "Content Consistency": scores.content,
      "Social Presence": scores.social,
      overall: scores.overall,
    },
    dimensionMeta: {
      "Website Clarity": {
        raw: scores.website,
        displayCap: 95,
        capped: scores.website > 95,
        atRawMax: scores.website >= 100,
      },
      "Brand Story": {
        raw: scores.brandStory,
        displayCap: 95,
        capped: scores.brandStory > 95,
        atRawMax: scores.brandStory >= 100,
      },
      "Content Consistency":
        scores.content === null
          ? { unmeasured: true }
          : {
              raw: scores.content,
              displayCap: 95,
              capped: scores.content > 95,
              atRawMax: scores.content >= 100,
            },
      "Social Presence":
        scores.social === null
          ? { unmeasured: true }
          : {
              raw: scores.social,
              displayCap: 95,
              capped: scores.social > 95,
              atRawMax: scores.social >= 100,
            },
    },
    socialIncomplete: scores.socialIncomplete,
    scoreDeltas: priorRun
      ? {
          website: scores.website - priorRun.scores.website,
          brandStory: scores.brandStory - priorRun.scores.brandStory,
          content:
            scores.content === null || priorRun.scores.content == null
              ? null
              : scores.content - priorRun.scores.content,
          social:
            scores.social === null || priorRun.scores.social == null
              ? null
              : scores.social - priorRun.scores.social,
          overall: scores.overall - priorRun.scores.overall,
        }
      : null,
    extractedFacts: facts,
    socialMetrics: {
      instagramFound: apifyMetrics.instagramFound,
      facebookFound: apifyMetrics.facebookFound,
      instagramFetchStatus: apifyMetrics.instagramFetchStatus,
      followers: apifyMetrics.followers,
      latestPostDaysAgo: apifyMetrics.latestPostDaysAgo,
      postsPerWeek: apifyMetrics.postsPerWeek,
      postsInLast30Days:
        apifyMetrics.postsPerWeek == null
          ? null
          : Math.round(apifyMetrics.postsPerWeek * (30 / 7)),
      bioLength: apifyMetrics.bioLength,
    },
    priorRun: priorRun ?? null,
    pillarContext: pillarContext ?? null,
    scrapeSummary: scrapeSummary.slice(0, 4000),
  };

  const measured = (
    [
      ["Website Clarity", scores.website],
      ["Brand Story", scores.brandStory],
      ["Content Consistency", scores.content],
      ["Social Presence", scores.social],
    ] as const
  ).filter(([, score]) => typeof score === "number");
  const scoresByDimension = Object.fromEntries(measured);
  const requiredLine = measured.map(([name, score]) => `${name} score ${score}`).join("; ");

  const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HEALTH_CHECK_MODEL_VERSION,
      max_tokens: 1800,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FINDINGS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write findings for this health check. Required, one finding each: ${requiredLine}.\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    }),
  });

  if (!aiResp.ok) return null;

  const data = await aiResp.json();
  const content =
    data?.choices?.[0]?.message?.content != null
      ? String(data.choices[0].message.content)
      : "";
  if (!content) return null;

  const parsed = parseFindingsJson(content);
  if (!parsed) return null;

  const required = measured.map(([name]) => name);
  const issues = findingsQualityIssues(parsed, required, scoresByDimension);
  console.log(
    "findings pass",
    parsed.findings.map((row) => row.dimension).join(", ") || "none",
    issues.length ? issues.join(" | ") : "ok",
  );
  if (issues.length === 0) return mergePillarFindings(parsed, null, scoresByDimension);

  const retry = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HEALTH_CHECK_MODEL_VERSION,
      max_tokens: 1800,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FINDINGS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write findings for this health check:\n\nRequired, one finding each: ${requiredLine}.\n\n${JSON.stringify(userPayload, null, 2)}\n\nFix these and return the full JSON again, still including every required finding:\n- ${issues.join("\n- ")}`,
        },
      ],
    }),
  });
  if (!retry.ok) return mergePillarFindings(parsed, null, scoresByDimension);
  const retryData = await retry.json();
  const retryContent =
    retryData?.choices?.[0]?.message?.content != null
      ? String(retryData.choices[0].message.content)
      : "";
  const retried = parseFindingsJson(retryContent);
  console.log(
    "findings retry",
    retried?.findings.map((row) => row.dimension).join(", ") || "none",
  );
  return mergePillarFindings(parsed, retried, scoresByDimension);
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Partial<Input>;
    console.log("Raw instagramHandle received:", body.instagramHandle);
    const origin = req.headers.get("origin") || req.headers.get("Origin");
    const resolvedEdition = resolveEditionFromRequest({
      requested: body.edition,
      origin,
    });
    let persistBullfinch = false;
    if (resolvedEdition === "bullfinch") {
      const turnstileResult = await verifyTurnstile(
        body.turnstileToken,
        clientIpFromRequest(req),
        { allowedHostname: isAllowedBullfinchTurnstileHostname },
      );
      if (!turnstileResult.ok) {
        return json(
          {
            error: "Turnstile verification failed",
            code: turnstileRejectCode(turnstileResult.errorCodes),
            errorCodes: turnstileResult.errorCodes,
          },
          TURNSTILE_REJECT_STATUS,
        );
      }
      persistBullfinch = true;
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json(
        {
          error:
            "OPENAI_API_KEY missing. Set it via `supabase secrets set OPENAI_API_KEY=...` and redeploy.",
        },
        500
      );
    }

    const priorRun = normalizePriorRun(body.priorRun);
    const pillarContext = normalizePillarContext(body.pillarContext);
    const websiteUrl = normaliseUrl(body.websiteUrl ?? "");
    if (!websiteUrl) return json({ error: "websiteUrl is required" }, 400);

    let combinedText = "";
    let homepageSignalsForCache = "";
    let storySignalsForCache = "";
    let aggregateRatingProof: AggregateRatingSignal | null = null;
    let instagramFetch: InstagramFetchResult = {
      signals: "",
      found: false,
      status: "not_provided",
      followers: "",
      postCount: "",
      avgLikes: 0,
      avgComments: 0,
      latestPostDaysAgo: null,
      postsPerWeek: null,
      bio: "",
      hasExternalUrl: false,
      hasFullName: false,
    };
    let facebookFetch: FacebookFetchResult = { signals: "", found: false };

    try {
      const emptyInstagram: InstagramFetchResult = {
        signals: "",
        found: false,
        status: "not_provided",
        followers: "",
        postCount: "",
        avgLikes: 0,
        avgComments: 0,
        latestPostDaysAgo: null,
        postsPerWeek: null,
        bio: "",
        hasExternalUrl: false,
        hasFullName: false,
      };

      const fetchHomepageSignals = async (): Promise<{
        signals: string;
        aggregateRating: AggregateRatingSignal | null;
      }> => {
        const res = await fetch(websiteUrl, {
          headers: { "User-Agent": "marktr-bot/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        const signals = extractAllSignals(html, websiteUrl);

        // JSON-LD AggregateRating is the deterministic proof signal. It usually lives
        // on product pages, not the homepage, so check the homepage first then
        // opportunistically crawl one product page. Degrades to homepage-only if no
        // product link is found or the PDP fetch fails.
        let aggregateRating = parseAggregateRating(html);
        if (!aggregateRating) {
          const productUrl = findProductUrl(html, websiteUrl);
          if (productUrl) {
            const pdpHtml = await fetchAbsoluteHtml(productUrl);
            if (pdpHtml) aggregateRating = parseAggregateRating(pdpHtml);
          }
        }
        return { signals, aggregateRating };
      };

      const fetchStorySignals = async () => {
        const baseUrl = new URL(websiteUrl).origin;
        for (const path of ABOUT_PATHS) {
          const aboutHtml = await fetchPage(baseUrl, path);
          if (aboutHtml) return extractStorySignals(aboutHtml);
        }
        return "";
      };

      if (body.instagramHandle) {
        const username = body.instagramHandle.replace("@", "").trim().toLowerCase();
        console.log("Calling Instagram API with username:", username);
      }

      const [homepageResult, storySignals, instagramFetchResult] = await Promise.all([
        fetchHomepageSignals(),
        fetchStorySignals(),
        body.instagramHandle
          ? fetchInstagramPublic(body.instagramHandle)
          : Promise.resolve(emptyInstagram),
      ]);

      const homepageSignals = homepageResult.signals;
      aggregateRatingProof = homepageResult.aggregateRating;
      homepageSignalsForCache = homepageSignals;
      storySignalsForCache = storySignals;

      instagramFetch = instagramFetchResult;
      console.log("Instagram signals:", instagramFetch.signals || "EMPTY");
      console.log("Instagram fetch result:", JSON.stringify(instagramFetch));

      const facebookSignals = body.facebookUrl
        ? await fetchFacebookPublic(body.facebookUrl)
        : facebookFetch;
      facebookFetch = facebookSignals;

      combinedText = [
        "=== HOMEPAGE ===",
        homepageSignals,
        storySignals ? "=== ABOUT/STORY PAGE ===" : "",
        storySignals,
        instagramFetch.signals ? "=== INSTAGRAM ===" : "",
        instagramFetch.signals,
        facebookFetch.signals ? "=== FACEBOOK ===" : "",
        facebookFetch.signals,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (
        homepageSignals === "No readable content found" &&
        !storySignals &&
        !instagramFetch.signals &&
        !facebookFetch.signals
      ) {
        throw new Error("No readable content found");
      }
    } catch {
      const facts = absentFacts();
      const apify = toApifyMetrics(instagramFetch, facebookFetch);
      return await jsonWithOptionalReport(
        {
          facts,
          apifyMetrics: apify,
          modelVersion: HEALTH_CHECK_MODEL_VERSION,
          scrapeOk: false,
          observation: "Could not access your website — check the URL",
        },
        persistBullfinch,
        {
          websiteUrl,
          instagramHandle: body.instagramHandle?.trim() || "",
          facebookUrl: body.facebookUrl?.trim() || "",
          facts,
          apifyMetrics: apify,
          observation: "Could not access your website — check the URL",
          utm: body.utm ?? null,
          businessName: body.businessName,
        },
      );
    }

    const apifyMetrics = toApifyMetrics(instagramFetch, facebookFetch);

    try {
      const pageText = pageTextForCache(
        homepageSignalsForCache,
        storySignalsForCache,
      );
      const useFactCache = shouldUseFactCache(pageText);
      let contentHash: string | null = null;
      let cached: Record<string, unknown> | null = null;
      if (!useFactCache) {
        console.log("health_check_fact_cache skip", {
          reason: "page-text-too-short",
          page_text_chars: pageText.length,
        });
      } else {
        contentHash = await factsCacheContentHash({
          websiteUrl,
          modelVersion: HEALTH_CHECK_MODEL_VERSION,
          homepageSignals: homepageSignalsForCache,
          storySignals: storySignalsForCache,
          instagramSignals: instagramFetch.signals,
          facebookSignals: facebookFetch.signals,
        });
        cached = await lookupFactCache(contentHash, HEALTH_CHECK_SCORER_VERSION);
      }
      let rawFacts: HealthCheckFacts;
      if (cached) {
        rawFacts = normalizeFacts(cached);
      } else {
        const seed = await factsExtractionSeed(websiteUrl, HEALTH_CHECK_SCORER_VERSION);
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: HEALTH_CHECK_MODEL_VERSION,
            max_tokens: 600,
            temperature: 0,
            seed,
            response_format: FACTS_RESPONSE_FORMAT,
            messages: [
              { role: "system", content: FACTS_SYSTEM_PROMPT },
              {
                role: "user",
                content: `Extract facts from this content:\n\n${combinedText}`,
              },
            ],
          }),
        });

        if (!aiResp.ok) throw new Error("OpenAI request failed");

        const data = await aiResp.json();
        const content =
          data?.choices?.[0]?.message?.content != null
            ? String(data.choices[0].message.content)
            : "";
        if (!content) throw new Error("Empty model response");

        rawFacts = parseFactsJson(content);
        if (useFactCache && contentHash) {
          await storeFactCache(contentHash, HEALTH_CHECK_SCORER_VERSION, rawFacts);
        }
      }

      // Deterministic proof override: a valid JSON-LD AggregateRating (parseable
      // ratingValue + count above the floor) is higher-confidence than the LLM's
      // judgement, so force proofOnPage="real". Composes with — never downgrades —
      // the LLM's own "real" verdict from testimonials/press/endorsements.
      if (aggregateRatingProof && rawFacts.proofOnPage !== "real") {
        console.log(
          "[proofOnPage] deterministic override via JSON-LD AggregateRating",
          JSON.stringify(aggregateRatingProof)
        );
        rawFacts.proofOnPage = "real";
      }

      const facts = sanitizeFactsForScoring(rawFacts, apifyMetrics);
      const deterministicScores = computeDeterministicScores(rawFacts, apifyMetrics);

      let findingsPayload: FindingsResponse | null = null;
      try {
        findingsPayload = await generateFindingsProse(
          apiKey,
          facts,
          apifyMetrics,
          deterministicScores,
          priorRun,
          pillarContext,
          combinedText
        );
      } catch (findingsErr) {
        console.warn("Findings generation failed:", findingsErr);
      }

      const observation = deterministicScores.socialIncomplete
        ? "Couldn't read your social this time — this score covers Website Clarity and Brand Story only."
        : "Analysis complete";
      const strengths =
        deterministicScores.website >= 100 || deterministicScores.website > 95
          ? []
          : findingsPayload?.strengths;
      const gaps =
        deterministicScores.website >= 100 || deterministicScores.website > 95
          ? []
          : findingsPayload?.gaps;

      return await jsonWithOptionalReport(
        {
          facts,
          apifyMetrics,
          modelVersion: HEALTH_CHECK_MODEL_VERSION,
          scrapeOk: true,
          observation,
          findings: findingsPayload?.findings,
          strengths,
          gaps,
          overall: deterministicScores.overall,
          overallRaw: deterministicScores.overallRaw,
          capped: deterministicScores.capped,
          socialIncomplete: deterministicScores.socialIncomplete,
          overallSummary: deterministicScores.capped
            ? OVERALL_CAP_FRAMING_COPY
            : undefined,
        },
        persistBullfinch,
        {
          websiteUrl,
          instagramHandle: body.instagramHandle?.trim() || "",
          facebookUrl: body.facebookUrl?.trim() || "",
          facts,
          apifyMetrics,
          observation,
          strengths,
          gaps,
          findings: findingsPayload?.findings,
          utm: body.utm ?? null,
          businessName: body.businessName,
        },
      );
    } catch {
      const facts = absentFacts();
      return await jsonWithOptionalReport(
        {
          facts,
          apifyMetrics,
          modelVersion: HEALTH_CHECK_MODEL_VERSION,
          scrapeOk: true,
          observation: "Website found but qualitative extraction was incomplete",
        },
        persistBullfinch,
        {
          websiteUrl,
          instagramHandle: body.instagramHandle?.trim() || "",
          facebookUrl: body.facebookUrl?.trim() || "",
          facts,
          apifyMetrics,
          observation: "Website found but qualitative extraction was incomplete",
          utm: body.utm ?? null,
          businessName: body.businessName,
        },
      );
    }
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
