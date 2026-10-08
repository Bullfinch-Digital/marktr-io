/** Canonical public origin — always www, always https, no trailing slash. */
export const SITE_ORIGIN = "https://www.marktr.io";
export const APEX_HOST = "marktr.io";
export const CANONICAL_HOST = "www.marktr.io";

export type MarketingPageSeo = {
  path: string;
  title: string;
  description: string;
  h1: string;
};

/** Indexable marketing / legal pages (also prerendered). */
export const MARKETING_PAGES: MarketingPageSeo[] = [
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

export const PUBLIC_SITEMAP_PATHS: string[] = MARKETING_PAGES.map((p) => p.path);

/** Prerendered HTML shells with noindex so crawlers don't treat app URLs as the homepage. */
export const NOINDEX_SHELLS: Array<{ path: string; title: string }> = [
  { path: "/dashboard", title: "Dashboard | marktr" },
  { path: "/admin", title: "Admin | marktr" },
  { path: "/account", title: "Account | marktr" },
  { path: "/strategy", title: "Strategy | marktr" },
  { path: "/content", title: "Content | marktr" },
  { path: "/icps", title: "ICPs | marktr" },
  { path: "/my-brands", title: "Brands | marktr" },
  { path: "/collections", title: "Collections | marktr" },
  { path: "/scheduling", title: "Scheduling | marktr" },
  { path: "/team", title: "Team | marktr" },
  { path: "/onboarding-build", title: "Build your Ideal Customer Profile | marktr" },
  { path: "/health-check/results", title: "Health check results | marktr" },
  { path: "/story/results", title: "Story results | marktr" },
  { path: "/guest-dashboard", title: "Preview | marktr" },
];

/**
 * Prefix match. `/health-check` is indexable; `/health-check/results` is not.
 * `/onboarding` covers `/onboarding-build`.
 */
export const NOINDEX_PATH_PREFIXES = [
  "/admin",
  "/dashboard",
  "/strategy",
  "/content",
  "/icps",
  "/icp/",
  "/icp-report",
  "/icp-preview",
  "/my-brands",
  "/collections",
  "/scheduling",
  "/account",
  "/team",
  "/onboarding",
  "/onboarding-build",
  "/health-report",
  "/story-report",
  "/guest-dashboard",
  "/health-check/results",
  "/story/results",
  "/health-preview",
  "/login",
  "/signup",
  "/logout",
  "/auth/",
  "/reset-password",
  "/check-email",
  "/payment-success",
  "/paywall-demo",
  "/beta-signup",
] as const;

export function normalizePath(path: string): string {
  const noQuery = path.split("?")[0]?.split("#")[0] || "/";
  if (noQuery === "/") return "/";
  return noQuery.replace(/\/+$/, "") || "/";
}

/** Absolute https://www.marktr.io/<path> with no trailing slash except home. */
export function canonicalUrl(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function getMarketingPage(path: string): MarketingPageSeo | undefined {
  const normalized = normalizePath(path);
  return MARKETING_PAGES.find((p) => p.path === normalized);
}

export function isNoIndexPath(path: string): boolean {
  const normalized = normalizePath(path);
  return NOINDEX_PATH_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) {
      return normalized === prefix.slice(0, -1) || normalized.startsWith(prefix);
    }
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
}

export function isResourcePostPath(path: string): boolean {
  const normalized = normalizePath(path);
  return normalized.startsWith("/resources/") && normalized !== "/resources";
}

const PRODUCTION_HOSTS = new Set([APEX_HOST, CANONICAL_HOST, "app.marktr.io"]);

/** One 301 to https://www.marktr.io, preserving path/query. Preview/localhost are left alone. */
export function canonicalRedirectUrl(requestUrl: string, hostHeader?: string | null): string | null {
  let hostname = "";
  if (hostHeader) {
    hostname = hostHeader.split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
  }
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (!hostname) hostname = url.hostname.toLowerCase();
  if (!PRODUCTION_HOSTS.has(hostname)) return null;

  const next = new URL(url.href);
  next.hostname = CANONICAL_HOST;
  next.protocol = "https:";
  next.port = "";
  if (next.href === url.href) return null;
  return next.href;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(opts: {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}): string {
  const parts = [`    <loc>${escapeXml(opts.loc)}</loc>`];
  if (opts.lastmod) parts.push(`    <lastmod>${escapeXml(opts.lastmod)}</lastmod>`);
  if (opts.changefreq) parts.push(`    <changefreq>${escapeXml(opts.changefreq)}</changefreq>`);
  if (opts.priority) parts.push(`    <priority>${escapeXml(opts.priority)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

const STATIC_CHANGEFREQ: Record<string, { changefreq: string; priority: string }> = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/resources": { changefreq: "weekly", priority: "0.9" },
  "/pricing": { changefreq: "monthly", priority: "0.8" },
  "/story": { changefreq: "monthly", priority: "0.7" },
  "/health-check": { changefreq: "monthly", priority: "0.7" },
  "/downloads": { changefreq: "weekly", priority: "0.7" },
  "/newsletter": { changefreq: "monthly", priority: "0.6" },
  "/privacy-policy": { changefreq: "yearly", priority: "0.3" },
  "/terms-of-service": { changefreq: "yearly", priority: "0.3" },
  "/cookie-policy": { changefreq: "yearly", priority: "0.3" },
};

export function buildSitemapXml(posts: Array<{ slug: string; date?: string }>): string {
  const staticEntries = PUBLIC_SITEMAP_PATHS.map((path) => {
    const meta = STATIC_CHANGEFREQ[path] ?? { changefreq: "monthly", priority: "0.5" };
    return urlEntry({
      loc: canonicalUrl(path),
      changefreq: meta.changefreq,
      priority: meta.priority,
    });
  });
  const postEntries = posts.map((post) =>
    urlEntry({
      loc: canonicalUrl(`/resources/${post.slug}`),
      lastmod: post.date,
      changefreq: "monthly",
      priority: "0.8",
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...postEntries].join("\n")}
</urlset>
`;
}
