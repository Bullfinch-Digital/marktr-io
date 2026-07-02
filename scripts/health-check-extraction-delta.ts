/** Compare old vs new homepage signal sizes for token/cost delta estimate. */
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

function oldExtract(html: string) {
  const clean = (t: string) =>
    t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const getAll = (p: RegExp) =>
    [...html.matchAll(p)].map((m) => m[1]?.trim()).filter(Boolean) as string[];
  const h2s = getAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)
    .map(clean)
    .filter((t) => t.length > 2 && t.length < 120)
    .slice(0, 5);
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  const mainText = main ? clean(main).slice(0, 1200) : "";
  const reviews: string[] = [];
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi)) {
    const q = clean(m[1]);
    if (q.length >= 15) reviews.push(`"${q}"`);
    if (reviews.length >= 6) break;
  }
  const reviewBlock = reviews.length
    ? `Customer reviews:\n${reviews.join("\n")}`
    : "";
  return {
    h2s,
    mainLen: mainText.length,
    reviews: reviews.length,
    approxChars: h2s.join("").length + mainText.length + reviewBlock.length,
  };
}

const extractAllSignals = await loadExtractAllSignals();

async function compare(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "marktr-bot/1.0" } });
  const html = await res.text();
  const neu = extractAllSignals(html, url);
  const old = oldExtract(html);
  const delta = neu.length - old.approxChars;
  console.log(url);
  console.log(
    `  OLD approx: ${old.approxChars} chars (h2×${old.h2s.length}, main ${old.mainLen}, reviews ${old.reviews})`
  );
  console.log(`  NEW:        ${neu.length} chars (~${Math.round(neu.length / 4)} tokens)`);
  console.log(
    `  Delta:      +${delta} chars (~+${Math.round(delta / 4)} input tokens on facts call homepage section)`
  );
  console.log(
    `  Cost @ gpt-4o-mini input $0.15/1M: ~$${((delta / 4) * 0.15 / 1_000_000).toFixed(6)} per scan`
  );
  console.log(
    `  OLD had proof H2: ${old.h2s.some((h) => h.includes("Recommended"))}`
  );
  console.log();
}

await compare("https://uk.huel.com/");
await compare("https://motherroot.com");
