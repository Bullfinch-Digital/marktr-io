import { supabase } from "../config/supabase";
import { runOncePerKey } from "./asyncUserLock";
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

async function transferGuestMarktrDataInner(userId: string) {
  const contextEmail = getGuestIdentityEmail();

  const guestHealth = getGuestHealthCheck();
  if (guestHealth) {
    const healthFlag = transferFlagKey(userId, "health");
    let alreadyTransferred = false;
    try {
      alreadyTransferred = localStorage.getItem(healthFlag) === "1";
    } catch {
      // ignore
    }

    if (!alreadyTransferred) {
      try {
        localStorage.setItem(healthFlag, "in_progress");
      } catch {
        // ignore
      }

      const { count, error: countError } = await supabase
        .from("health_check_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        console.warn("[transferGuestMarktrData] health check count failed", countError);
        try {
          localStorage.removeItem(healthFlag);
        } catch {
          // ignore
        }
      } else if ((count ?? 0) === 0) {
        const { error } = await supabase.from("health_check_results").insert({
          user_id: userId,
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
          try {
            localStorage.removeItem(healthFlag);
          } catch {
            // ignore
          }
        } else {
          try {
            localStorage.setItem(healthFlag, "1");
          } catch {
            // ignore
          }
          clearGuestHealthCheck();
        }
      } else {
        try {
          localStorage.setItem(healthFlag, "1");
        } catch {
          // ignore
        }
        clearGuestHealthCheck();
      }
    } else {
      clearGuestHealthCheck();
    }
  }

  const guestStory = getGuestStory();
  if (guestStory) {
    const storyFlag = transferFlagKey(userId, "story");
    let alreadyTransferred = false;
    try {
      alreadyTransferred = localStorage.getItem(storyFlag) === "1";
    } catch {
      // ignore
    }

    if (!alreadyTransferred) {
      try {
        localStorage.setItem(storyFlag, "in_progress");
      } catch {
        // ignore
      }

      const { count, error: countError } = await supabase
        .from("brand_story_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        console.warn("[transferGuestMarktrData] brand story count failed", countError);
        try {
          localStorage.removeItem(storyFlag);
        } catch {
          // ignore
        }
      } else if ((count ?? 0) === 0) {
        const storyEmail = guestStory.email?.trim() || contextEmail || "";
        const { error } = await supabase.from("brand_story_results").insert({
          user_id: userId,
          story_data: {
            ...guestStory,
            email: storyEmail,
          },
        });
        if (error) {
          console.warn("[transferGuestMarktrData] brand story transfer failed", error);
          try {
            localStorage.removeItem(storyFlag);
          } catch {
            // ignore
          }
        } else {
          try {
            localStorage.setItem(storyFlag, "1");
          } catch {
            // ignore
          }
          clearGuestStory();
        }
      } else {
        try {
          localStorage.setItem(storyFlag, "1");
        } catch {
          // ignore
        }
        clearGuestStory();
      }
    } else {
      clearGuestStory();
    }
  }

  if (contextEmail) {
    const ctx = getGuestContext();
    if (!ctx.identity.email?.trim()) {
      updateGuestContext({ identity: { email: contextEmail } });
    }
  }
}

/**
 * Persist guest health-check + brand-story localStorage payloads to Supabase.
 * Idempotent: module lock, transfer flags, and skip when user already has rows.
 */
export async function transferGuestMarktrData(userId: string) {
  if (!userId) return;
  return runOncePerKey(`transfer-guest-marktr:${userId}`, () =>
    transferGuestMarktrDataInner(userId)
  );
}
