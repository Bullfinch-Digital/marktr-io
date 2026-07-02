import { supabase } from "../config/supabase";
import { runOncePerKey } from "./asyncUserLock";
import {
  attachOrphanIcpsToBrand,
  resolveBrandIdForIcpOps,
} from "./icpBrandAttach";
import { newGenerationId, supersedeBrandCurrentIcps } from "./icpVersioning";
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

export type GuestICP = Record<string, unknown>;

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

export function logSupabaseError(prefix: string, error: unknown) {
  const e = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  console.error(prefix, {
    code: e?.code ?? null,
    message: e?.message ?? String(error),
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  });
}

function isDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "23505";
}

function isSchemaColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: string };
  const blob = `${e?.code ?? ""} ${e?.message ?? ""} ${e?.details ?? ""}`.toLowerCase();
  return (
    String(e?.code ?? "").toUpperCase() === "PGRST204" ||
    /column|schema cache|could not find/i.test(blob)
  );
}

function dedupKey(
  brandId: string | null | undefined,
  name: string,
  description: string
) {
  return `${brandId ?? ""}||${name.trim().toLowerCase()}||${description.trim()}`;
}

function buildIcpInsertRow(
  icp: GuestICP,
  userId: string,
  brandId: string | null,
  now: string,
  generationId: string,
  opts?: { includeBrandId?: boolean }
) {
  const name = String(icp.name ?? "").trim();
  const description = String(icp.description ?? "").trim();
  const row: Record<string, unknown> = {
    user_id: userId,
    name,
    description,
    industry: icp.industry || null,
    company_size: icp.company_size || icp.companySize || null,
    location: icp.location || null,
    goals: Array.isArray(icp.goals) ? icp.goals : [],
    pain_points: Array.isArray(icp.pain_points)
      ? icp.pain_points
      : Array.isArray(icp.painPoints)
        ? icp.painPoints
        : [],
    budget: icp.budget || null,
    decision_makers: Array.isArray(icp.decision_makers)
      ? icp.decision_makers
      : Array.isArray(icp.decisionMakers)
        ? icp.decisionMakers
        : [],
    tech_stack: Array.isArray(icp.tech_stack)
      ? icp.tech_stack
      : Array.isArray(icp.techStack)
        ? icp.techStack
        : [],
    challenges: Array.isArray(icp.challenges) ? icp.challenges : [],
    opportunities: Array.isArray(icp.opportunities) ? icp.opportunities : [],
    avatar_key: icp.avatar_key ?? null,
    avatar_gender: icp.avatar_gender ?? null,
    avatar_age_range: icp.avatar_age_range ?? null,
    generation_id: generationId,
    version: 1,
    superseded_at: null,
    created_at: now,
    updated_at: now,
  };

  if (opts?.includeBrandId !== false) {
    row.brand_id = icp.brand_id ?? brandId ?? null;
  }

  return {
    row,
    dedupKey: dedupKey(
      (row.brand_id as string | null) ?? null,
      name,
      description
    ),
  };
}

function stripAvatarColumns(row: Record<string, unknown>) {
  const { avatar_key, avatar_gender, avatar_age_range, ...base } = row;
  return base;
}

function stripBrandIdColumn(row: Record<string, unknown>) {
  const { brand_id, ...base } = row;
  return base;
}

async function countUserIcps(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("icps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("[flushGuestICPs] count failed", error);
    return -1;
  }
  return count ?? 0;
}

async function fetchExistingKeys(
  userId: string,
  fallbackBrandId: string | null
): Promise<Set<string>> {
  const { data: existingRows, error: existingError } = await supabase
    .from("icps")
    .select("name,description,brand_id")
    .eq("user_id", userId)
    .is("superseded_at", null);

  if (existingError) {
    throw existingError;
  }

  return new Set(
    (existingRows || []).map(
      (row: {
        name?: string | null;
        description?: string | null;
        brand_id?: string | null;
      }) =>
        dedupKey(
          row.brand_id ?? fallbackBrandId,
          row.name || "",
          row.description || ""
        )
    )
  );
}

async function insertIcpRows(
  rows: Record<string, unknown>[],
  userId: string
): Promise<{ inserted: number; failed: boolean }> {
  if (!rows.length) return { inserted: 0, failed: false };

  const tryInsert = async (payload: Record<string, unknown>[]) => {
    return supabase.from("icps").insert(payload).select("id");
  };

  let { data, error } = await tryInsert(rows);

  if (error && isSchemaColumnError(error)) {
    logSupabaseError("[flushGuestICPs] batch insert schema mismatch — retrying without avatar columns", error);
    ({ data, error } = await tryInsert(rows.map(stripAvatarColumns)));
  }

  if (error && isSchemaColumnError(error)) {
    logSupabaseError("[flushGuestICPs] batch insert schema mismatch — retrying without brand_id", error);
    ({ data, error } = await tryInsert(rows.map((row) => stripBrandIdColumn(stripAvatarColumns(row)))));
  }

  if (!error) {
    return { inserted: data?.length ?? rows.length, failed: false };
  }

  if (isDuplicateKeyError(error)) {
    console.log("[flushGuestICPs] batch duplicate — falling back to per-row insert", { userId });
  } else {
    logSupabaseError("[flushGuestICPs] batch insert failed — falling back to per-row insert", error);
  }

  let inserted = 0;
  let anyHardFailure = false;

  for (const row of rows) {
    const attempts = [
      row,
      stripAvatarColumns(row),
      stripBrandIdColumn(stripAvatarColumns(row)),
    ];

    let rowOk = false;
    for (const attempt of attempts) {
      const { error: rowError } = await supabase.from("icps").insert([attempt]);
      if (!rowError) {
        inserted += 1;
        rowOk = true;
        break;
      }
      if (isDuplicateKeyError(rowError)) {
        inserted += 1;
        rowOk = true;
        break;
      }
      if (!isSchemaColumnError(rowError)) {
        logSupabaseError("[flushGuestICPs] row insert failed", rowError);
        break;
      }
    }

    if (!rowOk) {
      anyHardFailure = true;
    }
  }

  return { inserted, failed: anyHardFailure };
}

async function flushGuestICPsToSupabaseInner(
  userId: string,
  opts?: { brandId?: string | null }
): Promise<boolean> {
  const FLUSH_FLAG = flushFlagKey(userId);
  const guestICPs = getGuestICPs();

  if (!guestICPs.length) {
    const flagState = readStorageFlag(FLUSH_FLAG);
    if (flagState === "in_progress") {
      markStorageLockDone(FLUSH_FLAG);
    }
    return true;
  }

  const now = new Date().toISOString();
  const brandIdForRows = await resolveBrandIdForIcpOps(userId, opts?.brandId ?? null);
  const generationId = newGenerationId();

  if (brandIdForRows) {
    try {
      await supersedeBrandCurrentIcps(brandIdForRows);
    } catch (supersedeErr) {
      logSupabaseError("[flushGuestICPs] supersede failed", supersedeErr);
    }
  }

  console.log("[flushGuestICPs] start", {
    userId,
    brandId: brandIdForRows,
    guestCount: guestICPs.length,
  });

  let existingKeys: Set<string>;
  try {
    existingKeys = await fetchExistingKeys(userId, brandIdForRows);
  } catch (existingError) {
    logSupabaseError("❌ flushGuestICPsToSupabase existing fetch failed", existingError);
    releaseStorageLock(FLUSH_FLAG);
    return false;
  }

  const builtRows = guestICPs.map((icp) =>
    buildIcpInsertRow(icp, userId, brandIdForRows, now, generationId)
  );

  let rowsToInsert = builtRows
    .filter(({ dedupKey: key }) => !existingKeys.has(key))
    .map(({ row }) => row);

  if (rowsToInsert.length > 0) {
    try {
      existingKeys = await fetchExistingKeys(userId, brandIdForRows);
      rowsToInsert = builtRows
        .filter(({ dedupKey: key }) => !existingKeys.has(key))
        .map(({ row }) => row);
    } catch (existingError) {
      logSupabaseError("❌ flushGuestICPsToSupabase pre-insert fetch failed", existingError);
      releaseStorageLock(FLUSH_FLAG);
      return false;
    }
  }

  if (rowsToInsert.length > 0) {
    console.log("[flushGuestICPs] insert attempt", {
      userId,
      brandId: brandIdForRows,
      count: rowsToInsert.length,
      names: rowsToInsert.map((row) => row.name),
    });

    const { inserted, failed } = await insertIcpRows(rowsToInsert, userId);

    console.log("[flushGuestICPs] insert result", {
      userId,
      attempted: rowsToInsert.length,
      inserted,
      failed,
    });

    if (failed && inserted === 0) {
      releaseStorageLock(FLUSH_FLAG);
      return false;
    }

    if (brandIdForRows) {
      await attachOrphanIcpsToBrand(userId, brandIdForRows);
    }
  } else {
    console.log("[flushGuestICPs] insert skipped — all rows already present", { userId });
  }

  const dbCount = await countUserIcps(userId);
  const guestCount = guestICPs.length;

  if (brandIdForRows) {
    await attachOrphanIcpsToBrand(userId, brandIdForRows);
  }

  if (dbCount < guestCount) {
    console.warn("[flushGuestICPs] incomplete — DB count below guest count", {
      userId,
      dbCount,
      guestCount,
    });
    releaseStorageLock(FLUSH_FLAG);
    return false;
  }

  markStorageLockDone(FLUSH_FLAG);
  clearGuestICPs();

  console.log(`✅ Guest ICPs flushed to Supabase for user ${userId}`, {
    dbCount,
    guestCount,
  });

  try {
    window.dispatchEvent(new Event("icps:changed"));
  } catch {
    // ignore
  }

  return true;
}

/**
 * Flush guest ICPs into Supabase for the logged-in user.
 * Reload-safe: localStorage lock + module lock + DB unique index.
 * Returns true only when guest data is cleared or was already persisted.
 */
export async function flushGuestICPsToSupabase(
  userId: string,
  opts?: { brandId?: string | null }
): Promise<boolean> {
  if (!userId) return true;

  const FLUSH_FLAG = flushFlagKey(userId);
  const flagState = readStorageFlag(FLUSH_FLAG);

  if (flagState === "1") {
    console.debug("[flushGuestICPs] skip — already flushed (persistent flag)", userId);
    return true;
  }

  if (flagState === "in_progress" && getGuestICPs().length) {
    console.warn("[flushGuestICPs] stale in_progress lock — releasing for retry", userId);
    releaseStorageLock(FLUSH_FLAG);
  } else if (flagState === "in_progress") {
    console.debug("[flushGuestICPs] skip — flush in progress (persistent flag)", userId);
    return false;
  }

  if (!getGuestICPs().length) {
    return true;
  }

  if (!claimStorageLock(FLUSH_FLAG)) {
    console.debug("[flushGuestICPs] skip — lost claim race", userId);
    return false;
  }

  try {
    return await runOncePerKey(`flush-guest-icps:${userId}`, () =>
      flushGuestICPsToSupabaseInner(userId, opts)
    );
  } catch (error) {
    logSupabaseError("[flushGuestICPs] unexpected error", error);
    releaseStorageLock(FLUSH_FLAG);
    return false;
  }
}

/**
 * Recover guest ICPs after a failed OAuth handoff: retry while local guest data
 * remains and the user has fewer persisted ICP rows than expected.
 */
export async function retryGuestICPFlushIfNeeded(
  userId: string,
  opts?: { brandId?: string | null }
): Promise<boolean> {
  if (!userId) return false;

  const brandId = await resolveBrandIdForIcpOps(userId, opts?.brandId ?? null);
  if (brandId) {
    const attached = await attachOrphanIcpsToBrand(userId, brandId, {
      onlyWhenSingleBrand: true,
    });
    if (attached > 0) {
      try {
        window.dispatchEvent(new Event("icps:changed"));
      } catch {
        // ignore
      }
      return true;
    }
  }

  const guestICPs = getGuestICPs();
  if (!guestICPs.length) return false;

  const FLUSH_FLAG = flushFlagKey(userId);
  if (readStorageFlag(FLUSH_FLAG) === "1") return false;

  const dbCount = await countUserIcps(userId);
  if (dbCount < 0) return false;

  if (dbCount >= guestICPs.length) {
    if (brandId) {
      await attachOrphanIcpsToBrand(userId, brandId);
    }
    markStorageLockDone(FLUSH_FLAG);
    clearGuestICPs();
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {
      // ignore
    }
    return true;
  }

  console.log("[flushGuestICPs] retry on load", {
    userId,
    guestCount: guestICPs.length,
    dbCount,
    brandId,
  });

  return flushGuestICPsToSupabase(userId, { brandId });
}
