/**
 * After Vite build, write SEO HTML shells under dist/ so crawlers that don't
 * execute JS see page-specific <title>, meta description, canonical, and
 * (for resources) an <h1>. The SPA still hydrates from the same JS assets.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const tmpPosts = join(root, ".tmp", "resources-seo.mjs");
const tmpSeo = join(root, ".tmp", "seo-prerender.mjs");

await build({
  entryPoints: [join(root, "src/content/resources.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpPosts,
  logLevel: "silent",
});
await build({
  entryPoints: [join(root, "src/lib/seo.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpSeo,
  logLevel: "silent",
});

const { RESOURCE_POSTS, getRelatedResources, youtubeEmbedUrl, youtubeVideoObjects } =
  await import(pathToFileURL(tmpPosts).href);
const { MARKETING_PAGES, NOINDEX_SHELLS, canonicalUrl } = await import(
  pathToFileURL(tmpSeo).href
);
const viteIndexHtml = readFileSync(join(distDir, "index.html"), "utf8");

/**
 * @param {string} html
 * @param {{ title: string; description?: string; canonical: string; h1?: string; jsonLd?: object; robots?: string; relatedHtml?: string }} opts
 */
function applySeo(html, { title, description, canonical, h1, jsonLd, robots, relatedHtml }) {
  let out = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );

  if (description) {
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
  }

  const robotsContent = robots ?? "index, follow";
  if (/<meta\s+name="robots"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${escapeAttr(robotsContent)}" />`,
    );
  } else {
    out = out.replace(
      /<\/title>/i,
      `</title>\n    <meta name="robots" content="${escapeAttr(robotsContent)}" />`,
    );
  }

  const canonicalTag = `<link rel="canonical" href="${escapeAttr(canonical)}" />`;
  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      canonicalTag,
    );
  } else {
    out = out.replace(
      /<meta\s+name="robots"[^>]*>/i,
      (match) => `${match}\n    ${canonicalTag}`,
    );
  }

  if (jsonLd) {
    const script = `<script type="application/ld+json" id="resource-jsonld">${JSON.stringify(jsonLd)}</script>`;
    out = out.replace(/<\/head>/i, `    ${script}\n  </head>`);
  }

  if (h1) {
    const extras = relatedHtml ? relatedHtml : "";
    const shell = `<div id="root"><main><h1>${escapeHtml(h1)}</h1>${extras}</main></div>`;
    if (/<div id="root"><\/div>/.test(out)) {
      out = out.replace(/<div id="root"><\/div>/, shell);
    } else {
      out = out.replace(/<div id="root">[\s\S]*?<\/div>(\s*<\/body>)/i, `${shell}$1`);
    }
  }

  return out;
}

function buildPostJsonLd(post, title, description) {
  const pageUrl = canonicalUrl(`/resources/${post.slug}`);
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
  graph.push(...youtubeVideoObjects(post, pageUrl));
  return { "@context": "https://schema.org", "@graph": graph };
}

function youtubeShellHtml(post) {
  const chunks = [];
  for (let i = 0; i < post.body.length; i += 1) {
    const block = post.body[i];
    if (block.type !== "youtube") continue;
    const prev = post.body[i - 1];
    if (prev?.type === "h2") {
      chunks.push(`<h2>${escapeHtml(prev.text)}</h2>`);
    }
    const title = block.title ?? post.title;
    chunks.push(
      `<div class="mt-6 w-full max-w-full overflow-hidden rounded-design border border-black bg-black/5"><div class="relative w-full max-w-full" style="padding-top:56.25%"><iframe class="absolute inset-0 h-full w-full max-w-full" src="${escapeAttr(youtubeEmbedUrl(block.videoId))}" title="${escapeAttr(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div>`,
    );
  }
  return chunks.join("");
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

function writePageShell(path, html) {
  if (path === "/") {
    writeFileSync(join(distDir, "index.html"), html, "utf8");
    return;
  }
  const segments = path.replace(/^\//, "").split("/");
  const outDir = join(distDir, ...segments);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  if (segments.length === 1) {
    writeFileSync(join(distDir, `${segments[0]}.html`), html, "utf8");
  }
}

let marketingCount = 0;
for (const page of MARKETING_PAGES) {
  const html = applySeo(viteIndexHtml, {
    title: page.title,
    description: page.description,
    canonical: canonicalUrl(page.path),
    h1: page.h1,
    robots: "index, follow",
  });
  writePageShell(page.path, html);
  marketingCount += 1;
}

let noindexCount = 0;
for (const page of NOINDEX_SHELLS) {
  const html = applySeo(viteIndexHtml, {
    title: page.title,
    description: "This page is part of the marktr app and is not indexed.",
    canonical: canonicalUrl(page.path),
    robots: "noindex, nofollow",
  });
  writePageShell(page.path, html);
  noindexCount += 1;
}

let postCount = 0;
for (const post of RESOURCE_POSTS) {
  const title = post.seoTitle ?? post.title;
  const description = post.metaDescription ?? post.description;
  const jsonLd = buildPostJsonLd(post, title, description);
  const related = getRelatedResources(post.slug, 3);
  const relatedHtml = `${youtubeShellHtml(post)}<nav aria-label="Related resources"><ul>${related
    .map(
      (item) =>
        `<li><a href="/resources/${escapeAttr(item.slug)}">${escapeHtml(item.title)}</a></li>`,
    )
    .join("")}</ul><a href="/resources">Back to Resources</a></nav>`;
  const html = applySeo(viteIndexHtml, {
    title,
    description,
    canonical: canonicalUrl(`/resources/${post.slug}`),
    h1: post.title,
    jsonLd,
    robots: "index, follow",
    relatedHtml,
  });
  const outDir = join(distDir, "resources", post.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  writeFileSync(join(distDir, "resources", `${post.slug}.html`), html, "utf8");
  postCount += 1;
}

console.log(
  `Prerendered SEO shells for ${marketingCount} marketing pages + ${postCount} resource posts + ${noindexCount} noindex app shells.`,
);
