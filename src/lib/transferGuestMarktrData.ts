import { supabase } from "../config/supabase";
import { runOncePerKey } from "./asyncUserLock";
import {
  claimStorageLock,
  markStorageLockDone,
  readStorageFlag,
  releaseStorageLock,
} from "./persistentUserLock";
import {
  getGuestHealthCheck,
  clearGuestHealthCheck,
} from "./guestHealthCheck";
import {
  getGuestContext,
  getGuestIdentityEmail,
  updateGuestContext,
} from "./guestContext";
import { getGuestStory, clearGuestStory } from "./guestStory";
import { calculateScores } from "./healthCheckScoring";
import {
  buildHealthCheckInputSnapshot,
  countHealthChecksForBrand,
  insertHealthCheckResult,
} from "./healthCheckPersistence";

function transferFlagKey(userId: string, kind: "health" | "story") {
  return `marktr_guest_${kind}_transferred_${userId}`;
}

async function transferHealthOnce(userId: string, brandId: string | null) {
  const guestHealth = getGuestHealthCheck();
  if (!guestHealth) return;

  const healthFlag = transferFlagKey(userId, "health");
  const flagState = readStorageFlag(healthFlag);

  if (flagState === "1") {
    clearGuestHealthCheck();
    return;
  }

  if (flagState === "in_progress") {
    console.debug("[transferGuestMarktrData] skip health — in progress", userId);
    return;
  }

  if (!claimStorageLock(healthFlag)) {
    console.debug("[transferGuestMarktrData] skip health — lost claim race", userId);
    return;
  }

  try {
    if (!brandId) {
      console.warn("[transferGuestMarktrData] skip health — brand_id unresolved", userId);
      releaseStorageLock(healthFlag);
      return;
    }

    const existingCount = await countHealthChecksForBrand(userId, brandId);

    if (existingCount === 0) {
      console.log("[transferGuestMarktrData] health insert attempt", { userId, brandId });
      const fullScores = calculateScores({
        websiteUrl: guestHealth.input.websiteUrl,
        instagramHandle: guestHealth.input.instagramHandle,
        facebookUrl: guestHealth.input.facebookUrl,
        email: guestHealth.input.email,
        websiteScore: guestHealth.websiteScore ?? null,
      });
      const guestBusinessName = getGuestContext().business.businessName;
      const inputSnapshot = buildHealthCheckInputSnapshot({
        websiteUrl: guestHealth.input.websiteUrl,
        instagramHandle: guestHealth.input.instagramHandle,
        facebookUrl: guestHealth.input.facebookUrl,
        businessName: guestBusinessName,
      });
      const inserted = await insertHealthCheckResult(userId, brandId, {
        scores: fullScores,
        websiteScore: guestHealth.websiteScore,
        inputSnapshot,
      });
      if (!inserted) {
        console.warn("[transferGuestMarktrData] health check transfer failed");
        releaseStorageLock(healthFlag);
        return;
      }
      console.log("[transferGuestMarktrData] health insert complete", { userId, brandId });
    } else {
      console.log("[transferGuestMarktrData] health insert skipped — row exists for brand", {
        userId,
        brandId,
      });
    }

    markStorageLockDone(healthFlag);
    clearGuestHealthCheck();
  } catch (error) {
    releaseStorageLock(healthFlag);
    throw error;
  }
}

async function transferStoryOnce(
  userId: string,
  contextEmail: string,
  brandId: string | null
) {
  const guestStory = getGuestStory();
  if (!guestStory) return;

  const storyFlag = transferFlagKey(userId, "story");
  const flagState = readStorageFlag(storyFlag);

  if (flagState === "1") {
    clearGuestStory();
    return;
  }

  if (flagState === "in_progress") {
    console.debug("[transferGuestMarktrData] skip story — in progress", userId);
    return;
  }

  if (!claimStorageLock(storyFlag)) {
    console.debug("[transferGuestMarktrData] skip story — lost claim race", userId);
    return;
  }

  try {
    let countQuery = supabase
      .from("brand_story_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (brandId) {
      countQuery = countQuery.eq("brand_id", brandId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.warn("[transferGuestMarktrData] brand story count failed", countError);
      releaseStorageLock(storyFlag);
      return;
    }

    if ((count ?? 0) === 0) {
      console.log("[transferGuestMarktrData] story insert attempt", { userId, brandId });
      const storyEmail = guestStory.email?.trim() || contextEmail || "";
      const { error } = await supabase.from("brand_story_results").insert({
        user_id: userId,
        brand_id: brandId,
        story_data: {
          ...guestStory,
          email: storyEmail,
          brand_id: brandId,
        },
      });
      if (error) {
        console.warn("[transferGuestMarktrData] brand story transfer failed", error);
        releaseStorageLock(storyFlag);
        return;
      }
      console.log("[transferGuestMarktrData] story insert complete", { userId, brandId });
    } else {
      console.log("[transferGuestMarktrData] story insert skipped — row exists", { userId });
    }

    markStorageLockDone(storyFlag);
    clearGuestStory();
  } catch (error) {
    releaseStorageLock(storyFlag);
    throw error;
  }
}

async function transferGuestMarktrDataInner(userId: string, brandId: string | null) {
  const contextEmail = getGuestIdentityEmail() || "";

  await transferHealthOnce(userId, brandId);
  await transferStoryOnce(userId, contextEmail, brandId);

  if (contextEmail) {
    const ctx = getGuestContext();
    if (!ctx.identity.email?.trim()) {
      updateGuestContext({ identity: { email: contextEmail } });
    }
  }
}

/**
 * Persist guest health-check + brand-story localStorage payloads to Supabase.
 * Reload-safe: module lock + persistent transfer flags + existing-row checks.
 */
export async function transferGuestMarktrData(
  userId: string,
  opts?: { brandId?: string | null }
) {
  if (!userId) return;
  return runOncePerKey(`transfer-guest-marktr:${userId}`, () =>
    transferGuestMarktrDataInner(userId, opts?.brandId ?? null)
  );
}
