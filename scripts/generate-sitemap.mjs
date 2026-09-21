/**
 * Build-time sitemap.xml for public marketing pages + every /resources/:slug post.
 * Runs after Vite build so the file lands in dist/ and is served as a static asset.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const tmpBundle = join(root, ".tmp", "resources-sitemap.mjs");
const SITE = "https://www.marktr.io";

await build({
  entryPoints: [join(root, "src/content/resources.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpBundle,
  logLevel: "silent",
});

const { RESOURCE_POSTS } = await import(pathToFileURL(tmpBundle).href);

/** @type {Array<{ path: string; lastmod?: string; changefreq?: string; priority?: string }>} */
const staticPages = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/resources", changefreq: "weekly", priority: "0.9" },
  { path: "/downloads", changefreq: "weekly", priority: "0.7" },
  { path: "/newsletter", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/story", changefreq: "monthly", priority: "0.7" },
  { path: "/onboarding-build", changefreq: "monthly", priority: "0.7" },
  { path: "/health-check", changefreq: "monthly", priority: "0.7" },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
  if (priority) parts.push(`    <priority>${escapeXml(priority)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

const urls = [
  ...staticPages.map((p) =>
    urlEntry({
      loc: `${SITE}${p.path === "/" ? "/" : p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    }),
  ),
  ...RESOURCE_POSTS.map((post) =>
    urlEntry({
      loc: `${SITE}/resources/${post.slug}`,
      lastmod: post.date ?? undefined,
      changefreq: "monthly",
      priority: "0.8",
    }),
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, "sitemap.xml"), xml, "utf8");
console.log(
  `Wrote sitemap.xml with ${staticPages.length} marketing pages + ${RESOURCE_POSTS.length} resource posts.`,
);
