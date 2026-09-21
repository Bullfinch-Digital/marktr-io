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
const tmpBundle = join(root, ".tmp", "resources-seo.mjs");
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
const viteIndexHtml = readFileSync(join(distDir, "index.html"), "utf8");

/**
 * Public marketing / legal / onboarding entry pages that need unique raw HTML
 * metadata. Auth, dashboard, and dynamic result routes are intentionally omitted.
 * @type {Array<{ path: string; title: string; description: string; h1: string }>}
 */
const MARKETING_PAGES = [
  {
    path: "/",
    title: "marktr — your marketing team, built in",
    description:
      "Marktr is your marketing team, built in. Define your ideal customer, shape your story, and generate content without agency overhead.",
    h1: "Marketing that knows your customer.",
  },
  {
    path: "/pricing",
    title: "Pricing | marktr",
    description:
      "Start free on marktr. Upgrade for the full Brand Story System, unlimited ICPs, health report, content strategy, and exportable deliverables.",
    h1: "Plans built to help you target smarter & grow faster",
  },
  {
    path: "/onboarding-build",
    title: "Build your Ideal Customer Profile | marktr",
    description:
      "Answer a few quick questions and generate a detailed Ideal Customer Profile — free, no account required to start.",
    h1: "Let's build your Ideal Customer Profile",
  },
  {
    path: "/health-check",
    title: "Digital Health Check | marktr",
    description:
      "Score your digital presence in about two minutes. Answer five questions and get a founder-focused health check from marktr.",
    h1: "Let's check your digital health.",
  },
  {
    path: "/story",
    title: "Build your brand story | marktr",
    description:
      "Map your brand story with marktr's guided framework — the foundation for clearer messaging, content, and offers.",
    h1: "Build your brand story",
  },
  {
    path: "/downloads",
    title: "Free downloads | marktr",
    description:
      "Worksheets, templates and guides that go with our YouTube videos. Enter your email to unlock each PDF.",
    h1: "Free downloads",
  },
  {
    path: "/newsletter",
    title: "Join the marktr newsletter | Practical marketing for founders",
    description:
      "Free resources, practical marketing tips and founder-friendly support. No spam — unsubscribe anytime.",
    h1: "Marketing help for founders who'd rather build than post.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | marktr",
    description:
      "How Bullfinch Digital collects, uses, and protects your personal data when you use marktr.",
    h1: "Privacy Policy",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Use | marktr",
    description:
      "Terms of use for marktr — the rules that apply when you use our product and website.",
    h1: "Terms of Use",
  },
  {
    path: "/cookie-policy",
    title: "Cookie Policy | marktr",
    description:
      "How marktr uses cookies and similar technologies, and the choices available to you.",
    h1: "Cookie Policy",
  },
  {
    path: "/resources",
    title: "Resources | marktr",
    description:
      "Marketing guides, how-to’s and playbooks — written to be practical, not fluffy.",
    h1: "Resources",
  },
];

/**
 * @param {string} html
 * @param {{ title: string; description: string; canonical: string; h1?: string; jsonLd?: object }} opts
 */
function applySeo(html, { title, description, canonical, h1, jsonLd }) {
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

  const canonicalTag = `<link rel="canonical" href="${escapeAttr(canonical)}" />`;
  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      canonicalTag,
    );
  } else {
    out = out.replace(
      /<meta\s+name="description"[^>]*>/i,
      (match) => `${match}\n    ${canonicalTag}`,
    );
  }

  if (jsonLd) {
    const script = `<script type="application/ld+json" id="resource-jsonld">${JSON.stringify(jsonLd)}</script>`;
    out = out.replace(/<\/head>/i, `    ${script}\n  </head>`);
  }

  if (h1) {
    const shell = `<div id="root"><main><h1>${escapeHtml(h1)}</h1></main></div>`;
    if (/<div id="root"><\/div>/.test(out)) {
      out = out.replace(/<div id="root"><\/div>/, shell);
    } else {
      out = out.replace(/<div id="root">[\s\S]*?<\/div>(\s*<\/body>)/i, `${shell}$1`);
    }
  }

  return out;
}

function buildPostJsonLd(post, title, description) {
  const pageUrl = `${SITE}/resources/${post.slug}`;
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

function writePageShell(path, html) {
  if (path === "/") {
    writeFileSync(join(distDir, "index.html"), html, "utf8");
    return;
  }
  const segments = path.replace(/^\//, "").split("/");
  const outDir = join(distDir, ...segments);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  // Flat file so /path (no trailing slash) resolves on hosts that map Clean URLs
  // to .html before the SPA rewrite.
  if (segments.length === 1) {
    writeFileSync(join(distDir, `${segments[0]}.html`), html, "utf8");
  }
}

let marketingCount = 0;
for (const page of MARKETING_PAGES) {
  const canonical = page.path === "/" ? `${SITE}/` : `${SITE}${page.path}`;
  const html = applySeo(viteIndexHtml, {
    title: page.title,
    description: page.description,
    canonical,
    h1: page.h1,
  });
  writePageShell(page.path, html);
  marketingCount += 1;
}

let postCount = 0;
for (const post of RESOURCE_POSTS) {
  const title = post.seoTitle ?? post.title;
  const description = post.metaDescription ?? post.description;
  const canonical = `${SITE}/resources/${post.slug}`;
  const jsonLd = buildPostJsonLd(post, title, description);
  const html = applySeo(viteIndexHtml, {
    title,
    description,
    canonical,
    h1: post.title,
    jsonLd,
  });
  const outDir = join(distDir, "resources", post.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  writeFileSync(join(distDir, "resources", `${post.slug}.html`), html, "utf8");
  postCount += 1;
}

console.log(
  `Prerendered SEO shells for ${marketingCount} marketing pages + ${postCount} resource posts.`,
);
