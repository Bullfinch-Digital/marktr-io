import { resolveBrandIdForIcpWrite } from "./icpBrandAttach";

/**
 * Brand Aim writes must always resolve a non-null brand id.
 * Mirrors the ICP brand resolve-or-fail chain (context -> persisted -> DB/create).
 */
export async function resolveBrandIdForAimWrite(
  userId: string,
  preferredBrandId?: string | null
): Promise<string> {
  return resolveBrandIdForIcpWrite(userId, preferredBrandId ?? null);
}
