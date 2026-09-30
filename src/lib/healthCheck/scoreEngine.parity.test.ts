import { describe, expect, it } from "vitest";
import {
  HEALTH_CHECK_SCORER_VERSION,
  absentApifyMetrics,
  absentHealthCheckFacts,
  buildHealthCheckRun,
  type HealthCheckFacts,
} from "./index";
import { computeDeterministicScores, HEALTH_CHECK_SCORER_VERSION as EDGE_SCORER_VERSION } from "../../../supabase/functions/score-website/deterministicScores.ts";

const STRONG_FACTS: HealthCheckFacts = {
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

const STRONG_APIFY = {
  instagramFound: true,
  instagramFetchStatus: "found" as const,
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

const THIN_FACTS: HealthCheckFacts = {
  ...absentHealthCheckFacts(),
  valueProp: "vague",
  namesCustomer: "hinted",
  usesSecondPerson: false,
  primaryCTA: "competing",
  proofOnPage: "claimed",
  pathToBuyContact: "buried",
};

const FIXTURES = [
  {
    name: "strong / complete social",
    facts: STRONG_FACTS,
    apify: STRONG_APIFY,
  },
  {
    name: "absent social (no hallucination)",
    facts: STRONG_FACTS,
    apify: absentApifyMetrics(),
  },
  {
    name: "thin / incomplete site",
    facts: THIN_FACTS,
    apify: absentApifyMetrics(),
  },
  {
    name: "social incomplete",
    facts: STRONG_FACTS,
    apify: {
      ...absentApifyMetrics(),
      instagramFetchStatus: "incomplete" as const,
    },
  },
] as const;

describe("score engine parity (client vs edge copy)", () => {
  it("shares the same scorer version string", () => {
    expect(EDGE_SCORER_VERSION).toBe(HEALTH_CHECK_SCORER_VERSION);
  });

  it.each(FIXTURES)("$name matches computeDeterministicScores", ({ facts, apify }) => {
    const client = buildHealthCheckRun({
      facts,
      apifyMetrics: apify,
      modelVersion: "test",
      inputs: {
        websiteUrl: "https://example.com",
        instagramHandle: "example",
        facebookUrl: "",
        domain: "example.com",
      },
    });
    const server = computeDeterministicScores(facts, apify);

    expect(client.scores.websiteClarity).toBe(server.website);
    expect(client.scores.brandStory).toBe(server.brandStory);
    expect(client.scores.contentConsistency).toBe(server.content);
    expect(client.scores.socialPresence).toBe(server.social);
    expect(client.scores.overall).toBe(server.overall);
    expect(client.scores.overallRaw).toBe(server.overallRaw);
    expect(client.scores.capped).toBe(server.capped);
    expect(client.socialIncomplete).toBe(server.socialIncomplete);
  });
});
