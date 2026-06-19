import { supabase } from "../config/supabase";
import {
  getGuestHealthCheck,
  clearGuestHealthCheck,
} from "./guestHealthCheck";
import { getGuestStory, clearGuestStory } from "./guestStory";

function extractDomain(url: string): string {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Persist guest health-check + brand-story localStorage payloads to Supabase.
 * Idempotent: no-ops when localStorage has already been cleared.
 */
export async function transferGuestMarktrData(userId: string) {
  if (!userId) return;

  const guestHealth = getGuestHealthCheck();
  if (guestHealth) {
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
    } else {
      clearGuestHealthCheck();
    }
  }

  const guestStory = getGuestStory();
  if (guestStory) {
    const { error } = await supabase.from("brand_story_results").insert({
      user_id: userId,
      story_data: guestStory,
    });
    if (error) {
      console.warn("[transferGuestMarktrData] brand story transfer failed", error);
    } else {
      clearGuestStory();
    }
  }
}
