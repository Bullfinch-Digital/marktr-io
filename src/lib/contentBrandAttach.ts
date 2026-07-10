import { resolveBrandIdForIcpWrite } from "./icpBrandAttach";

/**
 * Content item writes must always resolve a non-null brand id.
 * Mirrors the ICP / aim brand resolve-or-fail chain.
 */
export async function resolveBrandIdForContentWrite(
  userId: string,
  preferredBrandId?: string | null
): Promise<string> {
  return resolveBrandIdForIcpWrite(userId, preferredBrandId ?? null);
}
