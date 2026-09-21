/**
 * After Vite build, write per-slug HTML shells under dist/resources/<slug>/index.html
 * with the correct <title> and <meta name="description"> so crawlers that don't
 * execute JS still see post-specific SEO tags (SPA still hydrates from the same assets).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const tmpBundle = join(root, ".tmp", "resources-seo.mjs");

await build({
  entryPoints: [join(root, "src/content/resources.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpBundle,
  logLevel: "silent",
});

const { RESOURCE_POSTS } = await import(pathToFileURL(tmpBundle).href);
const indexHtml = readFileSync(join(distDir, "index.html"), "utf8");

function applyMeta(html, title, description, jsonLd) {
  let out = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );
  if (/<meta\s+name="description"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeAttr(description)}" />`,
    );
  } else {
    out = out.replace(
      /<\/title>/i,
      `</title>\n    <meta name="description" content="${escapeAttr(description)}" />`,
    );
  }
  if (jsonLd) {
    const script = `<script type="application/ld+json" id="resource-jsonld">${JSON.stringify(jsonLd)}</script>`;
    out = out.replace(/<\/head>/i, `    ${script}\n  </head>`);
  }
  return out;
}

function buildPostJsonLd(post, title, description) {
  const siteUrl = "https://marktr.io";
  const pageUrl = `${siteUrl}/resources/${post.slug}`;
  const article = {
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    headline: title,
    description,
    datePublished: post.date ?? "2026-02-13",
    dateModified: post.date ?? "2026-02-13",
    inLanguage: "en-GB",
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.name,
          jobTitle: post.author.title,
          url: post.author.url,
          worksFor: {
            "@type": "Organization",
            name: post.author.org,
            url: post.author.url,
          },
        }
      : { "@type": "Organization", name: "marktr" },
    publisher: { "@type": "Organization", name: "marktr" },
  };
  const graph = [article];
  if (post.faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

let count = 0;
for (const post of RESOURCE_POSTS) {
  const title = post.seoTitle ?? post.title;
  const description = post.metaDescription ?? post.description;
  const jsonLd = buildPostJsonLd(post, title, description);
  const html = applyMeta(indexHtml, title, description, jsonLd);
  const outDir = join(distDir, "resources", post.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  // Flat file so /resources/<slug> (no trailing slash) also resolves on hosts
  // that map Clean URLs to .html before the SPA rewrite.
  writeFileSync(join(distDir, "resources", `${post.slug}.html`), html, "utf8");
  count += 1;
}

// Listing page meta
const listingHtml = applyMeta(
  indexHtml,
  "Resources | marktr",
  "Marketing guides, how-to’s and playbooks — written to be practical, not fluffy.",
);
mkdirSync(join(distDir, "resources"), { recursive: true });
writeFileSync(join(distDir, "resources", "index.html"), listingHtml, "utf8");

console.log(`Prerendered SEO shells for ${count} resource posts (+ listing).`);
