import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { computeDeterministicScores, OVERALL_CAP_FRAMING_COPY } from "./deterministicScores.ts";
import { extractAllSignals } from "./extractSignals.ts";

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

async function fetchInstagramPublic(handle: string): Promise<InstagramFetchResult> {
  const empty: InstagramFetchResult = {
    signals: "",
    found: false,
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
  if (!username) return empty;

  const apiToken = Deno.env.get("APIFY_API_TOKEN");
  if (!apiToken) {
    console.error("APIFY_API_TOKEN not set");
    return empty;
  }

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
      return empty;
    }

    const items = await res.json();
    const profile = Array.isArray(items) ? items[0] : null;

    if (!profile) return empty;

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
    if (latestPosts.length > 0) {
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
    return empty;
  }
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
    { "dimension": "Website Clarity", "score": number, "finding": "string" },
    { "dimension": "Brand Story", "score": number, "finding": "string" },
    { "dimension": "Content Consistency", "score": number, "finding": "string" },
    { "dimension": "Social Presence", "score": number, "finding": "string" }
  ],
  "strengths": ["string"],
  "gaps": ["string"]
}

RULES:
- You receive CURRENT dimension scores (already computed from the live site). Each finding's "score" MUST exactly match the provided score for that dimension. Never invent or adjust scores.
- Write 2–3 sentences per finding: direct, founder-friendly, specific to what you see in the scrape.
- strengths: 1–3 items for Website Clarity only (what is working).
- gaps: 1–3 priority gaps for Website Clarity only (what to fix next).

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
  findings: Array<{ dimension: string; score: number; finding: string }>;
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
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const findings = Array.isArray(parsed.findings)
      ? parsed.findings
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const dimension = typeof row.dimension === "string" ? row.dimension.trim() : "";
            const score = Number(row.score);
            const finding = typeof row.finding === "string" ? row.finding.trim() : "";
            if (!dimension || !finding || Number.isNaN(score)) return null;
            return { dimension, score, finding };
          })
          .filter(
            (item): item is { dimension: string; score: number; finding: string } =>
              item !== null
          )
      : [];
    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const gaps = Array.isArray(parsed.gaps)
      ? parsed.gaps.map((g) => String(g).trim()).filter(Boolean)
      : [];
    if (findings.length === 0) return null;
    return { findings, strengths, gaps };
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return parseFindingsJson(match[0]);
  }
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
    scoreDeltas: priorRun
      ? {
          website: scores.website - priorRun.scores.website,
          brandStory: scores.brandStory - priorRun.scores.brandStory,
          content: scores.content - priorRun.scores.content,
          social: scores.social - priorRun.scores.social,
          overall: scores.overall - priorRun.scores.overall,
        }
      : null,
    extractedFacts: facts,
    socialMetrics: {
      instagramFound: apifyMetrics.instagramFound,
      facebookFound: apifyMetrics.facebookFound,
      followers: apifyMetrics.followers,
      latestPostDaysAgo: apifyMetrics.latestPostDaysAgo,
      postsPerWeek: apifyMetrics.postsPerWeek,
    },
    priorRun: priorRun ?? null,
    pillarContext: pillarContext ?? null,
    scrapeSummary: scrapeSummary.slice(0, 4000),
  };

  const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HEALTH_CHECK_MODEL_VERSION,
      max_tokens: 1400,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FINDINGS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write findings for this health check:\n\n${JSON.stringify(userPayload, null, 2)}`,
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

  return parseFindingsJson(content);
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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

  try {
    const body = (await req.json()) as Partial<Input>;
    console.log("Raw instagramHandle received:", body.instagramHandle);
    const priorRun = normalizePriorRun(body.priorRun);
    const pillarContext = normalizePillarContext(body.pillarContext);
    const websiteUrl = normaliseUrl(body.websiteUrl ?? "");
    if (!websiteUrl) return json({ error: "websiteUrl is required" }, 400);

    let combinedText = "";
    let instagramFetch: InstagramFetchResult = {
      signals: "",
      found: false,
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

      const fetchHomepageSignals = async () => {
        const res = await fetch(websiteUrl, {
          headers: { "User-Agent": "marktr-bot/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        return extractAllSignals(html, websiteUrl);
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

      const [homepageSignals, storySignals, instagramFetchResult] = await Promise.all([
        fetchHomepageSignals(),
        fetchStorySignals(),
        body.instagramHandle
          ? fetchInstagramPublic(body.instagramHandle)
          : Promise.resolve(emptyInstagram),
      ]);

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
      return json({
        facts: absentFacts(),
        apifyMetrics: toApifyMetrics(instagramFetch, facebookFetch),
        modelVersion: HEALTH_CHECK_MODEL_VERSION,
        scrapeOk: false,
        observation: "Could not access your website — check the URL",
      });
    }

    const apifyMetrics = toApifyMetrics(instagramFetch, facebookFetch);

    try {
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
          response_format: { type: "json_object" },
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

      const rawFacts = parseFactsJson(content);
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

      return json({
        facts,
        apifyMetrics,
        modelVersion: HEALTH_CHECK_MODEL_VERSION,
        scrapeOk: true,
        observation: "Analysis complete",
        findings: findingsPayload?.findings,
        strengths: findingsPayload?.strengths,
        gaps: findingsPayload?.gaps,
        overall: deterministicScores.overall,
        overallRaw: deterministicScores.overallRaw,
        capped: deterministicScores.capped,
        overallSummary: deterministicScores.capped
          ? OVERALL_CAP_FRAMING_COPY
          : undefined,
      });
    } catch {
      return json({
        facts: absentFacts(),
        apifyMetrics,
        modelVersion: HEALTH_CHECK_MODEL_VERSION,
        scrapeOk: true,
        observation: "Website found but qualitative extraction was incomplete",
      });
    }
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
