import { supabase } from "../config/supabase";
import { scopeQueryToActiveBrand, readStoredActiveBrandId } from "./brandScopedReads";
import { resolveBrandIdForIcpOps } from "./icpBrandAttach";
import type { DeterministicHealthCheckRun } from "./healthCheck";
import {
  serializeScoresForDb,
  parseStoredScores,
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

/**
 * Resolve brand_id for health writes on routes outside BrandProvider (e.g. /health-check/results).
 * Context → localStorage → primary brand in DB (same chain as StoryBuild).
 */
export async function resolveBrandIdForHealthWrite(
  userId: string,
  contextBrandId: string | null,
  brands: { id: string }[]
): Promise<{ brandId: string | null; source: "context" | "localStorage" | "db" | null }> {
  const fromContext =
    (contextBrandId && brands.some((b) => b.id === contextBrandId) ? contextBrandId : null) ??
    (brands.length === 1 ? brands[0].id : null);

  if (fromContext) {
    return { brandId: fromContext, source: "context" };
  }

  const stored = readStoredActiveBrandId();
  if (stored) {
    return { brandId: stored, source: "localStorage" };
  }

  const fromDb = await resolveBrandIdForIcpOps(userId, null);
  return fromDb ? { brandId: fromDb, source: "db" } : { brandId: null, source: null };
}

export function formatHealthCheckDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isHealthCheckRunRecent(createdAt: string, withinMs = 60 * 60 * 1000): boolean {
  const at = new Date(createdAt).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < withinMs;
}

export function inputSnapshotFromRow(row: HealthCheckRow): HealthCheckInputSnapshot {
  const inputs = row.scores?.inputs as HealthCheckStoredInputs | undefined;
  const domain = row.domain?.trim() || inputs?.domain?.trim() || "";
  return {
    domain,
    instagram_handle: row.instagram_handle?.trim() || inputs?.instagramHandle?.trim() || "",
    facebook_url: row.facebook_url?.trim() || inputs?.facebookUrl?.trim() || "",
    business_name: inputs?.businessName?.trim() || undefined,
    website_url:
      inputs?.websiteUrl?.trim() ||
      (domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : undefined),
  };
}

export function websiteUrlFromSnapshot(snapshot: HealthCheckInputSnapshot): string {
  if (snapshot.website_url?.trim()) return snapshot.website_url.trim();
  if (snapshot.domain?.trim()) {
    const d = snapshot.domain.trim();
    return /^https?:\/\//i.test(d) ? d : `https://${d}`;
  }
  return "";
}

export type HealthCheckDimensionSummary = {
  overall: number;
  website: number;
  brandStory: number;
  content: number;
  social: number;
};

/** Parses overall + four dimension scores from full or slim stored rows. */
export function summarizeHealthCheckRow(row: HealthCheckRow): HealthCheckDimensionSummary | null {
  const parsed = parseStoredScores(row.scores);
  if (!parsed) {
    if (typeof row.overall_score === "number") {
      return {
        overall: row.overall_score,
        website: 0,
        brandStory: 0,
        content: 0,
        social: 0,
      };
    }
    return null;
  }
  return {
    overall: parsed.scores.overall,
    website: parsed.scores.websiteClarity.score,
    brandStory: parsed.scores.brandStory.score,
    content: parsed.scores.contentConsistency.score,
    social: parsed.scores.socialPresence.score,
  };
}
