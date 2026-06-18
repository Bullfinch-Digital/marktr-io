import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Input = {
  websiteUrl: string;
  instagramHandle?: string;
  facebookUrl?: string;
};

type StoryAssessment = {
  hasFounderStory: boolean;
  founderStoryQuality: "none" | "basic" | "good" | "compelling";
  speaksToSpecificCustomer: boolean;
  hasDistinctivePositioning: boolean;
  hasEmotionalHook: boolean;
  missingElements: string[];
};

type SocialScores = {
  instagramFound: boolean;
  facebookFound: boolean;
  instagramFollowers: string;
  instagramPostCount: string;
  instagramBioScore?: number | null;
  contentConsistencyScore: number;
  socialObservation: string;
  audienceObservation?: string | null;
  engagementProxyScore?: number | null;
  engagementObservation?: string | null;
};

type InstagramFetchResult = {
  signals: string;
  found: boolean;
  followers: string;
  postCount: string;
  avgLikes?: number;
  avgComments?: number;
};

type FacebookFetchResult = {
  signals: string;
  found: boolean;
};

type WebsiteScoreResult = {
  hasValueProposition: boolean;
  hasClearAudience: boolean;
  hasCallToAction: boolean;
  hasSocialProof: boolean;
  hasContactOrCapture: boolean;
  clarityScore: number;
  observation: string;
  strengths?: string[];
  gaps?: string[];
  storyAssessment?: StoryAssessment | null;
  socialScores?: SocialScores | null;
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

function parseMaybeJson(raw: string): WebsiteScoreResult {
  try {
    return JSON.parse(raw) as WebsiteScoreResult;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON.");
    return JSON.parse(match[0]) as WebsiteScoreResult;
  }
}

function normaliseUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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
      avgLikes: avgLikes > 0 ? avgLikes : undefined,
      avgComments: avgComments > 0 ? avgComments : undefined,
    };
  } catch (err) {
    console.error("Apify fetch error:", err);
    return empty;
  }
}

async function fetchFacebookPublic(facebookUrl: string): Promise<FacebookFetchResult> {
  const empty: FacebookFetchResult = { signals: "", found: false };

  try {
    if (!facebookUrl.trim()) return empty;

    const url = facebookUrl.startsWith("http")
      ? facebookUrl
      : `https://${facebookUrl}`;

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

function extractAllSignals(html: string, url: string): string {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m?.[1]?.trim() ?? "";
  };
  const getAll = (pattern: RegExp) => {
    return [...html.matchAll(pattern)]
      .map((m) => m[1]?.trim())
      .filter(Boolean) as string[];
  };

  const title = get(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc =
    get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{10,})/i) ||
    get(
      /<meta[^>]*content=["']([^"']{10,})["'][^>]*name=["']description["']/i
    );
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

  const h1s = getAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)
    .map((h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 2)
    .slice(0, 3);

  const h2s = getAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
    .map((h) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 2 && t.length < 120)
    .slice(0, 5);

  const navLinks = getAll(/<a[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)
    .map((t) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 1 && t.length < 40)
    .filter((t) => !/^(£|\$|[0-9])/.test(t))
    .slice(0, 20);

  const ctaPatterns =
    /\b(buy|shop|get|start|subscribe|sign up|book|order|download|try|learn|discover|explore|contact|join|apply)\b/i;
  const ctaLinks = navLinks.filter((t) => ctaPatterns.test(t)).slice(0, 5);

  const socialProofPatterns =
    /(★|☆|\d+(\.\d+)?\s*stars?|\d+\s*reviews?|award|rated|certified|trusted|verified|testimonial|customers?)/gi;
  const socialProofMatches = (html.match(socialProofPatterns) || []).slice(0, 5);

  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  let schemaType = "";
  let schemaDesc = "";
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      schemaType = schema["@type"] ?? "";
      schemaDesc = schema["description"] ?? "";
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  const footerText = footerMatch
    ? footerMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400)
    : "";

  const mainMatch =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<div[^>]*id=["']main["'][^>]*>([\s\S]*?)<\/div>/i);
  const mainText = mainMatch
    ? mainMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200)
    : "";

  const hasContact = /contact|get in touch|reach us|email us|call us/i.test(html);
  const hasEmail =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(html);

  const socialPlatforms = [
    "instagram",
    "facebook",
    "twitter",
    "linkedin",
    "tiktok",
    "youtube",
  ].filter((p) => new RegExp(p, "i").test(html));

  const parts = [
    `URL: ${url}`,
    title && `Page title: ${title}`,
    metaDesc && `Meta description: ${metaDesc}`,
    ogTitle && ogTitle !== title && `OG title: ${ogTitle}`,
    ogDesc && ogDesc !== metaDesc && `OG description: ${ogDesc}`,
    h1s.length && `H1 headings: ${h1s.join(" | ")}`,
    h2s.length && `H2 headings: ${h2s.join(" | ")}`,
    navLinks.length && `Navigation: ${navLinks.join(", ")}`,
    ctaLinks.length && `CTA buttons/links: ${ctaLinks.join(", ")}`,
    socialProofMatches.length &&
      `Social proof signals: ${socialProofMatches.join(", ")}`,
    schemaType && `Schema type: ${schemaType}`,
    schemaDesc && `Schema description: ${schemaDesc}`,
    socialPlatforms.length && `Social media: ${socialPlatforms.join(", ")}`,
    hasContact && "Has contact information: yes",
    hasEmail && "Has email address: yes",
    footerText && `Footer content: ${footerText}`,
    mainText && `Main page content: ${mainText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return parts || "No readable content found";
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

function normalizeStoryAssessment(
  raw: StoryAssessment | null | undefined
): StoryAssessment | null {
  if (!raw || typeof raw !== "object") return null;

  const quality = raw.founderStoryQuality;
  const founderStoryQuality =
    quality === "basic" ||
    quality === "good" ||
    quality === "compelling" ||
    quality === "none"
      ? quality
      : "none";

  return {
    hasFounderStory: Boolean(raw.hasFounderStory),
    founderStoryQuality,
    speaksToSpecificCustomer: Boolean(raw.speaksToSpecificCustomer),
    hasDistinctivePositioning: Boolean(raw.hasDistinctivePositioning),
    hasEmotionalHook: Boolean(raw.hasEmotionalHook),
    missingElements: Array.isArray(raw.missingElements)
      ? raw.missingElements.map((el) => String(el).trim()).filter(Boolean)
      : [],
  };
}

function scoreFromPostCount(posts: number): number {
  if (isNaN(posts)) return 45;
  if (posts > 500) return 80;
  if (posts > 200) return 68;
  if (posts > 50) return 52;
  if (posts > 10) return 38;
  return 25;
}

function normalizeSocialScores(
  raw: SocialScores | null | undefined,
  instagram: InstagramFetchResult,
  facebook: FacebookFetchResult
): SocialScores | null {
  const hasSocialInput = instagram.signals || facebook.signals;
  if (!hasSocialInput && !raw) return null;

  const instagramFound = instagram.found;
  const facebookFound = facebook.found;
  const instagramPostCount = instagram.postCount;

  const contentConsistencyScore = !instagramFound
    ? 0
    : instagramPostCount
      ? Math.min(
          100,
          Math.max(
            0,
            raw?.contentConsistencyScore ??
              scoreFromPostCount(parseInt(instagramPostCount, 10))
          )
        )
      : 45;

  let socialObservation =
    instagramFound || facebookFound
      ? String(raw?.socialObservation ?? "").trim().slice(0, 180)
      : "";

  if (
    instagramFound &&
    (instagram.avgLikes ?? 0) > 0 &&
    !socialObservation.toLowerCase().includes("like")
  ) {
    const engagementNote =
      (instagram.avgComments ?? 0) > 0
        ? `Recent posts average ${instagram.avgLikes} likes and ${instagram.avgComments} comments`
        : `Recent posts average ${instagram.avgLikes} likes per post`;
    socialObservation = socialObservation
      ? `${socialObservation} — ${engagementNote}`.slice(0, 180)
      : engagementNote.slice(0, 180);
  }

  return {
    instagramFound,
    facebookFound,
    instagramFollowers: instagram.followers,
    instagramPostCount,
    instagramBioScore: instagramFound
      ? Math.min(100, Math.max(0, Number(raw?.instagramBioScore ?? 0)))
      : null,
    contentConsistencyScore,
    socialObservation,
    audienceObservation: instagramFound
      ? String(raw?.audienceObservation ?? "").trim().slice(0, 180) || null
      : null,
    engagementProxyScore: instagramFound
      ? Math.min(100, Math.max(0, Number(raw?.engagementProxyScore ?? 0)))
      : null,
    engagementObservation: instagramFound
      ? String(raw?.engagementObservation ?? "").trim().slice(0, 180) || null
      : null,
  };
}

const SYSTEM_PROMPT = `You are a brand strategist and marketing consultant specialising in founder-led small businesses. You have been given content extracted from a business website and, when available, their public Instagram and Facebook profiles.

Your job is NOT to do a generic SEO or UX audit. Your job is to assess how well this founder business communicates its story, speaks to a specific customer, and positions itself distinctively — and to identify the specific gaps that are costing them customers.

Assess the website and return ONLY valid JSON with no markdown or backticks:

{
  "hasValueProposition": boolean,
  "hasClearAudience": boolean,
  "hasCallToAction": boolean,
  "hasSocialProof": boolean,
  "hasContactOrCapture": boolean,
  "clarityScore": number (0-100),
  "observation": string (max 15 words, most important specific finding about their brand communication),
  "strengths": [string, string],
  "gaps": [string, string],
  "storyAssessment": {
    "hasFounderStory": boolean,
    "founderStoryQuality": "none" | "basic" | "good" | "compelling",
    "speaksToSpecificCustomer": boolean,
    "hasDistinctivePositioning": boolean,
    "hasEmotionalHook": boolean,
    "missingElements": [string]
  },
  "socialScores": {
    "instagramFound": boolean,
    "facebookFound": boolean,
    "instagramFollowers": string,
    "instagramPostCount": string,
    "instagramBioScore": number (0-100),
    "contentConsistencyScore": number,
    "socialObservation": string,
    "audienceObservation": string (max 15 words — based on the bio's specificity to a target customer. e.g. "Bio doesn't name who this campsite is for"),
    "engagementProxyScore": number (0-100 — NOT real engagement, a REACH PROXY based on follower count relative to post count and account activity),
    "engagementObservation": string (max 15 words, framed honestly as reach/visibility based on follower count — e.g. "562 followers suggests a small but engaged local audience" or "Limited following may restrict organic reach")
  }
}

ASSESSMENT CRITERIA:

hasValueProposition: true if it is immediately clear what the business does and who it helps.

hasClearAudience: true if the content speaks to a specific type of person rather than everyone. Look for language that addresses a particular customer's values, frustrations or aspirations.

hasCallToAction: true if there are clear invitations to take action — links, buttons, or text using words like subscribe, buy, shop, start, book, get, discover, explore, contact, join, try, order.

hasSocialProof: true if there are reviews, ratings, awards, testimonials, press mentions, customer counts, or trust badges.

hasContactOrCapture: true if there is a contact page, email address, phone number, or email capture form.

clarityScore: 0-100 score for how clearly and compellingly the business communicates its value to a first-time visitor.
Scoring guide:
- 80-98: Exceptional clarity — strong story, clear audience, distinctive positioning
- 65-79: Good — communicates the basics well with some gaps
- 45-64: Average — some good elements but missing key pieces
- 20-44: Weak — unclear, generic, or poorly targeted
- 0-19: Very poor — visitor would struggle to understand the offer

Be honest but fair. A site with a compelling founder story, clear social proof and obvious CTAs should score 75+.

observation: ONE specific, honest observation — not generic advice. Name something specific you can see or something specific that is missing. Example: "Founder story is compelling but doesn't name the customer it's for" or "Strong social proof but no clear email capture".

strengths: TWO specific things this business does well from a brand storytelling perspective. Be specific — reference what you actually found. Not generic praise.

gaps: TWO specific gaps that are costing this business customers. Focus on:
- Story gaps: is the founder narrative present, specific, and emotionally resonant?
- Audience gaps: does the content speak to a defined customer, or does it feel like it's trying to speak to everyone?
- Positioning gaps: what makes this business different from competitors — and is that difference clearly stated?
- Conversion gaps: email capture, lead magnets, or ways to stay in touch with interested visitors who aren't ready to buy

Do NOT flag: missing button elements, navigation structure, page speed, technical SEO, meta tag optimisation, or any UX/technical issues. Only brand, story and marketing gaps.

storyAssessment:
- hasFounderStory: true if there is any narrative about who started the business and why
- founderStoryQuality:
  "none" = no story found
  "basic" = mentions founder but no narrative or emotion
  "good" = has a clear founding narrative with some purpose
  "compelling" = emotionally resonant story with clear mission, specific details, and a reason to care
- speaksToSpecificCustomer: true if the language addresses a specific type of person rather than everyone
- hasDistinctivePositioning: true if it is clear what makes this business different from competitors
- hasEmotionalHook: true if there is language designed to create an emotional connection — shared values, a cause, a community, or a belief
- missingElements: list the specific story elements that are absent or weak — from: "founding moment", "clear why/purpose", "specific customer named", "what makes us different", "customer community language", "proof of impact", "vision for the future"

SOCIAL MEDIA ASSESSMENT:
When Instagram data is provided, assess:
- Does the bio speak to a specific customer or is it generic?
- Does the follower count suggest an established or growing presence?
- Does the account appear active based on post count?
- Is the Instagram bio consistent with the website positioning?

When Facebook data is provided, assess:
- Is the page description compelling?
- Does it align with website messaging?

Add social media observations to your gaps and strengths where relevant. For example:
- "Instagram bio doesn't mention who the product is for"
- "Strong Instagram following but bio doesn't reflect website story"
- "Facebook and Instagram messaging inconsistent with website positioning"
- "Instagram bio well-aligned with website value proposition"

socialScores:
- instagramFound: true if Instagram profile data was provided in the input
- facebookFound: true if Facebook page data was provided in the input
- instagramFollowers: follower count string from Instagram data (or empty string)
- instagramPostCount: post count string from Instagram data (or empty string)
- instagramBioScore: 0-100, how clearly the Instagram bio speaks to a specific target customer (separate from the website audience assessment).
- audienceObservation: max 15 words — one specific observation about whether the Instagram bio names or speaks to a defined target customer.
- engagementProxyScore: 0-100 reach proxy based on follower count and posting activity — NOT a real engagement rate, which requires account connection. Score generously for active accounts with reasonable followings relative to their niche size.
- engagementObservation: max 15 words — honest reach/visibility observation based on follower count and activity, not actual engagement rate.
- contentConsistencyScore: 0-100 based on Instagram post count and apparent activity level. Scoring guide:
  - If Instagram not found or no post count: return 0
  - Posts > 500: 75-90 (very active)
  - Posts 200-500: 60-75 (active)
  - Posts 50-200: 40-60 (moderate)
  - Posts < 50: 20-40 (limited)
  - Adjust down if follower count seems very low relative to post count
- socialObservation: max 15 words, one specific observation about their social presence — or empty string if no social data was provided
- If Instagram is not found (instagramFound: false), omit or set to null: instagramBioScore, audienceObservation, engagementProxyScore, and engagementObservation`;

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
    const websiteUrl = normaliseUrl(body.websiteUrl ?? "");
    if (!websiteUrl) return json({ error: "websiteUrl is required" }, 400);

    let combinedText = "";
    let instagramFetch: InstagramFetchResult = {
      signals: "",
      found: false,
      followers: "",
      postCount: "",
    };
    let facebookFetch: FacebookFetchResult = { signals: "", found: false };

    try {
      const emptyInstagram: InstagramFetchResult = {
        signals: "",
        found: false,
        followers: "",
        postCount: "",
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
        score: 35,
        observation: "Could not access your website — check the URL",
        strengths: [],
        gaps: [],
        storyAssessment: null,
        socialScores: null,
        breakdown: null,
      });
    }

    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 750,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Website content:\n\n${combinedText}`,
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

      const result = parseMaybeJson(content);

      const criteriaScore = [
        Boolean(result.hasValueProposition),
        Boolean(result.hasClearAudience),
        Boolean(result.hasCallToAction),
        Boolean(result.hasSocialProof),
        Boolean(result.hasContactOrCapture),
      ].filter(Boolean).length * 14;

      const finalScore = Math.min(
        98,
        Math.round(criteriaScore + Number(result.clarityScore || 0) * 0.3)
      );

      return json({
        score: finalScore,
        observation: String(result.observation || "").trim().slice(0, 180),
        strengths: Array.isArray(result.strengths)
          ? result.strengths.map((s) => String(s).trim()).filter(Boolean)
          : [],
        gaps: Array.isArray(result.gaps)
          ? result.gaps.map((g) => String(g).trim()).filter(Boolean)
          : [],
        storyAssessment: normalizeStoryAssessment(result.storyAssessment),
        socialScores: normalizeSocialScores(
          result.socialScores,
          instagramFetch,
          facebookFetch
        ),
        breakdown: {
          hasValueProposition: Boolean(result.hasValueProposition),
          hasClearAudience: Boolean(result.hasClearAudience),
          hasCallToAction: Boolean(result.hasCallToAction),
          hasSocialProof: Boolean(result.hasSocialProof),
          hasContactOrCapture: Boolean(result.hasContactOrCapture),
        },
      });
    } catch {
      return json({
        score: 40,
        observation: "Website found but could not be fully analysed",
        strengths: [],
        gaps: [],
        storyAssessment: null,
        socialScores: null,
        breakdown: null,
      });
    }
  } catch (err) {
    return json({ error: "Unhandled error", message: String(err) }, 500);
  }
});
