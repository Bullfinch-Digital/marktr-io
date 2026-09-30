import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

export type CachedFacts = Record<string, unknown>;

function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function lookupFactCache(
  contentHash: string,
  scorerVersion: string,
): Promise<CachedFacts | null> {
  const supabase = serviceClient();
  if (!supabase) {
    console.log("health_check_fact_cache miss", {
      reason: "missing-service-role",
      scorer_version: scorerVersion,
    });
    return null;
  }
  const { data, error } = await supabase
    .from("health_check_fact_cache")
    .select("facts")
    .eq("content_hash", contentHash)
    .eq("scorer_version", scorerVersion)
    .maybeSingle();
  if (error) {
    console.error("health_check_fact_cache lookup error", {
      message: error.message,
      scorer_version: scorerVersion,
    });
    return null;
  }
  if (data?.facts && typeof data.facts === "object") {
    console.log("health_check_fact_cache hit", {
      content_hash_prefix: contentHash.slice(0, 12),
      scorer_version: scorerVersion,
    });
    return data.facts as CachedFacts;
  }
  console.log("health_check_fact_cache miss", {
    content_hash_prefix: contentHash.slice(0, 12),
    scorer_version: scorerVersion,
  });
  return null;
}

export async function storeFactCache(
  contentHash: string,
  scorerVersion: string,
  facts: CachedFacts,
): Promise<void> {
  const supabase = serviceClient();
  if (!supabase) return;
  const { error } = await supabase.from("health_check_fact_cache").upsert(
    {
      content_hash: contentHash,
      scorer_version: scorerVersion,
      facts,
    },
    { onConflict: "content_hash,scorer_version" },
  );
  if (error) {
    console.error("health_check_fact_cache store error", {
      message: error.message,
      scorer_version: scorerVersion,
    });
  }
}
