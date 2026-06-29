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

function extractDomain(url: string): string {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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
    const { count, error: countError } = await supabase
      .from("health_check_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.warn("[transferGuestMarktrData] health check count failed", countError);
      releaseStorageLock(healthFlag);
      return;
    }

    if ((count ?? 0) === 0) {
      console.log("[transferGuestMarktrData] health insert attempt", { userId, brandId });
      const { error } = await supabase.from("health_check_results").insert({
        user_id: userId,
        brand_id: brandId,
        domain: guestHealth.input.websiteUrl
          ? extractDomain(guestHealth.input.websiteUrl)
          : "",
        instagram_handle: guestHealth.input.instagramHandle || "",
        facebook_url: guestHealth.input.facebookUrl || "",
        overall_score: guestHealth.scores.overall || 0,
        scores: {
          websiteClarity: { score: guestHealth.scores.websiteClarity },
          brandStory: { score: guestHealth.scores.brandStory },
          contentConsistency: { score: guestHealth.scores.contentConsistency },
          socialPresence: { score: guestHealth.scores.socialPresence },
          overall: guestHealth.scores.overall,
          lowestDimension: guestHealth.scores.lowestDimension,
          lowestScore: guestHealth.scores.lowestScore,
        },
      });
      if (error) {
        console.warn("[transferGuestMarktrData] health check transfer failed", error);
        releaseStorageLock(healthFlag);
        return;
      }
      console.log("[transferGuestMarktrData] health insert complete", { userId, brandId });
    } else {
      console.log("[transferGuestMarktrData] health insert skipped — row exists", { userId });
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
