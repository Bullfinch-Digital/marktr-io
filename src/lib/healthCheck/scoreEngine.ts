import { DIMENSION_WEIGHTS, HEALTH_CHECK_SCORER_VERSION } from "./constants";
import type { HealthCheckFacts } from "./factsSchema";
import { absentHealthCheckFacts } from "./factsSchema";
import type {
  ApifySocialMetrics,
  BandedSocialSignals,
  EngagementBand,
  PostingRecencyBand,
  PostingRegularityBand,
  ProfileCompletenessBand,
  AudienceSizeBand,
  CrossPlatformBand,
} from "./socialBands";
import {
  absentApifyMetrics,
  bandSocialSignals,
} from "./socialBands";

export type HealthCheckPointBreakdown = {
  website: {
    valueProp: number;
    namesCustomer: number;
    primaryCTA: number;
    proofOnPage: number;
    pathToBuyContact: number;
    total: number;
  };
  story: {
    founderStory: number;
    storySpecific: number;
    pointOfView: number;
    valuesMission: number;
    total: number;
  };
  content: {
    postingRecency: number;
    postingRegularity: number;
    socialReflectsStory: number;
    bioOnMessage: number;
    total: number;
  };
  social: {
    profileCompleteness: number;
    engagementForSize: number;
    audienceSize: number;
    crossPlatform: number;
    total: number;
  };
};

export type DeterministicHealthCheckRun = {
  scorerVersion: string;
  modelVersion: string;
  inputs: {
    websiteUrl: string;
    instagramHandle: string;
    facebookUrl: string;
    domain: string;
  };
  facts: HealthCheckFacts;
  apifyMetrics: ApifySocialMetrics;
  socialBands: BandedSocialSignals;
  points: HealthCheckPointBreakdown;
  scores: {
    websiteClarity: number;
    brandStory: number;
    contentConsistency: number;
    socialPresence: number;
    overall: number;
  };
  lowestDimension: string;
  lowestScore: number;
};

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

function namesCustomerPoints(facts: HealthCheckFacts): number {
  if (facts.namesCustomer === "clear") return 20;
  if (facts.namesCustomer === "hinted" && facts.usesSecondPerson) return 20;
  if (facts.namesCustomer === "hinted") return 10;
  return 0;
}

export function scorePointsFromFacts(
  facts: HealthCheckFacts,
  socialBands: BandedSocialSignals
): HealthCheckPointBreakdown {
  const website = {
    valueProp: VALUE_PROP_PTS[facts.valueProp],
    namesCustomer: namesCustomerPoints(facts),
    primaryCTA: PRIMARY_CTA_PTS[facts.primaryCTA],
    proofOnPage: PROOF_PTS[facts.proofOnPage],
    pathToBuyContact: PATH_PTS[facts.pathToBuyContact],
    total: 0,
  };
  website.total =
    website.valueProp +
    website.namesCustomer +
    website.primaryCTA +
    website.proofOnPage +
    website.pathToBuyContact;

  const story = {
    founderStory: FOUNDER_PTS[facts.founderStory],
    storySpecific: STORY_SPECIFIC_PTS[facts.storySpecific],
    pointOfView: POV_PTS[facts.pointOfView],
    valuesMission: VALUES_PTS[facts.valuesMission],
    total: 0,
  };
  story.total =
    story.founderStory +
    story.storySpecific +
    story.pointOfView +
    story.valuesMission;

  const content = {
    postingRecency: RECENCY_PTS[socialBands.postingRecency],
    postingRegularity: REGULARITY_PTS[socialBands.postingRegularity],
    socialReflectsStory: SOCIAL_REFLECTS_PTS[facts.socialReflectsStory],
    bioOnMessage: BIO_PTS[facts.bioOnMessage],
    total: 0,
  };
  content.total =
    content.postingRecency +
    content.postingRegularity +
    content.socialReflectsStory +
    content.bioOnMessage;

  const social = {
    profileCompleteness: PROFILE_PTS[socialBands.profileCompleteness],
    engagementForSize: ENGAGEMENT_PTS[socialBands.engagement],
    audienceSize: AUDIENCE_PTS[socialBands.audienceSize],
    crossPlatform: CROSS_PLATFORM_PTS[socialBands.crossPlatform],
    total: 0,
  };
  social.total =
    social.profileCompleteness +
    social.engagementForSize +
    social.audienceSize +
    social.crossPlatform;

  return { website, story, content, social };
}

export function weightedOverallScore(scores: {
  websiteClarity: number;
  brandStory: number;
  contentConsistency: number;
  socialPresence: number;
}): number {
  return Math.round(
    scores.websiteClarity * DIMENSION_WEIGHTS.websiteClarity +
      scores.brandStory * DIMENSION_WEIGHTS.brandStory +
      scores.contentConsistency * DIMENSION_WEIGHTS.contentConsistency +
      scores.socialPresence * DIMENSION_WEIGHTS.socialPresence
  );
}

const DIMENSION_LABELS: Record<keyof typeof DIMENSION_WEIGHTS, string> = {
  websiteClarity: "Website Clarity",
  brandStory: "Brand Story",
  contentConsistency: "Content Consistency",
  socialPresence: "Social Presence",
};

export function scoreFromFacts(
  facts: HealthCheckFacts,
  apifyMetrics: ApifySocialMetrics
): DeterministicHealthCheckRun {
  const socialBands = bandSocialSignals(apifyMetrics);
  const points = scorePointsFromFacts(facts, socialBands);

  const scores = {
    websiteClarity: points.website.total,
    brandStory: points.story.total,
    contentConsistency: points.content.total,
    socialPresence: points.social.total,
    overall: 0,
  };
  scores.overall = weightedOverallScore(scores);

  const entries = Object.entries(scores).filter(
    ([key]) => key !== "overall"
  ) as [keyof typeof DIMENSION_WEIGHTS, number][];
  const [lowestKey, lowestVal] = entries.reduce((a, b) =>
    b[1] < a[1] ? b : a
  );

  return {
    scorerVersion: HEALTH_CHECK_SCORER_VERSION,
    modelVersion: "",
    inputs: {
      websiteUrl: "",
      instagramHandle: "",
      facebookUrl: "",
      domain: "",
    },
    facts,
    apifyMetrics,
    socialBands,
    points,
    scores,
    lowestDimension: DIMENSION_LABELS[lowestKey],
    lowestScore: lowestVal,
  };
}

export function buildHealthCheckRun(params: {
  facts: HealthCheckFacts;
  apifyMetrics: ApifySocialMetrics;
  modelVersion: string;
  inputs: {
    websiteUrl: string;
    instagramHandle: string;
    facebookUrl: string;
    domain: string;
  };
}): DeterministicHealthCheckRun {
  const base = scoreFromFacts(params.facts, params.apifyMetrics);
  return {
    ...base,
    modelVersion: params.modelVersion,
    inputs: params.inputs,
  };
}

export function buildAbsentHealthCheckRun(inputs: {
  websiteUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  domain?: string;
  modelVersion?: string;
}): DeterministicHealthCheckRun {
  return buildHealthCheckRun({
    facts: absentHealthCheckFacts(),
    apifyMetrics: absentApifyMetrics(),
    modelVersion: inputs.modelVersion ?? "",
    inputs: {
      websiteUrl: inputs.websiteUrl ?? "",
      instagramHandle: inputs.instagramHandle ?? "",
      facebookUrl: inputs.facebookUrl ?? "",
      domain: inputs.domain ?? "",
    },
  });
}
