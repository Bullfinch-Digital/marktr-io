export type Edition = "marktr" | "bullfinch";

export const BULLFINCH_CHECK_HOST = "check.bullfinchdigital.com";

/** Team Vercel previews only — not arbitrary *.vercel.app. */
export const BULLFINCH_PREVIEW_HOST_RE =
  /^marktr-[a-z0-9-]+-bullfinch-digital\.vercel\.app$/;

const MARKTR_HOSTS = new Set(["marktr.io", "www.marktr.io", "app.marktr.io"]);

export function isLocalNonProdHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

export function isTeamVercelPreviewHost(host: string): boolean {
  return BULLFINCH_PREVIEW_HOST_RE.test(host.toLowerCase());
}

export function isAllowedBullfinchHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === BULLFINCH_CHECK_HOST) return true;
  if (isTeamVercelPreviewHost(h)) return true;
  if (isLocalNonProdHost(h)) return true;
  return false;
}

/** Cloudflare siteverify `hostname` must match the Bullfinch widget hosts. */
export function isAllowedBullfinchTurnstileHostname(
  hostname: string | null | undefined,
): boolean {
  if (!hostname || typeof hostname !== "string") return false;
  return isAllowedBullfinchHost(hostname.trim());
}

export function isAllowedBullfinchOrigin(
  originHeader: string | null | undefined,
): boolean {
  if (!originHeader) return false;
  let url: URL;
  try {
    url = new URL(originHeader);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (MARKTR_HOSTS.has(host)) return false;
  return isAllowedBullfinchHost(host);
}

export function resolveEditionFromRequest(opts: {
  requested: unknown;
  origin: string | null | undefined;
}): Edition {
  if (opts.requested !== "bullfinch") return "marktr";
  if (!isAllowedBullfinchOrigin(opts.origin)) return "marktr";
  return "bullfinch";
}
