/**
 * Edge copy of client score engine — findings prompt context only.
 * Keep in sync with src/lib/healthCheck/scoreEngine.ts + socialBands.ts + factsSanitize.ts.
 */

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

type EngagementBand = "good" | "partial" | "absent";
type PostingRecencyBand = "good" | "partial" | "absent";
type PostingRegularityBand = "good" | "partial" | "absent";
type ProfileCompletenessBand = "complete" | "bare" | "not_found";
type AudienceSizeBand = "under_500" | "500_2k" | "2k_10k" | "10k_plus";
type CrossPlatformBand = "both" | "one" | "none";

const DIMENSION_WEIGHTS = {
  websiteClarity: 0.3,
  brandStory: 0.3,
  contentConsistency: 0.25,
  socialPresence: 0.15,
} as const;

/** Keep in sync with src/lib/healthCheck/constants.ts OVERALL_CAP */
const OVERALL_CAP = 92;

/** Keep in sync with src/lib/healthCheck/constants.ts OVERALL_CAP_FRAMING_COPY */
const OVERALL_CAP_FRAMING_COPY =
  "Your scores are genuinely strong across the board — we cap the automated overall at 92 because the last few points are the kind of thing that benefits from a human eye, not a scraper.";

const VALUE_PROP_PTS = { clear: 25, vague: 12, absent: 0 } as const;
const PRIMARY_CTA_PTS = { single: 20, competing: 10, absent: 0 } as const;
const PROOF_PTS = { real: 20, claimed: 8, absent: 0 } as const;
const PATH_PTS = { clear: 15, buried: 7, absent: 0 } as const;
const FOUNDER_PTS = { present: 30, partial: 15, absent: 0 } as const;
const STORY_SPECIFIC_PTS = { specific: 30, mixed: 15, boilerplate: 0 } as const;
const POV_PTS = { distinct: 25, implied: 12, absent: 0 } as const;
const VALUES_PTS = { concrete: 15, generic: 7, absent: 0 } as const;
const SOCIAL_REFLECTS_PTS = { expresses: 30, loose: 15, disconnected: 0 } as const;
const BIO_PTS = { complete: 20, thin: 10, absent: 0 } as const;

const RECENCY_PTS: Record<PostingRecencyBand, number> = {
  good: 25,
  partial: 12,
  absent: 0,
};
const REGULARITY_PTS: Record<PostingRegularityBand, number> = {
  good: 25,
  partial: 12,
  absent: 0,
};
const PROFILE_PTS: Record<ProfileCompletenessBand, number> = {
  complete: 20,
  bare: 10,
  not_found: 0,
};
const ENGAGEMENT_PTS: Record<EngagementBand, number> = {
  good: 40,
  partial: 20,
  absent: 0,
};
const AUDIENCE_PTS: Record<AudienceSizeBand, number> = {
  under_500: 10,
  "500_2k": 15,
  "2k_10k": 18,
  "10k_plus": 20,
};
const CROSS_PLATFORM_PTS: Record<CrossPlatformBand, number> = {
  both: 20,
  one: 10,
  none: 0,
};

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

function followerTier(followers: number): "nano" | "mid" | "large" {
  if (followers >= 100_000) return "large";
  if (followers >= 10_000) return "mid";
  return "nano";
}

function computeEngagementRatePercent(followers: number, avgLikes: number, avgComments: number): number {
  if (followers <= 0) return 0;
  return ((avgLikes + avgComments) / followers) * 100;
}

function bandEngagementForSize(metrics: ApifySocialMetrics): EngagementBand {
  const rate = computeEngagementRatePercent(metrics.followers, metrics.avgLikes, metrics.avgComments);
  const tier = followerTier(metrics.followers);
  if (!metrics.instagramFound) return "absent";
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

function bandSocialSignals(metrics: ApifySocialMetrics) {
  const postingRecency: PostingRecencyBand =
    !metrics.instagramFound || metrics.latestPostDaysAgo === null
      ? "absent"
      : metrics.latestPostDaysAgo <= 30
        ? "good"
        : metrics.latestPostDaysAgo <= 90
          ? "partial"
          : "absent";

  const postingRegularity: PostingRegularityBand =
    !metrics.instagramFound || metrics.postsPerWeek === null
      ? "absent"
      : metrics.postsPerWeek >= 2
        ? "good"
        : metrics.postsPerWeek >= 1
          ? "partial"
          : "absent";

  const profileCompleteness: ProfileCompletenessBand = !metrics.instagramFound
    ? "not_found"
    : metrics.bioLength >= 20 && (metrics.hasFullName || metrics.hasExternalUrl)
      ? "complete"
      : "bare";

  const audienceSize: AudienceSizeBand = !metrics.instagramFound
    ? "under_500"
    : metrics.followers < 500
      ? "under_500"
      : metrics.followers < 2_000
        ? "500_2k"
        : metrics.followers < 10_000
          ? "2k_10k"
          : "10k_plus";

  const crossPlatform: CrossPlatformBand =
    metrics.instagramFound && metrics.facebookFound
      ? "both"
      : metrics.instagramFound || metrics.facebookFound
        ? "one"
        : "none";

  return {
    engagement: bandEngagementForSize(metrics),
    postingRecency,
    postingRegularity,
    profileCompleteness,
    audienceSize,
    crossPlatform,
  };
}

function namesCustomerPoints(facts: HealthCheckFacts): number {
  if (facts.namesCustomer === "clear") return 20;
  if (facts.namesCustomer === "hinted" && facts.usesSecondPerson) return 20;
  if (facts.namesCustomer === "hinted") return 10;
  return 0;
}

function weightedOverallScore(scores: {
  websiteClarity: number;
  brandStory: number;
  contentConsistency: number;
  socialPresence: number;
}): { overall: number; overallRaw: number; capped: boolean } {
  const overallRaw = Math.round(
    scores.websiteClarity * DIMENSION_WEIGHTS.websiteClarity +
      scores.brandStory * DIMENSION_WEIGHTS.brandStory +
      scores.contentConsistency * DIMENSION_WEIGHTS.contentConsistency +
      scores.socialPresence * DIMENSION_WEIGHTS.socialPresence
  );
  const capped = overallRaw > OVERALL_CAP;
  return {
    overallRaw,
    overall: capped ? OVERALL_CAP : overallRaw,
    capped,
  };
}

export { OVERALL_CAP, OVERALL_CAP_FRAMING_COPY };

export function computeDeterministicScores(
  facts: HealthCheckFacts,
  apifyMetrics: ApifySocialMetrics
): {
  website: number;
  brandStory: number;
  content: number;
  social: number;
  overall: number;
  overallRaw: number;
  capped: boolean;
} {
  const scoredFacts = sanitizeFactsForScoring(facts, apifyMetrics);
  const socialBands = bandSocialSignals(apifyMetrics);
  const hasSocialProfile = hasAnySocialProfile(apifyMetrics);

  const website =
    VALUE_PROP_PTS[scoredFacts.valueProp] +
    namesCustomerPoints(scoredFacts) +
    PRIMARY_CTA_PTS[scoredFacts.primaryCTA] +
    PROOF_PTS[scoredFacts.proofOnPage] +
    PATH_PTS[scoredFacts.pathToBuyContact];

  const brandStory =
    FOUNDER_PTS[scoredFacts.founderStory] +
    STORY_SPECIFIC_PTS[scoredFacts.storySpecific] +
    POV_PTS[scoredFacts.pointOfView] +
    VALUES_PTS[scoredFacts.valuesMission];

  const content =
    RECENCY_PTS[socialBands.postingRecency] +
    REGULARITY_PTS[socialBands.postingRegularity] +
    SOCIAL_REFLECTS_PTS[scoredFacts.socialReflectsStory] +
    BIO_PTS[scoredFacts.bioOnMessage];

  const social = hasSocialProfile
    ? PROFILE_PTS[socialBands.profileCompleteness] +
      (apifyMetrics.instagramFound ? ENGAGEMENT_PTS[socialBands.engagement] : 0) +
      (apifyMetrics.instagramFound ? AUDIENCE_PTS[socialBands.audienceSize] : 0) +
      CROSS_PLATFORM_PTS[socialBands.crossPlatform]
    : 0;

  return {
    website,
    brandStory,
    content,
    social,
    ...weightedOverallScore({
      websiteClarity: website,
      brandStory,
      contentConsistency: content,
      socialPresence: social,
    }),
  };
}
