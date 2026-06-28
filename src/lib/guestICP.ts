import { supabase } from "../config/supabase";
import { runOncePerKey } from "./asyncUserLock";
import {
  claimStorageLock,
  markStorageLockDone,
  readStorageFlag,
  releaseStorageLock,
} from "./persistentUserLock";

/**
 * Guest ICP local storage (for "Guest generate → sign up to save")
 */
const GUEST_KEY = "icp_generator_guest_icps_v1";

export type GuestICP = any;

export function getGuestICPs(): GuestICP[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setGuestICPs(icps: GuestICP[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(icps || []));
  } catch {
    // ignore
  }
}

export function clearGuestICPs() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    // ignore
  }
}

function flushFlagKey(userId: string) {
  return `icp_generator_guest_icps_flushed_${userId}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "23505";
}

async function flushGuestICPsToSupabaseInner(
  userId: string,
  opts?: { brandId?: string | null }
) {
  const FLUSH_FLAG = flushFlagKey(userId);

  const guestICPs = getGuestICPs();
  if (!guestICPs.length) {
    const flagState = readStorageFlag(FLUSH_FLAG);
    if (flagState === "in_progress") {
      markStorageLockDone(FLUSH_FLAG);
    }
    return;
  }

  const now = new Date().toISOString();

  const fetchExistingKeys = async () => {
    const { data: existingRows, error: existingError } = await supabase
      .from("icps")
      .select("name,description,brand_id")
      .eq("user_id", userId);

    if (existingError) {
      throw existingError;
    }

    return new Set(
      (existingRows || []).map(
        (row: {
          name?: string | null;
          description?: string | null;
          brand_id?: string | null;
        }) => {
          const brandKey = row.brand_id ?? opts?.brandId ?? "";
          return `${brandKey}||${(row.name || "").trim().toLowerCase()}||${(row.description || "").trim()}`;
        }
      )
    );
  };

  let existingKeys: Set<string>;
  try {
    existingKeys = await fetchExistingKeys();
  } catch (existingError) {
    console.error("❌ flushGuestICPsToSupabase existing fetch failed:", existingError);
    releaseStorageLock(FLUSH_FLAG);
    return;
  }

  const brandIdForRows = opts?.brandId ?? null;
  const rows = guestICPs.map((icp: GuestICP) => {
    const name = icp.name || "";
    const description = icp.description || "";
    const rowBrandId = icp.brand_id ?? brandIdForRows ?? null;
    return {
      user_id: userId,
      name,
      description,
      industry: icp.industry || null,
      company_size: icp.company_size || icp.companySize || null,
      location: icp.location || null,
      goals: icp.goals || [],
      pain_points: icp.pain_points || icp.painPoints || [],
      budget: icp.budget || null,
      decision_makers: icp.decision_makers || icp.decisionMakers || [],
      tech_stack: icp.tech_stack || icp.techStack || [],
      challenges: icp.challenges || [],
      opportunities: icp.opportunities || [],
      brand_id: rowBrandId,
      created_at: now,
      updated_at: now,
      _dedupKey: `${rowBrandId ?? ""}||${name.trim().toLowerCase()}||${description.trim()}`,
    };
  });

  let rowsToInsert = rows.filter((row) => !existingKeys.has(row._dedupKey));

  if (rowsToInsert.length > 0) {
    try {
      existingKeys = await fetchExistingKeys();
      rowsToInsert = rows.filter((row) => !existingKeys.has(row._dedupKey));
    } catch (existingError) {
      console.error("❌ flushGuestICPsToSupabase pre-insert fetch failed:", existingError);
      releaseStorageLock(FLUSH_FLAG);
      return;
    }
  }

  if (rowsToInsert.length > 0) {
    console.log("[flushGuestICPs] insert attempt", {
      userId,
      count: rowsToInsert.length,
      names: rowsToInsert.map((row) => row.name),
    });

    const { error } = await supabase
      .from("icps")
      .insert(rowsToInsert.map(({ _dedupKey, ...rest }) => rest));

    if (error && !isDuplicateKeyError(error)) {
      console.error("❌ flushGuestICPsToSupabase insert failed:", error);
      releaseStorageLock(FLUSH_FLAG);
      return;
    }

    if (error && isDuplicateKeyError(error)) {
      console.log("[flushGuestICPs] insert skipped — unique constraint (duplicate)", {
        userId,
        count: rowsToInsert.length,
      });
    } else {
      console.log("[flushGuestICPs] insert complete", {
        userId,
        count: rowsToInsert.length,
      });
    }
  } else {
    console.log("[flushGuestICPs] insert skipped — all rows already present", { userId });
  }

  markStorageLockDone(FLUSH_FLAG);
  clearGuestICPs();

  if (import.meta.env.DEV) {
    console.log(
      `✅ Guest ICPs flushed to Supabase for user ${userId} (${rowsToInsert.length} inserted, ${rows.length - rowsToInsert.length} skipped)`
    );
  }

  try {
    window.dispatchEvent(new Event("icps:changed"));
  } catch {
    // ignore
  }
}

/**
 * Flush guest ICPs into Supabase for the logged-in user.
 * Reload-safe: localStorage lock + module lock + DB unique index.
 */
export async function flushGuestICPsToSupabase(
  userId: string,
  opts?: { brandId?: string | null }
) {
  if (!userId) return;

  const FLUSH_FLAG = flushFlagKey(userId);
  const flagState = readStorageFlag(FLUSH_FLAG);

  if (flagState === "1") {
    console.debug("[flushGuestICPs] skip — already flushed (persistent flag)", userId);
    return;
  }

  if (flagState === "in_progress") {
    console.debug("[flushGuestICPs] skip — flush in progress (persistent flag)", userId);
    return;
  }

  if (!getGuestICPs().length) {
    return;
  }

  if (!claimStorageLock(FLUSH_FLAG)) {
    console.debug("[flushGuestICPs] skip — lost claim race", userId);
    return;
  }

  try {
    return await runOncePerKey(`flush-guest-icps:${userId}`, () =>
      flushGuestICPsToSupabaseInner(userId, opts)
    );
  } catch (error) {
    releaseStorageLock(FLUSH_FLAG);
    throw error;
  }
}
