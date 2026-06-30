/** Source-aware engagement input — scraped now, connected later (§5). */
export type EngagementSource = "scraped" | "connected";

export type EngagementInput = {
  source: EngagementSource;
  followers: number;
  avgLikes: number;
  avgComments: number;
  /** Reserved for Meta API connected path. */
  avgSaves?: number;
  avgShares?: number;
  reach?: number;
};

export type EngagementBand = "good" | "partial" | "absent";

export type PostingRecencyBand = "good" | "partial" | "absent";
export type PostingRegularityBand = "good" | "partial" | "absent";

export type ProfileCompletenessBand = "complete" | "bare" | "not_found";

export type AudienceSizeBand = "under_500" | "500_2k" | "2k_10k" | "10k_plus";

export type CrossPlatformBand = "both" | "one" | "none";

/** Raw Apify / scrape integers — banded before rules (§5). */
export type ApifySocialMetrics = {
  instagramFound: boolean;
  facebookFound: boolean;
  followers: number;
  avgLikes: number;
  avgComments: number;
  /** Days since latest post; null when unknown. */
  latestPostDaysAgo: number | null;
  /** Posts per week over recent sample; null when unknown. */
  postsPerWeek: number | null;
  bioLength: number;
  hasExternalUrl: boolean;
  hasFullName: boolean;
};

export type BandedSocialSignals = {
  engagement: EngagementBand;
  engagementRatePercent: number;
  postingRecency: PostingRecencyBand;
  postingRegularity: PostingRegularityBand;
  profileCompleteness: ProfileCompletenessBand;
  audienceSize: AudienceSizeBand;
  crossPlatform: CrossPlatformBand;
  engagementInput: EngagementInput;
};

export function absentApifyMetrics(): ApifySocialMetrics {
  return {
    instagramFound: false,
    facebookFound: false,
    followers: 0,
    avgLikes: 0,
    avgComments: 0,
    latestPostDaysAgo: null,
    postsPerWeek: null,
    bioLength: 0,
    hasExternalUrl: false,
    hasFullName: false,
  };
}

export function normalizeApifyMetrics(raw: unknown): ApifySocialMetrics {
  if (!raw || typeof raw !== "object") return absentApifyMetrics();
  const m = raw as Record<string, unknown>;
  return {
    instagramFound: Boolean(m.instagramFound),
    facebookFound: Boolean(m.facebookFound),
    followers: Math.max(0, Number(m.followers) || 0),
    avgLikes: Math.max(0, Number(m.avgLikes) || 0),
    avgComments: Math.max(0, Number(m.avgComments) || 0),
    latestPostDaysAgo:
      m.latestPostDaysAgo === null || m.latestPostDaysAgo === undefined
        ? null
        : Math.max(0, Number(m.latestPostDaysAgo) || 0),
    postsPerWeek:
      m.postsPerWeek === null || m.postsPerWeek === undefined
        ? null
        : Math.max(0, Number(m.postsPerWeek) || 0),
    bioLength: Math.max(0, Number(m.bioLength) || 0),
    hasExternalUrl: Boolean(m.hasExternalUrl),
    hasFullName: Boolean(m.hasFullName),
  };
}

function followerTier(
  followers: number
): "nano" | "mid" | "large" {
  if (followers >= 100_000) return "large";
  if (followers >= 10_000) return "mid";
  return "nano";
}

/** Engagement = avg(likes + comments) / followers × 100 (§5). */
export function computeEngagementRatePercent(input: EngagementInput): number {
  if (input.followers <= 0) return 0;
  return ((input.avgLikes + input.avgComments) / input.followers) * 100;
}

export function bandEngagementForSize(input: EngagementInput): EngagementBand {
  const rate = computeEngagementRatePercent(input);
  const tier = followerTier(input.followers);

  if (tier === "nano") {
    if (rate >= 4.0) return "good";
    if (rate >= 1.5) return "partial";
    return "absent";
  }
  if (tier === "mid") {
    if (rate >= 2.5) return "good";
    if (rate >= 1.0) return "partial";
    return "absent";
  }
  if (rate >= 1.5) return "good";
  if (rate >= 0.7) return "partial";
  return "absent";
}

export function bandPostingRecency(
  latestPostDaysAgo: number | null,
  instagramFound: boolean
): PostingRecencyBand {
  if (!instagramFound || latestPostDaysAgo === null) return "absent";
  if (latestPostDaysAgo <= 30) return "good";
  if (latestPostDaysAgo <= 90) return "partial";
  return "absent";
}

export function bandPostingRegularity(
  postsPerWeek: number | null,
  instagramFound: boolean
): PostingRegularityBand {
  if (!instagramFound || postsPerWeek === null) return "absent";
  if (postsPerWeek >= 2) return "good";
  if (postsPerWeek >= 1) return "partial";
  return "absent";
}

export function bandProfileCompleteness(
  metrics: ApifySocialMetrics
): ProfileCompletenessBand {
  if (!metrics.instagramFound) return "not_found";
  const hasBio = metrics.bioLength >= 20;
  const hasIdentity = metrics.hasFullName || metrics.hasExternalUrl;
  if (hasBio && hasIdentity) return "complete";
  return "bare";
}

export function bandAudienceSize(followers: number): AudienceSizeBand {
  if (followers < 500) return "under_500";
  if (followers < 2_000) return "500_2k";
  if (followers < 10_000) return "2k_10k";
  return "10k_plus";
}

export function bandCrossPlatform(
  instagramFound: boolean,
  facebookFound: boolean
): CrossPlatformBand {
  if (instagramFound && facebookFound) return "both";
  if (instagramFound || facebookFound) return "one";
  return "none";
}

export function bandSocialSignals(
  metrics: ApifySocialMetrics,
  source: EngagementSource = "scraped"
): BandedSocialSignals {
  const engagementInput: EngagementInput = {
    source,
    followers: metrics.followers,
    avgLikes: metrics.avgLikes,
    avgComments: metrics.avgComments,
  };

  return {
    engagement: metrics.instagramFound
      ? bandEngagementForSize(engagementInput)
      : "absent",
    engagementRatePercent: computeEngagementRatePercent(engagementInput),
    postingRecency: bandPostingRecency(
      metrics.latestPostDaysAgo,
      metrics.instagramFound
    ),
    postingRegularity: bandPostingRegularity(
      metrics.postsPerWeek,
      metrics.instagramFound
    ),
    profileCompleteness: bandProfileCompleteness(metrics),
    audienceSize: metrics.instagramFound
      ? bandAudienceSize(metrics.followers)
      : "under_500",
    crossPlatform: bandCrossPlatform(
      metrics.instagramFound,
      metrics.facebookFound
    ),
    engagementInput,
  };
}

/** Compute posts/week from Apify latestPosts timestamps. */
export function computePostsPerWeek(
  postTimestampsMs: number[]
): number | null {
  const valid = postTimestampsMs.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length < 2) return valid.length === 1 ? 0 : null;

  const sorted = [...valid].sort((a, b) => b - a);
  const newest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const spanWeeks = (newest - oldest) / (7 * 24 * 60 * 60 * 1000);
  if (spanWeeks < 0.5) return sorted.length;
  return sorted.length / spanWeeks;
}

export function computeLatestPostDaysAgo(
  postTimestampsMs: number[]
): number | null {
  const valid = postTimestampsMs.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length === 0) return null;
  const newest = Math.max(...valid);
  const days = (Date.now() - newest) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(days));
}

export function parsePostTimestamp(post: Record<string, unknown>): number | null {
  const candidates = [
    post.timestamp,
    post.takenAt,
    post.taken_at_timestamp,
    post.createdAt,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && c > 0) {
      return c > 1e12 ? c : c * 1000;
    }
    if (typeof c === "string" && c.trim()) {
      const ms = Date.parse(c);
      if (!Number.isNaN(ms)) return ms;
    }
  }
  return null;
}
