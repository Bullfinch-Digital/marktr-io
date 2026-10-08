/**
 * Build-time sitemap.xml for public marketing pages + every /resources/:slug post.
 * Writes to public/ so Vite copies it into dist/ as a real static file (not the SPA).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const distDir = join(root, "dist");
const tmpSeo = join(root, ".tmp", "seo-sitemap.mjs");
const tmpPosts = join(root, ".tmp", "resources-sitemap.mjs");

await build({
  entryPoints: [join(root, "src/lib/seo.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpSeo,
  logLevel: "silent",
});
await build({
  entryPoints: [join(root, "src/content/resources.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpPosts,
  logLevel: "silent",
});

const { buildSitemapXml } = await import(pathToFileURL(tmpSeo).href);
const { RESOURCE_POSTS } = await import(pathToFileURL(tmpPosts).href);

if (!Array.isArray(RESOURCE_POSTS) || RESOURCE_POSTS.length === 0) {
  throw new Error("generate-sitemap: RESOURCE_POSTS is empty");
}

const xml = buildSitemapXml(RESOURCE_POSTS);
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "sitemap.xml"), xml, "utf8");
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, "sitemap.xml"), xml, "utf8");
console.log(
  `Wrote sitemap.xml with ${xml.split("<url>").length - 1} URLs (${RESOURCE_POSTS.length} resource posts).`,
);
