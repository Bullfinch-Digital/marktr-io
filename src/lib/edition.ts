import type { Edition } from "../../supabase/functions/_shared/bullfinchHosts.ts";
import {
  isLocalNonProdHost,
  isTeamVercelPreviewHost,
} from "../../supabase/functions/_shared/bullfinchHosts.ts";

export type { Edition };
export {
  BULLFINCH_CHECK_HOST,
  BULLFINCH_PREVIEW_HOST_RE,
  isAllowedBullfinchHost,
  isAllowedBullfinchOrigin,
  isAllowedBullfinchTurnstileHostname,
  isLocalNonProdHost,
  isTeamVercelPreviewHost,
  resolveEditionFromRequest,
} from "../../supabase/functions/_shared/bullfinchHosts.ts";

const BULLFINCH_HOSTS = new Set(["check.bullfinchdigital.com"]);
const MARKTR_HOSTS = new Set(["marktr.io", "www.marktr.io", "app.marktr.io"]);

export function getEdition(): Edition {
  if (typeof window === "undefined") return "marktr";
  const host = window.location.hostname.toLowerCase();
  if (BULLFINCH_HOSTS.has(host)) return "bullfinch";
  if (MARKTR_HOSTS.has(host)) return "marktr";
  // Preview / local override only; never honoured on production marktr hosts.
  const allowOverride =
    isTeamVercelPreviewHost(host) ||
    ((import.meta.env.DEV || import.meta.env.MODE !== "production") &&
      isLocalNonProdHost(host));
  if (allowOverride) {
    const v = new URLSearchParams(window.location.search).get("edition");
    if (v === "bullfinch") return "bullfinch";
  }
  return "marktr";
}
