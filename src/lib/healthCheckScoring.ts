export interface StoryAssessment {
  hasFounderStory: boolean;
  founderStoryQuality: "none" | "basic" | "good" | "compelling";
  speaksToSpecificCustomer: boolean;
  hasDistinctivePositioning: boolean;
  hasEmotionalHook: boolean;
  missingElements: string[];
}

export interface SocialScores {
  instagramFound?: boolean;
  facebookFound?: boolean;
  instagramFollowers?: string;
  instagramPostCount?: string;
  instagramBioScore?: number | null;
  contentConsistencyScore?: number;
  socialObservation?: string;
  audienceObservation?: string | null;
  engagementProxyScore?: number | null;
  engagementObservation?: string | null;
}

export interface HealthCheckInput {
  websiteUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  email: string;
  websiteScore?: {
    score: number;
    observation: string;
    strengths?: string[];
    gaps?: string[];
    storyAssessment?: StoryAssessment | null;
    socialScores?: SocialScores | null;
  } | null;
}

export interface DimensionScore {
  name: string;
  score: number;
  observation: string;
  strengths?: string[];
  gaps?: string[];
  storyAssessment?: StoryAssessment | null;
}

export interface HealthCheckScores {
  websiteClarity: DimensionScore;
  contentConsistency: DimensionScore;
  audienceFit: DimensionScore;
  engagementQuality: DimensionScore;
  channelCoverage: DimensionScore;
  overall: number;
  lowestDimension: string;
  lowestScore: number;
}

function obs(score: number, high: string, mid: string, low: string) {
  if (score >= 70) return high;
  if (score >= 40) return mid;
  return low;
}

export function calculateScores(input: HealthCheckInput): HealthCheckScores {
  const websiteScore =
    input.websiteScore?.score ??
    Math.min(
      100,
      (input.websiteUrl?.trim() ? 40 : 15) + Math.floor(Math.random() * 35)
    );

  const websiteObservation =
    input.websiteScore?.observation ??
    obs(
      websiteScore,
      "Your homepage communicates clearly",
      "Your value proposition could be sharper",
      "Visitors may struggle to understand what you do"
    );

  const platforms = [
    input.websiteUrl,
    input.instagramHandle,
    input.facebookUrl,
    input.linkedinUrl,
  ].filter((v) => Boolean(v && String(v).trim())).length;

  const instagramNotFound =
    input.websiteScore?.socialScores?.instagramFound === false &&
    !!input.instagramHandle?.trim();

  const consistencyScore = instagramNotFound
    ? 0
    : (input.websiteScore?.socialScores?.contentConsistencyScore ??
      Math.min(80, platforms * 20));

  const consistencyObservation = instagramNotFound
    ? "Instagram handle not found — check the handle and rerun"
    : input.websiteScore?.socialScores?.socialObservation ||
      obs(
        consistencyScore,
        "You're maintaining a consistent presence",
        "Some gaps in your content schedule",
        "Irregular posting is limiting your reach"
      );
  const audienceScore =
    input.websiteScore?.socialScores?.instagramBioScore ??
    25 + Math.floor(Math.random() * 40);

  const audienceObservation = instagramNotFound
    ? "Connect your Instagram to assess audience targeting"
    : input.websiteScore?.socialScores?.audienceObservation ??
      "Full analysis unlocked in your dashboard";

  const engagementScore =
    input.websiteScore?.socialScores?.engagementProxyScore ??
    30 + Math.floor(Math.random() * 40);

  const engagementObservation = instagramNotFound
    ? "Connect platforms to see real engagement data"
    : input.websiteScore?.socialScores?.engagementObservation ??
      "Connect platforms to see real engagement data";
  const coverageScore = Math.min(80, platforms * 20);

  const scores = {
    websiteClarity: websiteScore,
    contentConsistency: consistencyScore,
    audienceFit: audienceScore,
    engagementQuality: engagementScore,
    channelCoverage: coverageScore,
  };

  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / 5
  );

  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  const [lowestKey, lowestVal] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  const dimensionNames: Record<keyof typeof scores, string> = {
    websiteClarity: "Website Clarity",
    contentConsistency: "Content Consistency",
    audienceFit: "Audience Fit",
    engagementQuality: "Engagement Quality",
    channelCoverage: "Channel Coverage",
  };

  return {
    websiteClarity: {
      name: "Website Clarity",
      score: websiteScore,
      observation: websiteObservation,
      strengths: input.websiteScore?.strengths,
      gaps: input.websiteScore?.gaps,
      storyAssessment: input.websiteScore?.storyAssessment ?? null,
    },
    contentConsistency: {
      name: "Content Consistency",
      score: consistencyScore,
      observation: consistencyObservation,
    },
    audienceFit: {
      name: "Audience Fit",
      score: audienceScore,
      observation: audienceObservation,
    },
    engagementQuality: {
      name: "Engagement Quality",
      score: engagementScore,
      observation: engagementObservation,
    },
    channelCoverage: {
      name: "Channel Coverage",
      score: coverageScore,
      observation: obs(
        coverageScore,
        "Strong multi-channel presence",
        "Room to expand your reach",
        "Focus on one channel first, then expand"
      ),
    },
    overall,
    lowestDimension: dimensionNames[lowestKey],
    lowestScore: lowestVal,
  };
}
