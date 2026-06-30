import { supabase } from "../config/supabase";
import { scopeQueryToActiveBrand } from "./brandScopedReads";
import type { DeterministicHealthCheckRun } from "./healthCheck";
import {
  serializeScoresForDb,
  type StoredHealthCheckScores,
} from "./healthCheckReportStorage";
import type { HealthCheckInput, HealthCheckScores } from "./healthCheckScoring";

/** Input snapshot stored on every row for Stage 3 re-run (self-describing row). */
export type HealthCheckInputSnapshot = {
  domain: string;
  instagram_handle: string;
  facebook_url: string;
  business_name?: string;
  website_url?: string;
};

export type HealthCheckStoredInputs = DeterministicHealthCheckRun["inputs"] & {
  businessName?: string;
};

export type HealthCheckRow = {
  id: string;
  user_id: string;
  brand_id: string | null;
  domain: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  overall_score: number | null;
  scores: StoredHealthCheckScores;
  created_at: string;
};

export type HealthCheckInsertPayload = {
  scores: HealthCheckScores;
  websiteScore?: HealthCheckInput["websiteScore"] | null;
  inputSnapshot: HealthCheckInputSnapshot;
};

function extractDomain(url: string): string {
  try {
    const prefixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

export function buildHealthCheckInputSnapshot(opts: {
  websiteUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  businessName?: string;
}): HealthCheckInputSnapshot {
  const websiteUrl = opts.websiteUrl?.trim() ?? "";
  return {
    domain: websiteUrl ? extractDomain(websiteUrl) : "",
    instagram_handle: opts.instagramHandle?.trim() ?? "",
    facebook_url: opts.facebookUrl?.trim() ?? "",
    business_name: opts.businessName?.trim() || undefined,
    website_url: websiteUrl || undefined,
  };
}

export function buildHealthCheckStoredScores(
  scores: HealthCheckScores,
  websiteScore: HealthCheckInput["websiteScore"] | null | undefined,
  inputSnapshot: HealthCheckInputSnapshot
): StoredHealthCheckScores {
  const base = serializeScoresForDb(scores, websiteScore);
  const fromDeterministic = base.deterministic?.inputs;

  const inputs: HealthCheckStoredInputs = {
    websiteUrl:
      inputSnapshot.website_url ??
      fromDeterministic?.websiteUrl ??
      (inputSnapshot.domain ? `https://${inputSnapshot.domain}` : ""),
    instagramHandle:
      inputSnapshot.instagram_handle ?? fromDeterministic?.instagramHandle ?? "",
    facebookUrl:
      inputSnapshot.facebook_url ?? fromDeterministic?.facebookUrl ?? "",
    domain: inputSnapshot.domain || fromDeterministic?.domain || "",
    businessName: inputSnapshot.business_name,
  };

  return {
    ...base,
    inputs,
  };
}

function dispatchHealthChanged() {
  try {
    window.dispatchEvent(new Event("marktr:guest-data-ready"));
    window.dispatchEvent(new Event("brands:changed"));
  } catch {
    // ignore
  }
}

/** Append-only insert — never updates existing rows. */
export async function insertHealthCheckResult(
  userId: string,
  brandId: string,
  payload: HealthCheckInsertPayload
): Promise<HealthCheckRow | null> {
  const { scores, websiteScore, inputSnapshot } = payload;
  const scoresJson = buildHealthCheckStoredScores(
    scores,
    websiteScore,
    inputSnapshot
  );

  const { data, error } = await supabase
    .from("health_check_results")
    .insert({
      user_id: userId,
      brand_id: brandId,
      domain: inputSnapshot.domain,
      instagram_handle: inputSnapshot.instagram_handle,
      facebook_url: inputSnapshot.facebook_url,
      overall_score: scores.overall || 0,
      scores: scoresJson,
    })
    .select(
      "id, user_id, brand_id, domain, instagram_handle, facebook_url, overall_score, scores, created_at"
    )
    .single();

  if (error) {
    console.error("[healthCheck] insert failed", error);
    return null;
  }

  dispatchHealthChanged();
  return data as HealthCheckRow;
}

export async function fetchLatestHealthCheck(
  userId: string,
  brandId: string | null
): Promise<HealthCheckRow | null> {
  let query = supabase
    .from("health_check_results")
    .select(
      "id, user_id, brand_id, domain, instagram_handle, facebook_url, overall_score, scores, created_at"
    )
    .eq("user_id", userId);
  query = scopeQueryToActiveBrand(query, brandId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[healthCheck] fetch latest failed", error);
    return null;
  }
  return (data as HealthCheckRow) ?? null;
}

export async function fetchHealthCheckHistory(
  userId: string,
  brandId: string | null,
  limit = 25
): Promise<HealthCheckRow[]> {
  let query = supabase
    .from("health_check_results")
    .select(
      "id, user_id, brand_id, domain, instagram_handle, facebook_url, overall_score, scores, created_at"
    )
    .eq("user_id", userId);
  query = scopeQueryToActiveBrand(query, brandId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[healthCheck] fetch history failed", error);
    return [];
  }
  return (data as HealthCheckRow[]) ?? [];
}

export async function countHealthChecksForBrand(
  userId: string,
  brandId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("health_check_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("brand_id", brandId);

  if (error) {
    console.warn("[healthCheck] count failed", error);
    return 0;
  }
  return count ?? 0;
}
