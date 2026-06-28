import { supabase } from "../config/supabase";
import { runOncePerKey } from "./asyncUserLock";

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

async function flushGuestICPsToSupabaseInner(
  userId: string,
  opts?: { brandId?: string | null }
) {
  const FLUSH_FLAG = flushFlagKey(userId);

  try {
    const alreadyFlushed = localStorage.getItem(FLUSH_FLAG);
    if (alreadyFlushed === "1") return;
  } catch {
    // ignore
  }

  const guestICPs = getGuestICPs();
  if (!guestICPs.length) return;

  // Optimistic lock before any await so concurrent tab/event callers bail out.
  try {
    localStorage.setItem(FLUSH_FLAG, "in_progress");
  } catch {
    // ignore
  }

  const now = new Date().toISOString();

  const fetchExistingKeys = async () => {
    const { data: existingRows, error: existingError } = await supabase
      .from("icps")
      .select("name,description")
      .eq("user_id", userId);

    if (existingError) {
      throw existingError;
    }

    return new Set(
      (existingRows || []).map(
        (row: { name?: string | null; description?: string | null }) =>
          `${(row.name || "").trim()}||${(row.description || "").trim()}`
      )
    );
  };

  let existingKeys: Set<string>;
  try {
    existingKeys = await fetchExistingKeys();
  } catch (existingError) {
    console.error("❌ flushGuestICPsToSupabase existing fetch failed:", existingError);
    try {
      localStorage.removeItem(FLUSH_FLAG);
    } catch {
      // ignore
    }
    return;
  }

  const rows = guestICPs.map((icp: GuestICP) => {
    const name = icp.name || "";
    const description = icp.description || "";
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
      brand_id: icp.brand_id ?? opts?.brandId ?? null,
      created_at: now,
      updated_at: now,
      _dedupKey: `${name.trim()}||${description.trim()}`,
    };
  });

  let rowsToInsert = rows.filter((row) => !existingKeys.has(row._dedupKey));

  if (rowsToInsert.length > 0) {
    // Re-check immediately before insert in case a parallel run slipped through pre-lock era.
    try {
      existingKeys = await fetchExistingKeys();
      rowsToInsert = rows.filter((row) => !existingKeys.has(row._dedupKey));
    } catch (existingError) {
      console.error("❌ flushGuestICPsToSupabase pre-insert fetch failed:", existingError);
      try {
        localStorage.removeItem(FLUSH_FLAG);
      } catch {
        // ignore
      }
      return;
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await supabase
      .from("icps")
      .insert(rowsToInsert.map(({ _dedupKey, ...rest }) => rest));
    if (error) {
      console.error("❌ flushGuestICPsToSupabase insert failed:", error);
      try {
        localStorage.removeItem(FLUSH_FLAG);
      } catch {
        // ignore
      }
      return;
    }
  }

  try {
    localStorage.setItem(FLUSH_FLAG, "1");
  } catch {
    // ignore
  }
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
 * Idempotent per user: module lock + local flush flag + name/description dedupe.
 */
export async function flushGuestICPsToSupabase(
  userId: string,
  opts?: { brandId?: string | null }
) {
  if (!userId) return;
  return runOncePerKey(`flush-guest-icps:${userId}`, () =>
    flushGuestICPsToSupabaseInner(userId, opts)
  );
}
