import { next, rewrite } from "@vercel/functions";
import { BULLFINCH_CHECK_HOST } from "./supabase/functions/_shared/bullfinchHosts";

/**
 * "/" is a real file (index.html), so vercel.json rewrites never see it.
 * Routing Middleware runs before the filesystem. Only the check host is rewritten.
 */
export const config = {
  matcher: ["/", "/index.html"],
};

function hostnameOf(value: string | null): string {
  if (!value) return "";
  return value.split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
}

export function requestHostname(request: {
  url: string;
  headers: { get(name: string): string | null };
}): string {
  const host = hostnameOf(request.headers.get("host"));
  if (host) return host;
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export default function middleware(request: Request) {
  if (requestHostname(request) !== BULLFINCH_CHECK_HOST) return next();
  const url = new URL(request.url);
  url.pathname = "/bullfinch.html";
  return rewrite(url);
}
