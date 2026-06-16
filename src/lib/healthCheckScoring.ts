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
  brandStory: DimensionScore;
  contentConsistency: DimensionScore;
  socialPresence: DimensionScore;
  overall: number;
  lowestDimension: string;
  lowestScore: number;
}

function obs(score: number, high: string, mid: string, low: string) {
  if (score >= 70) return high;
  if (score >= 40) return mid;
  return low;
}

function countPlatforms(input: HealthCheckInput) {
  return [
    input.websiteUrl,
    input.instagramHandle,
    input.facebookUrl,
  ].filter((v) => Boolean(v && String(v).trim())).length;
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

  const instagramNotFound =
    input.websiteScore?.socialScores?.instagramFound === false &&
    !!input.instagramHandle?.trim();

  const platformCount = countPlatforms(input);

  const consistencyScore = instagramNotFound
    ? 0
    : (input.websiteScore?.socialScores?.contentConsistencyScore ??
      Math.min(80, platformCount * 20));

  const consistencyObservation = instagramNotFound
    ? "Instagram handle not found — check the handle and rerun"
    : obs(
        consistencyScore,
        "You're maintaining a consistent presence",
        "Some gaps in your content schedule",
        "Irregular posting is limiting your reach"
      );

  const storyAssessment = input.websiteScore?.storyAssessment;

  const storyScore = storyAssessment
    ? (() => {
        let s = 0;
        if (storyAssessment.hasFounderStory) s += 25;
        if (storyAssessment.hasEmotionalHook) s += 20;
        if (storyAssessment.speaksToSpecificCustomer) s += 20;
        if (storyAssessment.hasDistinctivePositioning) s += 20;
        if (storyAssessment.founderStoryQuality === "compelling") s += 15;
        else if (storyAssessment.founderStoryQuality === "good") s += 10;
        else if (storyAssessment.founderStoryQuality === "basic") s += 5;
        return Math.min(s, 100);
      })()
    : 40;

  const storyObservation =
    storyScore >= 70
      ? "Strong brand story with clear positioning"
      : storyScore >= 40
        ? "Basic story present but missing key elements"
        : "Brand story needs significant development";

  const socialPresenceScore = (() => {
    if (instagramNotFound) return 0;

    const social = input.websiteScore?.socialScores;

    if (!social?.instagramFound) {
      return Math.min(platformCount * 15, 45);
    }

    const bioScore = social.instagramBioScore ?? 40;
    const reachScore = social.engagementProxyScore ?? 40;
    const platformScore = Math.min(platformCount * 10, 30);
    return Math.round(bioScore * 0.4 + reachScore * 0.4 + platformScore);
  })();

  const socialObservation =
    instagramNotFound && input.instagramHandle?.trim()
      ? "Instagram handle not found — check the handle and rerun"
      : input.websiteScore?.socialScores?.socialObservation ||
        obs(
          socialPresenceScore,
          "Strong social presence reaching the right audience",
          "Social presence is building but has room to grow",
          "Limited social presence restricting your reach"
        );

  const scores = {
    websiteClarity: websiteScore,
    brandStory: storyScore,
    contentConsistency: consistencyScore,
    socialPresence: socialPresenceScore,
  };

  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / 4
  );

  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  const [lowestKey, lowestVal] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  const dimensionNames: Record<keyof typeof scores, string> = {
    websiteClarity: "Website Clarity",
    brandStory: "Brand Story",
    contentConsistency: "Content Consistency",
    socialPresence: "Social Presence",
  };

  return {
    websiteClarity: {
      name: "Website Clarity",
      score: websiteScore,
      observation: websiteObservation,
      strengths: input.websiteScore?.strengths,
      gaps: input.websiteScore?.gaps,
    },
    brandStory: {
      name: "Brand Story",
      score: storyScore,
      observation: storyObservation,
      storyAssessment: storyAssessment ?? null,
    },
    contentConsistency: {
      name: "Content Consistency",
      score: consistencyScore,
      observation: consistencyObservation,
    },
    socialPresence: {
      name: "Social Presence",
      score: socialPresenceScore,
      observation: socialObservation,
    },
    overall,
    lowestDimension: dimensionNames[lowestKey],
    lowestScore: lowestVal,
  };
}
