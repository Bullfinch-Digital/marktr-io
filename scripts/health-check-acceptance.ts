/**
 * Stage 1 acceptance test — invoke score-website twice for Mother Root.
 * Run: npx tsx scripts/health-check-acceptance.ts
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or environment.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseScoreWebsiteResponse,
  type DeterministicHealthCheckRun,
} from "../src/lib/healthCheck/index.ts";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m) continue;
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      // file missing
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const WEBSITE = "https://motherroot.com";
const INSTAGRAM = "motherroot";

async function invokeScoreWebsite(priorRun?: Record<string, unknown>): Promise<DeterministicHealthCheckRun> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/score-website`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      websiteUrl: WEBSITE,
      instagramHandle: INSTAGRAM,
      ...(priorRun ? { priorRun } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`score-website failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const parsed = parseScoreWebsiteResponse(data, {
    websiteUrl: WEBSITE,
    instagramHandle: INSTAGRAM,
    facebookUrl: "",
    domain: "motherroot.com",
  });
  return parsed.deterministic;
}

function printRun(label: string, run: DeterministicHealthCheckRun) {
  console.log(`\n${label}:`);
  console.log("  modelVersion:", run.modelVersion);
  console.log("  websiteClarity:", run.scores.websiteClarity);
  console.log("  brandStory:", run.scores.brandStory);
  console.log("  contentConsistency:", run.scores.contentConsistency);
  console.log("  socialPresence:", run.scores.socialPresence);
  console.log("  overall:", run.scores.overall);
  console.log("  engagement band:", run.socialBands.engagement);
  console.log("  followers:", run.apifyMetrics.followers);
}

async function main() {
  console.log("Mother Root acceptance test — running score-website twice…");
  const run1 = await invokeScoreWebsite();
  const run2 = await invokeScoreWebsite();

  const mockPriorRun = {
    scores: {
      website: 50,
      brandStory: 40,
      content: 30,
      social: 25,
      overall: 37,
    },
    findings: [
      {
        dimension: "Website Clarity",
        finding: "Your homepage lacks a clear call to action — visitors may not know what to do next.",
      },
      {
        dimension: "Brand Story",
        finding: "No founder story found on your about page.",
      },
    ],
    gaps: ["no clear CTA", "missing proof on homepage"],
    missingElements: ["founding moment", "clear why/purpose"],
    created_at: "2025-01-01T12:00:00.000Z",
  };

  console.log("\nRun 3 — same site WITH priorRun (scores must match run 1)…");
  const run3 = await invokeScoreWebsite(mockPriorRun);

  printRun("Run 1", run1);
  printRun("Run 2", run2);
  printRun("Run 3 (with priorRun)", run3);

  const dims = [
    "websiteClarity",
    "brandStory",
    "contentConsistency",
    "socialPresence",
    "overall",
  ] as const;

  let allMatch = true;
  for (const dim of dims) {
    const match12 = run1.scores[dim] === run2.scores[dim];
    const match13 = run1.scores[dim] === run3.scores[dim];
    console.log(
      `${match12 && match13 ? "✓" : "✗"} ${dim}: ${run1.scores[dim]} vs ${run2.scores[dim]} vs priorRun ${run3.scores[dim]}`
    );
    if (!match12 || !match13) allMatch = false;
  }

  const factsMatch =
    JSON.stringify(run1.facts) === JSON.stringify(run2.facts) &&
    JSON.stringify(run1.facts) === JSON.stringify(run3.facts);
  console.log(`${factsMatch ? "✓" : "✗"} facts identical across all runs: ${factsMatch}`);

  if (!allMatch) {
    process.exit(1);
  }
  console.log("\nAcceptance test PASSED — scores identical with and without priorRun.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
