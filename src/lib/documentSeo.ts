import { canonicalUrl } from "./seo";

export type DocumentSeoOpts = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: "index, follow" | "noindex, nofollow";
};

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Client-side title / description / canonical / robots. Safe to call on every route change. */
export function applyDocumentSeo(opts: DocumentSeoOpts) {
  if (typeof document === "undefined") return;
  if (opts.title) document.title = opts.title;
  if (opts.description) upsertMeta("description", opts.description);
  if (opts.canonicalPath) upsertCanonical(canonicalUrl(opts.canonicalPath));
  if (opts.robots) upsertMeta("robots", opts.robots);
}
