import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import { generatePublicToken } from "../_shared/publicToken.ts";
import { computeDeterministicScores, HEALTH_CHECK_SCORER_VERSION } from "./deterministicScores.ts";

export type { Edition } from "../_shared/bullfinchHosts.ts";
export {
  isAllowedBullfinchOrigin,
  resolveEditionFromRequest,
} from "../_shared/bullfinchHosts.ts";

const DIMENSION_DISPLAY_CAP = 95;

type HealthCheckFacts = {
  valueProp: string;
  namesCustomer: string;
  usesSecondPerson: boolean;
  primaryCTA: string;
  proofOnPage: string;
  pathToBuyContact: string;
  founderStory: string;
  storySpecific: string;
  storyNamesConcrete: boolean;
  pointOfView: string;
  valuesMission: string;
  socialReflectsStory: string;
  igProfileComplete: string;
  bioOnMessage: string;
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

type Finding = { dimension: string; score: number | null; finding: string };

function capDimension(name: string, raw: number | null) {
  if (raw === null) {
    return {
      name,
      score: null,
      scoreRaw: null,
      dimensionCapped: false,
      unmeasured: true,
      observation: "Couldn't read your social this time — this score covers Website Clarity and Brand Story only.",
    };
  }
  const dimensionCapped = raw > DIMENSION_DISPLAY_CAP;
  return {
    name,
    score: dimensionCapped ? DIMENSION_DISPLAY_CAP : raw,
    scoreRaw: raw,
    dimensionCapped,
    unmeasured: false,
    observation: "Analysis complete",
  };
}

function findingFor(dimension: string, findings: Finding[] | null | undefined): string | undefined {
  return findings?.find((f) => f.dimension === dimension)?.finding?.trim() || undefined;
}

export function buildScoresSnapshot(opts: {
  websiteUrl: string;
  instagramHandle: string;
  facebookUrl: string;
  domain: string;
  facts: HealthCheckFacts;
  apifyMetrics: ApifySocialMetrics;
  modelVersion: string;
  observation: string;
  strengths?: string[];
  gaps?: string[];
  findings?: Finding[] | null;
}) {
  const deterministicScores = computeDeterministicScores(
    opts.facts as Parameters<typeof computeDeterministicScores>[0],
    opts.apifyMetrics,
  );

  const websiteClarity = capDimension("Website Clarity", deterministicScores.website);
  const brandStory = capDimension("Brand Story", deterministicScores.brandStory);
  const contentConsistency = capDimension(
    "Content Consistency",
    deterministicScores.content,
  );
  const socialPresence = capDimension("Social Presence", deterministicScores.social);

  const websiteFinding = findingFor("Website Clarity", opts.findings);
  if (websiteFinding) websiteClarity.observation = websiteFinding;
  const storyFinding = findingFor("Brand Story", opts.findings);
  if (storyFinding) brandStory.observation = storyFinding;
  const contentFinding = findingFor("Content Consistency", opts.findings);
  if (contentFinding && !contentConsistency.unmeasured) {
    contentConsistency.observation = contentFinding;
  }
  const socialFinding = findingFor("Social Presence", opts.findings);
  if (socialFinding && !socialPresence.unmeasured) {
    socialPresence.observation = socialFinding;
  }

  if (opts.strengths?.length && !websiteClarity.dimensionCapped) {
    (websiteClarity as { strengths?: string[] }).strengths = opts.strengths;
  }
  if (opts.gaps?.length && !websiteClarity.dimensionCapped) {
    (websiteClarity as { gaps?: string[] }).gaps = opts.gaps;
  }

  const inputs = {
    websiteUrl: opts.websiteUrl,
    instagramHandle: opts.instagramHandle,
    facebookUrl: opts.facebookUrl,
    domain: opts.domain,
  };

  const deterministic = {
    scorerVersion: HEALTH_CHECK_SCORER_VERSION,
    modelVersion: opts.modelVersion,
    inputs,
    facts: opts.facts,
    apifyMetrics: opts.apifyMetrics,
    socialIncomplete: deterministicScores.socialIncomplete,
    scores: {
      websiteClarity: deterministicScores.website,
      brandStory: deterministicScores.brandStory,
      contentConsistency: deterministicScores.content,
      socialPresence: deterministicScores.social,
      overall: deterministicScores.overall,
      overallRaw: deterministicScores.overallRaw,
      capped: deterministicScores.capped,
    },
  };

  const scores = {
    websiteClarity,
    brandStory,
    contentConsistency,
    socialPresence,
    overall: deterministicScores.overall,
    overallRaw: deterministicScores.overallRaw,
    capped: deterministicScores.capped,
    overallSummary: deterministicScores.capped
      ? "Your scores are genuinely strong across the board — we cap the automated overall at 92 because the last few points are the kind of thing that benefits from a human eye, not a scraper."
      : undefined,
    lowestDimension: websiteClarity.name,
    lowestScore: websiteClarity.score ?? 0,
    deterministic,
    websiteScore: {
      score: deterministicScores.website,
      observation: opts.observation,
      strengths: opts.strengths,
      gaps: opts.gaps,
      findings: opts.findings ?? undefined,
      deterministic,
    },
    inputs,
  };

  const measured = [
    { name: "Website Clarity", score: websiteClarity.score },
    { name: "Brand Story", score: brandStory.score },
    { name: "Content Consistency", score: contentConsistency.score },
    { name: "Social Presence", score: socialPresence.score },
  ].filter((d): d is { name: string; score: number } => typeof d.score === "number");
  if (measured.length) {
    const lowest = measured.reduce((a, b) => (b.score < a.score ? b : a));
    scores.lowestDimension = lowest.name;
    scores.lowestScore = lowest.score;
  }

  return {
    overall: deterministicScores.overall,
    capped: deterministicScores.capped,
    website: deterministicScores.website,
    brandStory: deterministicScores.brandStory,
    content: deterministicScores.content,
    social: deterministicScores.social,
    scores,
  };
}

export async function persistHealthCheckReport(opts: {
  url: string;
  instagramHandle: string;
  facebookUrl: string;
  domain: string;
  facts: HealthCheckFacts;
  apifyMetrics: ApifySocialMetrics;
  modelVersion: string;
  observation: string;
  strengths?: string[];
  gaps?: string[];
  findings?: Finding[] | null;
  utm?: Record<string, unknown> | null;
}): Promise<{ publicToken: string } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("persistHealthCheckReport: missing SUPABASE_URL or SERVICE_ROLE_KEY");
    return null;
  }

  const snapshot = buildScoresSnapshot(opts);
  const publicToken = generatePublicToken();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from("health_check_reports").insert({
    edition: "bullfinch",
    public_token: publicToken,
    url: opts.url,
    overall: snapshot.overall,
    capped: snapshot.capped,
    website_score: snapshot.website,
    brand_story_score: snapshot.brandStory,
    content_score: snapshot.content,
    social_score: snapshot.social,
    facts: opts.facts,
    findings: opts.findings ?? null,
    scores: snapshot.scores,
    scoring_version: HEALTH_CHECK_SCORER_VERSION,
    utm: opts.utm ?? null,
  });

  if (error) {
    console.error("persistHealthCheckReport insert failed", error);
    return null;
  }

  return { publicToken };
}
