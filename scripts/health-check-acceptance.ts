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

async function invokeScoreWebsite(): Promise<DeterministicHealthCheckRun> {
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

  printRun("Run 1", run1);
  printRun("Run 2", run2);

  const dims = [
    "websiteClarity",
    "brandStory",
    "contentConsistency",
    "socialPresence",
    "overall",
  ] as const;

  let allMatch = true;
  for (const dim of dims) {
    const match = run1.scores[dim] === run2.scores[dim];
    console.log(`${match ? "✓" : "✗"} ${dim}: ${run1.scores[dim]} vs ${run2.scores[dim]}`);
    if (!match) allMatch = false;
  }

  const factsMatch =
    JSON.stringify(run1.facts) === JSON.stringify(run2.facts);
  console.log(`${factsMatch ? "✓" : "✗"} facts identical: ${factsMatch}`);

  if (!allMatch) {
    process.exit(1);
  }
  console.log("\nAcceptance test PASSED — scores identical across both runs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
