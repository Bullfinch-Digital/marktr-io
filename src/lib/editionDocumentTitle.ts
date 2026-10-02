import { getEdition } from "./edition";
import { editionConfig } from "./editionConfig";

const REPORT_PATH = /^\/r\/[^/]+\/?$/;

/** Bullfinch tab title for the current path. The home check and the report use different titles. */
export function bullfinchDocumentTitle(pathname: string): string {
  const titles = editionConfig.bullfinch.titles;
  return REPORT_PATH.test(pathname) ? titles.healthCheckReport : titles.healthCheck;
}

/**
 * Set the Bullfinch document title before gtag config or page_view.
 * marktr keeps whatever title its own pages set.
 */
export function applyBullfinchDocumentTitle(
  pathname = typeof window !== "undefined" ? window.location.pathname : "/",
): string | null {
  if (getEdition() !== "bullfinch") return null;
  const title = bullfinchDocumentTitle(pathname);
  if (typeof document !== "undefined") document.title = title;
  return title;
}
