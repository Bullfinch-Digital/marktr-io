/**
 * Unit tests for the deterministic health check scorer.
 * Run: npx tsx scripts/health-check-score-engine.test.ts
 */
import assert from "node:assert/strict";
import {
  absentHealthCheckFacts,
  absentApifyMetrics,
  bandEngagementForSize,
  buildHealthCheckRun,
  scoreFromFacts,
  weightedOverallScore,
  OVERALL_CAP,
  OVERALL_CAP_FRAMING_COPY,
  type HealthCheckFacts,
} from "../src/lib/healthCheck/index.ts";
import { computeDeterministicScores } from "../supabase/functions/score-website/deterministicScores.ts";
import { augmentFindingsWithPriorRun } from "../src/lib/healthCheckFindings.ts";
import type { HealthCheckPriorRunPayload } from "../src/lib/healthCheckPriorRun.ts";
import { calculateScores } from "../src/lib/healthCheckScoring.ts";

function testIdenticalRuns() {
  const facts: HealthCheckFacts = {
    valueProp: "clear",
    namesCustomer: "hinted",
    usesSecondPerson: true,
    primaryCTA: "single",
    proofOnPage: "real",
    pathToBuyContact: "clear",
    founderStory: "present",
    storySpecific: "specific",
    storyNamesConcrete: true,
    pointOfView: "distinct",
    valuesMission: "concrete",
    socialReflectsStory: "expresses",
    igProfileComplete: "complete",
    bioOnMessage: "complete",
  };

  const apify = {
    instagramFound: true,
    instagramFetchStatus: "found",
    facebookFound: true,
    followers: 3500,
    avgLikes: 180,
    avgComments: 12,
    latestPostDaysAgo: 5,
    postsPerWeek: 2.5,
    bioLength: 120,
    hasExternalUrl: true,
    hasFullName: true,
  };

  const run1 = buildHealthCheckRun({
    facts,
    apifyMetrics: apify,
    modelVersion: "gpt-4o-mini-2024-07-18",
    inputs: {
      websiteUrl: "https://motherroot.com",
      instagramHandle: "motherroot",
      facebookUrl: "",
      domain: "motherroot.com",
    },
  });
  const run2 = buildHealthCheckRun({
    facts,
    apifyMetrics: apify,
    modelVersion: "gpt-4o-mini-2024-07-18",
    inputs: {
      websiteUrl: "https://motherroot.com",
      instagramHandle: "motherroot",
      facebookUrl: "",
      domain: "motherroot.com",
    },
  });

  assert.equal(run1.scorerVersion, "1.0.2");
  assert.deepEqual(run1.scores, run2.scores);
  assert.equal(run1.scores.overall, run2.scores.overall);
  console.log("✓ identical runs produce identical scores", run1.scores);
}

function testUsesSecondPersonBump() {
  const base = absentHealthCheckFacts();
  const hintedNoYou = scoreFromFacts(
    { ...base, namesCustomer: "hinted", usesSecondPerson: false },
    {
      instagramFound: false,
      instagramFetchStatus: "not_provided",
      facebookFound: false,
      followers: 0,
      avgLikes: 0,
      avgComments: 0,
      latestPostDaysAgo: null,
      postsPerWeek: null,
      bioLength: 0,
      hasExternalUrl: false,
      hasFullName: false,
    }
  );
  const hintedWithYou = scoreFromFacts(
    { ...base, namesCustomer: "hinted", usesSecondPerson: true },
    {
      instagramFound: false,
      instagramFetchStatus: "not_provided",
      facebookFound: false,
      followers: 0,
      avgLikes: 0,
      avgComments: 0,
      latestPostDaysAgo: null,
      postsPerWeek: null,
      bioLength: 0,
      hasExternalUrl: false,
      hasFullName: false,
    }
  );
  assert.equal(
    hintedWithYou.points.website.namesCustomer -
      hintedNoYou.points.website.namesCustomer,
    10
  );
  console.log("✓ usesSecondPerson bump adds 10 pts to namesCustomer");
}

function testWeightedOverall() {
  const result = weightedOverallScore({
    websiteClarity: 80,
    brandStory: 70,
    contentConsistency: 60,
    socialPresence: 50,
  });
  assert.equal(result.overallRaw, Math.round(80 * 0.3 + 70 * 0.3 + 60 * 0.25 + 50 * 0.15));
  assert.equal(result.capped, false);
  assert.equal(result.overall, result.overallRaw);
  console.log("✓ weighted overall uses 30/30/25/15");
}

function testOverallCapHighScores() {
  const dims = {
    websiteClarity: 100,
    brandStory: 100,
    contentConsistency: 100,
    socialPresence: 80,
  };
  const client = weightedOverallScore(dims);
  assert.equal(client.overallRaw, 97);
  assert.equal(client.overall, OVERALL_CAP);
  assert.equal(client.capped, true);

  const maxFacts: HealthCheckFacts = {
    valueProp: "clear",
    namesCustomer: "clear",
    usesSecondPerson: true,
    primaryCTA: "single",
    proofOnPage: "real",
    pathToBuyContact: "clear",
    founderStory: "present",
    storySpecific: "specific",
    storyNamesConcrete: true,
    pointOfView: "distinct",
    valuesMission: "concrete",
    socialReflectsStory: "expresses",
    igProfileComplete: "complete",
    bioOnMessage: "complete",
  };
  const apify = {
    instagramFound: true,
    instagramFetchStatus: "found",
    facebookFound: true,
    followers: 50_000,
    avgLikes: 2000,
    avgComments: 100,
    latestPostDaysAgo: 5,
    postsPerWeek: 3,
    bioLength: 120,
    hasExternalUrl: true,
    hasFullName: true,
  };

  const run = buildHealthCheckRun({
    facts: maxFacts,
    apifyMetrics: apify,
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://example.com",
      instagramHandle: "test",
      facebookUrl: "",
      domain: "example.com",
    },
  });
  const server = computeDeterministicScores(maxFacts, apify);

  assert.equal(run.scores.overall, server.overall);
  assert.equal(run.scores.overallRaw, server.overallRaw);
  assert.equal(run.scores.capped, server.capped);
  assert.ok(run.scores.overallRaw > OVERALL_CAP);
  assert.equal(run.scores.overall, OVERALL_CAP);
  assert.equal(run.scores.capped, true);
  assert.equal(run.overallSummary, OVERALL_CAP_FRAMING_COPY);

  console.log("✓ overall cap case", {
    website: run.scores.websiteClarity,
    brandStory: run.scores.brandStory,
    content: run.scores.contentConsistency,
    social: run.scores.socialPresence,
    overallRaw: run.scores.overallRaw,
    overall: run.scores.overall,
    capped: run.scores.capped,
    overallSummary: run.overallSummary,
  });
}

function testOverallCapMotherRootUncapped() {
  const motherRootDims = {
    websiteClarity: 100,
    brandStory: 100,
    contentConsistency: 75,
    socialPresence: 50,
  };
  const result = weightedOverallScore(motherRootDims);
  assert.equal(result.overallRaw, 86);
  assert.equal(result.overall, 86);
  assert.equal(result.capped, false);

  console.log("✓ Mother Root uncapped case", {
    overallRaw: result.overallRaw,
    overall: result.overall,
    capped: result.capped,
    overallSummary: undefined,
  });
}

function testEngagementBands() {
  assert.equal(
    bandEngagementForSize({
      source: "scraped",
      followers: 5000,
      avgLikes: 200,
      avgComments: 10,
    }),
    "good"
  );
  assert.equal(
    bandEngagementForSize({
      source: "scraped",
      followers: 5000,
      avgLikes: 80,
      avgComments: 5,
    }),
    "partial"
  );
  console.log("✓ engagement bands tier correctly for nano audience");
}

function testSingleDimensionChange() {
  const apify = {
    instagramFound: true,
    instagramFetchStatus: "found",
    facebookFound: false,
    followers: 2000,
    avgLikes: 50,
    avgComments: 5,
    latestPostDaysAgo: 10,
    postsPerWeek: 1.2,
    bioLength: 80,
    hasExternalUrl: true,
    hasFullName: true,
  };
  const factsA = { ...absentHealthCheckFacts(), valueProp: "vague" };
  const factsB = { ...factsA, valueProp: "clear" };

  const scoreA = buildHealthCheckRun({
    facts: factsA,
    apifyMetrics: apify,
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://example.com",
      instagramHandle: "test",
      facebookUrl: "",
      domain: "example.com",
    },
  });
  const scoreB = buildHealthCheckRun({
    facts: factsB,
    apifyMetrics: apify,
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://example.com",
      instagramHandle: "test",
      facebookUrl: "",
      domain: "example.com",
    },
  });

  assert.equal(scoreB.scores.websiteClarity - scoreA.scores.websiteClarity, 13);
  assert.equal(scoreB.scores.brandStory, scoreA.scores.brandStory);
  assert.equal(scoreB.scores.contentConsistency, scoreA.scores.contentConsistency);
  assert.equal(scoreB.scores.socialPresence, scoreA.scores.socialPresence);
  console.log("✓ changing one website fact moves only websiteClarity");
}

function testAugmentFindingsBrandStoryDelta() {
  const apify = {
    instagramFound: false,
      instagramFetchStatus: "not_provided",
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
  const facts: HealthCheckFacts = {
    ...absentHealthCheckFacts(),
    founderStory: "present",
    storySpecific: "specific",
    pointOfView: "distinct",
    valuesMission: "concrete",
  };
  const run = buildHealthCheckRun({
    facts,
    apifyMetrics: apify,
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://example.com",
      instagramHandle: "",
      facebookUrl: "",
      domain: "example.com",
    },
  });

  const scores = calculateScores({
    websiteUrl: "https://example.com",
    email: "test@example.com",
    websiteScore: { score: 100, observation: "", deterministic: run },
  });

  const priorRun: HealthCheckPriorRunPayload = {
    scores: { website: 100, brandStory: 0, content: 15, social: 10, overall: 35 },
    findings: [{ dimension: "Brand Story", finding: "Brand story needs significant development" }],
    missingElements: ["founding moment"],
    created_at: "2025-01-01T00:00:00.000Z",
  };

  const augmented = augmentFindingsWithPriorRun(undefined, priorRun, scores);
  const brandStory = augmented.find((f) => f.dimension === "Brand Story");
  assert.ok(brandStory?.finding.includes("0"));
  assert.ok(brandStory?.finding.includes(String(scores.brandStory.score)));
  assert.ok(/rose|fell|since your last/i.test(brandStory?.finding ?? ""));
  console.log("✓ augmentFindingsWithPriorRun references Brand Story delta");
}

function testNoSocialHallucinationScoresZero() {
  const apify = absentApifyMetrics();
  const hallucinated = {
    ...absentHealthCheckFacts(),
    valueProp: "clear" as const,
    namesCustomer: "clear" as const,
    usesSecondPerson: true,
    primaryCTA: "single" as const,
    proofOnPage: "real" as const,
    pathToBuyContact: "clear" as const,
    socialReflectsStory: "expresses" as const,
    igProfileComplete: "complete" as const,
    bioOnMessage: "complete" as const,
  };

  const run = buildHealthCheckRun({
    facts: hallucinated,
    apifyMetrics: apify,
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://shropshirelearningassessments.com",
      instagramHandle: "",
      facebookUrl: "",
      domain: "shropshirelearningassessments.com",
    },
  });

  assert.equal(run.scorerVersion, "1.0.2");
  assert.equal(run.scores.socialPresence, 0);
  assert.equal(run.scores.contentConsistency, 0);
  assert.equal(run.points.content.socialReflectsStory, 0);
  assert.equal(run.points.content.bioOnMessage, 0);
  console.log("✓ no social profile → social facts forced absent, Social/Content social-derived = 0");
}

function testSocialIncompleteRenormalises() {
  const facts = {
    ...absentHealthCheckFacts(),
    valueProp: "clear" as const,
    namesCustomer: "clear" as const,
    usesSecondPerson: true,
    primaryCTA: "single" as const,
    proofOnPage: "real" as const,
    pathToBuyContact: "clear" as const,
    founderStory: "present" as const,
    storySpecific: "specific" as const,
    storyNamesConcrete: true,
    pointOfView: "distinct" as const,
    valuesMission: "concrete" as const,
  };

  const run = scoreFromFacts(facts, {
    instagramFound: false,
    facebookFound: false,
    instagramFetchStatus: "incomplete",
    followers: 0,
    avgLikes: 0,
    avgComments: 0,
    latestPostDaysAgo: null,
    postsPerWeek: null,
    bioLength: 0,
    hasExternalUrl: false,
    hasFullName: false,
  });

  assert.equal(run.socialIncomplete, true);
  assert.equal(run.scores.contentConsistency, null);
  assert.equal(run.scores.socialPresence, null);
  assert.equal(run.scores.websiteClarity, 100);
  assert.equal(run.scores.brandStory, 100);
  // 100*0.5 + 100*0.5 = 100 → overall display capped at 92
  assert.equal(run.scores.overallRaw, 100);
  assert.equal(run.scores.overall, OVERALL_CAP);
  assert.equal(run.dimensions.websiteClarity.score, 95);
  assert.equal(run.dimensions.websiteClarity.capped, true);
  assert.equal(run.dimensions.contentConsistency.unmeasured, true);
  console.log("✓ social-incomplete → Website+Story only, 50/50, display cap 95");
}

function testDimensionDisplayCapDoesNotDoubleCapOverall() {
  const facts: HealthCheckFacts = {
    valueProp: "clear",
    namesCustomer: "clear",
    usesSecondPerson: true,
    primaryCTA: "single",
    proofOnPage: "real",
    pathToBuyContact: "clear",
    founderStory: "present",
    storySpecific: "specific",
    storyNamesConcrete: true,
    pointOfView: "distinct",
    valuesMission: "concrete",
    socialReflectsStory: "expresses",
    igProfileComplete: "complete",
    bioOnMessage: "complete",
  };

  const run = scoreFromFacts(facts, {
    instagramFound: true,
    facebookFound: false,
    instagramFetchStatus: "found",
    followers: 605,
    avgLikes: 110,
    avgComments: 15,
    latestPostDaysAgo: 30,
    postsPerWeek: 0.05,
    bioLength: 47,
    hasExternalUrl: false,
    hasFullName: true,
  });

  // Website/Story raw 100 → display 95; overall uses RAW then overall cap
  assert.equal(run.scores.websiteClarity, 100);
  assert.equal(run.dimensions.websiteClarity.score, 95);
  assert.ok(run.scores.overallRaw <= 100);
  // overallRaw must NOT be computed from display-capped 95s
  const fromDisplayCaps = Math.round(95 * 0.3 + 95 * 0.3 + (run.scores.contentConsistency ?? 0) * 0.25 + (run.scores.socialPresence ?? 0) * 0.15);
  const fromRaws = Math.round(
    100 * 0.3 +
      100 * 0.3 +
      (run.scores.contentConsistency ?? 0) * 0.25 +
      (run.scores.socialPresence ?? 0) * 0.15
  );
  assert.equal(run.scores.overallRaw, fromRaws);
  assert.notEqual(run.scores.overallRaw, fromDisplayCaps);
  console.log("✓ dimension display cap does not double-cap overall", run.scores);
}

function testStorySystemSignpostGating() {
  const strongFacts: HealthCheckFacts = {
    valueProp: "clear",
    namesCustomer: "clear",
    usesSecondPerson: true,
    primaryCTA: "single",
    proofOnPage: "real",
    pathToBuyContact: "clear",
    founderStory: "present",
    storySpecific: "specific",
    storyNamesConcrete: true,
    pointOfView: "distinct",
    valuesMission: "concrete",
    socialReflectsStory: "expresses",
    igProfileComplete: "complete",
    bioOnMessage: "complete",
  };

  const strong = buildHealthCheckRun({
    facts: strongFacts,
    apifyMetrics: {
      instagramFound: true,
      facebookFound: false,
      instagramFetchStatus: "found",
      followers: 600,
      avgLikes: 50,
      avgComments: 5,
      latestPostDaysAgo: 10,
      postsPerWeek: 1.2,
      bioLength: 40,
      hasExternalUrl: false,
      hasFullName: true,
    },
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://apostlecoffee.com",
      instagramHandle: "apostlecoffee",
      facebookUrl: "",
      domain: "apostlecoffee.com",
    },
  });

  const strongScores = calculateScores({
    email: "test@example.com",
    websiteUrl: "https://apostlecoffee.com",
    websiteScore: { score: 95, observation: "ok", deterministic: strong },
  });
  assert.equal(strongScores.brandStory.score, 95);
  assert.equal(strongScores.brandStory.storyAssessment?.storySystemSignpost, null);
  assert.equal(strongScores.brandStory.storyAssessment?.missingElements.length, 0);
  console.log("✓ strong Brand Story (95) suppresses Story System signpost");

  const weakFacts: HealthCheckFacts = {
    ...absentHealthCheckFacts(),
    valueProp: "clear",
    namesCustomer: "clear",
    usesSecondPerson: true,
    primaryCTA: "single",
    proofOnPage: "real",
    pathToBuyContact: "clear",
    founderStory: "absent",
    storySpecific: "boilerplate",
    storyNamesConcrete: false,
    pointOfView: "absent",
    valuesMission: "absent",
  };

  const weak = buildHealthCheckRun({
    facts: weakFacts,
    apifyMetrics: {
      instagramFound: false,
      facebookFound: false,
      instagramFetchStatus: "not_provided",
      followers: 0,
      avgLikes: 0,
      avgComments: 0,
      latestPostDaysAgo: null,
      postsPerWeek: null,
      bioLength: 0,
      hasExternalUrl: false,
      hasFullName: false,
    },
    modelVersion: "test",
    inputs: {
      websiteUrl: "https://example.com",
      instagramHandle: "",
      facebookUrl: "",
      domain: "example.com",
    },
  });

  const weakScores = calculateScores({
    email: "test@example.com",
    websiteUrl: "https://example.com",
    websiteScore: { score: 0, observation: "ok", deterministic: weak },
  });
  assert.ok((weakScores.brandStory.scoreRaw ?? 0) < 95);
  const cta = weakScores.brandStory.storyAssessment?.storySystemSignpost;
  assert.ok(cta?.copy);
  assert.match(cta!.copy, /founding story/i);
  assert.doesNotMatch(cta!.copy, /the missing elements/i);
  console.log("✓ weak Brand Story shows Story System signpost with real gap copy");
}

testIdenticalRuns();
testUsesSecondPersonBump();
testWeightedOverall();
testOverallCapHighScores();
testOverallCapMotherRootUncapped();
testEngagementBands();
testSingleDimensionChange();
testAugmentFindingsBrandStoryDelta();
testNoSocialHallucinationScoresZero();
testSocialIncompleteRenormalises();
testDimensionDisplayCapDoesNotDoubleCapOverall();
testStorySystemSignpostGating();
console.log("\nAll health-check score engine tests passed.");
console.log("\nAll score engine tests passed.");
