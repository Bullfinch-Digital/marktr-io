/**
 * Local extraction report — fetches homepage HTML and prints extractAllSignals() output.
 * Run: npx tsx scripts/health-check-extraction-report.ts [url]
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadExtractAllSignals() {
  const src = readFileSync(
    "supabase/functions/score-website/extractSignals.ts",
    "utf8"
  )
    .replace(/npm:linkedom@0.18.9/g, "linkedom")
    .replace(/npm:@mozilla\/readability@0.5.0/g, "@mozilla/readability");

  const dir = mkdtempSync(join(tmpdir(), "marktr-extract-"));
  const modPath = join(dir, "extractSignals.ts");
  writeFileSync(modPath, src);
  const mod = await import(pathToFileURL(modPath).href);
  return mod.extractAllSignals as (html: string, url: string) => string;
}

const extractAllSignals = await loadExtractAllSignals();
const url = process.argv[2] ?? "https://uk.huel.com/";

const res = await fetch(url, {
  headers: { "User-Agent": "marktr-bot/1.0" },
});
const html = await res.text();
const signals = extractAllSignals(html, url);

console.log(`URL: ${url}`);
console.log(
  `Signal length: ${signals.length} chars (~${Math.round(signals.length / 4)} tokens)\n`
);
console.log(signals);

if (url.includes("huel")) {
  console.log("\n=== HUEL CHECKS ===");
  const checks: [string, boolean][] = [
    ["Recommended H2", signals.includes("Recommended by top performers")],
    ["Gary Neville", signals.includes("Gary Neville")],
    ["Spencer Matthews", signals.includes("Spencer Matthews")],
    ["Idris Elba", signals.includes("Idris Elba")],
    ["[GQ]", signals.includes("[GQ]")],
    ["[Wired]", /\[Wired\]/i.test(signals)],
    ["[Men's Health]", signals.includes("[Men's Health]")],
    ["Main page content populated", signals.includes("Main page content:")],
    ["No &quot; artifacts", !signals.includes("&quot;")],
    ["No &#x27; artifacts", !signals.includes("&#x27;")],
  ];
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
  }
}
