import { markLeadConverted } from "./leadCapture";
import { flushGuestICPsToSupabase, getGuestICPs } from "./guestICP";
import { transferGuestMarktrData } from "./transferGuestMarktrData";
import { ensureBrandForPostAuth } from "./ensureGuestBrand";
import { runOncePerKey } from "./asyncUserLock";
import {
  claimStorageLock,
  markStorageLockDone,
  readStorageFlag,
  releaseStorageLock,
} from "./persistentUserLock";

export const POST_AUTH_PIPELINE_TIMEOUT_MS = 45_000;

const postAuthCompletedUserIds = new Set<string>();

function postAuthFlagKey(userId: string) {
  return `marktr_post_auth_pipeline_${userId}`;
}

function dispatchGuestDataReady() {
  try {
    window.dispatchEvent(new Event("brands:changed"));
    window.dispatchEvent(new Event("icps:changed"));
    window.dispatchEvent(new Event("marktr:guest-data-ready"));
    window.dispatchEvent(new Event("auth:changed"));
  } catch {
    // ignore
  }
}

async function executePostAuthPipelineInner(
  userId: string,
  email?: string | null
): Promise<void> {
  console.log("[postAuth] pipeline start", { userId, email });

  if (email) {
    try {
      await markLeadConverted(email, userId);
    } catch (err) {
      console.warn("[postAuth] markLeadConverted error", err);
    }
  }

  console.log("[postAuth] step — ensure brand");
  const brandId = await ensureBrandForPostAuth(userId);
  console.log("[postAuth] step — brand ready", { brandId });

  console.log("[postAuth] step — transfer health/story");
  await transferGuestMarktrData(userId, { brandId });

  console.log("[postAuth] step — flush ICPs", { brandId });
  const icpFlushOk = await flushGuestICPsToSupabase(userId, { brandId });

  if (!icpFlushOk && getGuestICPs().length > 0) {
    console.error("[postAuth] ICP flush incomplete — pipeline will not mark done", {
      userId,
      brandId,
      remainingGuestIcps: getGuestICPs().length,
    });
    throw new Error("Guest ICP flush incomplete");
  }

  dispatchGuestDataReady();
  console.log("[postAuth] pipeline complete", { userId, brandId });
}

/**
 * Awaitable post-auth pipeline: brand → health → story → ICPs.
 * Safe across OAuth reloads via persistent localStorage lock + in-flight dedupe.
 */
export async function runPostAuthPipeline(
  userId: string,
  email?: string | null
): Promise<void> {
  if (!userId) return;

  const flagKey = postAuthFlagKey(userId);
  const flagState = readStorageFlag(flagKey);

  if (flagState === "1" || postAuthCompletedUserIds.has(userId)) {
    console.log("[postAuth] skipped — already completed", userId);
    dispatchGuestDataReady();
    return;
  }

  return runOncePerKey(`post-auth-pipeline:${userId}`, async () => {
    if (postAuthCompletedUserIds.has(userId) || readStorageFlag(flagKey) === "1") {
      dispatchGuestDataReady();
      return;
    }

    if (!claimStorageLock(flagKey)) {
      console.log("[postAuth] skipped — lost claim race", userId);
      return;
    }

    try {
      await executePostAuthPipelineInner(userId, email);
      markStorageLockDone(flagKey);
      postAuthCompletedUserIds.add(userId);
    } catch (error) {
      releaseStorageLock(flagKey);
      throw error;
    }
  });
}

export async function runPostAuthPipelineWithTimeout(
  userId: string,
  email?: string | null,
  timeoutMs = POST_AUTH_PIPELINE_TIMEOUT_MS
): Promise<"complete" | "timeout"> {
  let timedOut = false;
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    window.setTimeout(() => {
      timedOut = true;
      resolve("timeout");
    }, timeoutMs);
  });

  const pipelinePromise = runPostAuthPipeline(userId, email).then(() => "complete" as const);

  const result = await Promise.race([pipelinePromise, timeoutPromise]);
  if (result === "timeout") {
    console.warn("[postAuth] pipeline timed out", { userId, timeoutMs, timedOut });
  }
  return result;
}
