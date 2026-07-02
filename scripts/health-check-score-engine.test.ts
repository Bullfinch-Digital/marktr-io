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
  type HealthCheckFacts,
} from "../src/lib/healthCheck/index.ts";
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

  assert.equal(run1.scorerVersion, "1.0.1");
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
  const overall = weightedOverallScore({
    websiteClarity: 80,
    brandStory: 70,
    contentConsistency: 60,
    socialPresence: 50,
  });
  assert.equal(overall, Math.round(80 * 0.3 + 70 * 0.3 + 60 * 0.25 + 50 * 0.15));
  console.log("✓ weighted overall uses 30/30/25/15");
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

  assert.equal(run.scorerVersion, "1.0.1");
  assert.equal(run.scores.socialPresence, 0);
  assert.equal(run.scores.contentConsistency, 0);
  assert.equal(run.points.content.socialReflectsStory, 0);
  assert.equal(run.points.content.bioOnMessage, 0);
  console.log("✓ no social profile → social facts forced absent, Social/Content social-derived = 0");
}

testIdenticalRuns();
testUsesSecondPersonBump();
testWeightedOverall();
testEngagementBands();
testSingleDimensionChange();
testAugmentFindingsBrandStoryDelta();
testNoSocialHallucinationScoresZero();
console.log("\nAll score engine tests passed.");
