import { supabase } from "../config/supabase";
import { clearGuestBrandSeed, getGuestBrandSeed } from "./guestBrandSeed";
import {
  getGuestContext,
  suggestBusinessNameFromUrl,
} from "./guestContext";
import { getGuestStory } from "./guestStory";

function stripBusinessTypeSuffix(description: string): string {
  return description.replace(/Business type:\s*(B2B|B2C|Both)\s*$/i, "").trim();
}

/**
 * Resolve or create the user's first brand from guest onboarding data.
 * Idempotent: returns existing brand id when present.
 */
export async function ensureBrandForPostAuth(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data: existing, error: existingErr } = await supabase
      .from("brands")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (existingErr) {
      console.warn("[ensureGuestBrand] brand lookup error", existingErr);
    } else if (existing?.length) {
      return existing[0]!.id;
    }
  } catch (err) {
    console.warn("[ensureGuestBrand] brand lookup unexpected", err);
  }

  const ctx = getGuestContext();
  const seed = getGuestBrandSeed();
  const story = getGuestStory();

  const name =
    ctx.business.businessName?.trim() ||
    seed?.brandName?.trim() ||
    suggestBusinessNameFromUrl(ctx.business.websiteUrl || "") ||
    "";

  if (!name) return null;

  const businessDescription =
    stripBusinessTypeSuffix(seed?.businessDescription?.trim() || "") ||
    ctx.business.whatYouDo?.trim() ||
    null;

  const foundingStory =
    story?.output?.foundingStory?.trim() ||
    ctx.business.whyStarted?.trim() ||
    null;

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    name,
    color: seed?.color ?? null,
    website: ctx.business.websiteUrl?.trim() || null,
    business_description: businessDescription,
    product_or_service: seed?.productOrService?.trim() || null,
    business_type: seed?.businessType ?? null,
    assumed_audience: seed?.assumedAudience ?? [],
    marketing_channels: seed?.marketingChannels ?? [],
    country: seed?.country?.trim() || null,
    region_or_city: seed?.regionOrCity?.trim() || null,
    currency: seed?.currency?.trim() || null,
    founding_story: foundingStory,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("brands")
      .insert([row])
      .select("id")
      .single();

    if (error) {
      const isConflict =
        error.code === "23505" ||
        error.message?.toLowerCase?.().includes?.("duplicate");

      if (isConflict) {
        const { data: first, error: firstErr } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (!firstErr && first?.length) {
          clearGuestBrandSeed();
          return first[0]!.id;
        }
      }

      console.warn("[ensureGuestBrand] brand insert error", error);
      return null;
    }

    clearGuestBrandSeed();
    try {
      window.dispatchEvent(new Event("brands:changed"));
    } catch {
      // ignore
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn("[ensureGuestBrand] brand insert unexpected", err);
    return null;
  }
}
