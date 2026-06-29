import { supabase } from "../config/supabase";
import { scopeQueryToActiveBrand } from "./brandScopedReads";
import { parseBrandStoryFromStorage, type BrandStoryOutput } from "./brandStory";

export type BrandStoryStoredPayload = {
  answers?: string[];
  email?: string;
  output: BrandStoryOutput;
  brand_id?: string | null;
  created_at?: string;
};

export type BrandStoryRow = {
  id: string;
  user_id: string;
  brand_id: string | null;
  story_data: BrandStoryStoredPayload;
  created_at: string;
};

export function buildStoryStoredPayload(
  output: BrandStoryOutput,
  opts: {
    answers?: string[];
    email?: string;
    brandId: string | null;
  }
): BrandStoryStoredPayload {
  const now = new Date().toISOString();
  return {
    answers: opts.answers,
    email: opts.email,
    output,
    brand_id: opts.brandId,
    created_at: now,
  };
}

export function parseAnswersFromStored(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.answers) || record.answers.length !== 7) return [];
  return record.answers.map((a) => String(a ?? ""));
}

export function parseEmailFromStored(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const email = (raw as Record<string, unknown>).email;
  return typeof email === "string" ? email.trim() : "";
}

export function storyOutputFromRow(row: BrandStoryRow | null): BrandStoryOutput | null {
  if (!row?.story_data) return null;
  return parseBrandStoryFromStorage(row.story_data);
}

function dispatchStoryChanged() {
  try {
    window.dispatchEvent(new Event("marktr:guest-data-ready"));
    window.dispatchEvent(new Event("brands:changed"));
  } catch {
    // ignore
  }
}

/** Append-only insert — never updates existing rows. */
export async function insertBrandStoryResult(
  userId: string,
  brandId: string,
  payload: BrandStoryStoredPayload
): Promise<BrandStoryRow | null> {
  const { data, error } = await supabase
    .from("brand_story_results")
    .insert({
      user_id: userId,
      brand_id: brandId,
      story_data: payload,
    })
    .select("id, user_id, brand_id, story_data, created_at")
    .single();

  if (error) {
    console.error("[brandStory] insert failed", error);
    return null;
  }

  dispatchStoryChanged();
  return data as BrandStoryRow;
}

export async function fetchLatestBrandStory(
  userId: string,
  brandId: string | null
): Promise<BrandStoryRow | null> {
  let query = supabase
    .from("brand_story_results")
    .select("id, user_id, brand_id, story_data, created_at")
    .eq("user_id", userId);
  query = scopeQueryToActiveBrand(query, brandId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[brandStory] fetch latest failed", error);
    return null;
  }
  return (data as BrandStoryRow) ?? null;
}

export async function fetchBrandStoryHistory(
  userId: string,
  brandId: string | null,
  limit = 25
): Promise<BrandStoryRow[]> {
  let query = supabase
    .from("brand_story_results")
    .select("id, user_id, brand_id, story_data, created_at")
    .eq("user_id", userId);
  query = scopeQueryToActiveBrand(query, brandId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[brandStory] fetch history failed", error);
    return [];
  }
  return (data as BrandStoryRow[]) ?? [];
}

export async function countBrandStoriesForBrand(
  userId: string,
  brandId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("brand_story_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("brand_id", brandId);

  if (error) {
    console.warn("[brandStory] count failed", error);
    return 0;
  }
  return count ?? 0;
}
