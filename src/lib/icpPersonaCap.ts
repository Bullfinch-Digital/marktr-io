import { supabase } from "../config/supabase";
import { applyCurrentIcpFilter } from "./icpVersioning";

/** Max current (non-archived, non-superseded) personas per brand. */
export const ICP_CURRENT_CAP = 10;

/** Show a gentle nudge when initiating regenerate at or above this count. */
export const ICP_NUDGE_THRESHOLD = 7;

let pendingRegenerateNudge: string | null = null;

/** Stash a one-shot nudge for the onboarding loading screen (non-blocking). */
export function setPendingIcpRegenerateNudge(message: string | null): void {
  pendingRegenerateNudge = message;
}

export function consumePendingIcpRegenerateNudge(): string | null {
  const message = pendingRegenerateNudge;
  pendingRegenerateNudge = null;
  return message;
}

/** Current personas for a brand: superseded_at IS NULL AND deleted_at IS NULL. */
export async function countCurrentIcpsForBrand(
  userId: string,
  brandId: string
): Promise<number> {
  let query = supabase
    .from("icps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("brand_id", brandId);

  query = applyCurrentIcpFilter(query);

  const { count, error } = await query;
  if (error) {
    console.error("[icpPersonaCap] countCurrentIcpsForBrand failed", error);
    throw error;
  }
  return count ?? 0;
}

export function wouldExceedIcpCap(currentCount: number, batchSize: number): boolean {
  return currentCount + batchSize > ICP_CURRENT_CAP;
}

export function shouldShowIcpNudge(currentCount: number): boolean {
  return currentCount >= ICP_NUDGE_THRESHOLD;
}

export function formatIcpCapBlockMessage(brandName: string): string {
  return `You've reached the limit of ${ICP_CURRENT_CAP} customer profiles for ${brandName}. Archive some you're not using before generating more.`;
}

export function formatIcpNudgeMessage(currentCount: number): string {
  return `You've got ${currentCount} profiles — you can have up to ${ICP_CURRENT_CAP}. Archiving ones you're not using keeps your targeting focused.`;
}

export function formatIcpRestoreOverCapNudge(countAfterRestore: number): string {
  return `You now have ${countAfterRestore} profiles (limit ${ICP_CURRENT_CAP}). Consider archiving ones you're not using to keep targeting focused.`;
}
