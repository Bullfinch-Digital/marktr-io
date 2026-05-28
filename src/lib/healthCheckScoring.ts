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
  } | null;
}

export interface DimensionScore {
  name: string;
  score: number;
  observation: string;
  strengths?: string[];
  gaps?: string[];
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

  const consistencyScore = Math.min(80, platforms * 20);
  const audienceScore = 25 + Math.floor(Math.random() * 40);
  const engagementScore = 30 + Math.floor(Math.random() * 40);
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
    },
    contentConsistency: {
      name: "Content Consistency",
      score: consistencyScore,
      observation: obs(
        consistencyScore,
        "You're maintaining a consistent presence",
        "Some gaps in your content schedule",
        "Irregular posting is limiting your reach"
      ),
    },
    audienceFit: {
      name: "Audience Fit",
      score: audienceScore,
      observation: "Full analysis unlocked in your dashboard",
    },
    engagementQuality: {
      name: "Engagement Quality",
      score: engagementScore,
      observation: "Connect platforms to see real engagement data",
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
