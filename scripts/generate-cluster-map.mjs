/**
 * Build-time topic-cluster map for /resources posts.
 * Writes RESOURCES-CLUSTER-MAP.md at the repo root (internal reference only —
 * not copied to dist or served publicly).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outFile = join(root, "RESOURCES-CLUSTER-MAP.md");
const tmpBundle = join(root, ".tmp", "resources-cluster-map.mjs");

await build({
  entryPoints: [join(root, "src/content/resources.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpBundle,
  logLevel: "silent",
});

const { RESOURCE_POSTS } = await import(pathToFileURL(tmpBundle).href);

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

const posts = [...RESOURCE_POSTS].sort((a, b) => {
  const da = a.date ?? "";
  const db = b.date ?? "";
  if (da !== db) return db.localeCompare(da);
  return a.slug.localeCompare(b.slug);
});

const missing = posts.filter((p) => !p.topic || !p.searchIntent);
if (missing.length > 0) {
  const slugs = missing.map((p) => p.slug).join(", ");
  console.error(
    `generate-cluster-map: missing topic/searchIntent on: ${slugs}`,
  );
  process.exit(1);
}

const rows = posts.map(
  (p) =>
    `| ${escapeCell(p.title)} | \`${escapeCell(p.slug)}\` | ${escapeCell(p.topic)} | ${escapeCell(p.searchIntent)} | ${escapeCell(p.date ?? "—")} |`,
);

const md = `# Resources topic-cluster map

Auto-generated from \`src/content/resources.ts\` on every \`npm run build\`.
Do not edit by hand — update post \`topic\` / \`searchIntent\` fields instead.

Use this to check for keyword overlap before drafting a new post.

| Title | Slug | Topic | Search intent | Published |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`;

writeFileSync(outFile, md, "utf8");
console.log(
  `Wrote RESOURCES-CLUSTER-MAP.md with ${posts.length} resource posts.`,
);
