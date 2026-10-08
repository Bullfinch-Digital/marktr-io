import { supabase } from "../config/supabase";
import { applyCurrentIcpFilter } from "./icpVersioning";

export type BrandCount = { id: string; name: string; count: number };

function tallyByBrandId(rows: Array<{ brand_id?: string | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const id = row.brand_id;
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

export function otherBrandCounts(
  countsByBrandId: Record<string, number>,
  activeBrandId: string | null,
  brands: Array<{ id: string; name?: string | null }>
): { total: number; brands: BrandCount[] } {
  const brandsOut: BrandCount[] = [];
  let total = 0;
  for (const brand of brands) {
    if (brand.id === activeBrandId) continue;
    const count = countsByBrandId[brand.id] || 0;
    if (count <= 0) continue;
    total += count;
    brandsOut.push({
      id: brand.id,
      name: brand.name?.trim() || "Untitled Brand",
      count,
    });
  }
  return { total, brands: brandsOut };
}

export async function fetchCurrentIcpCountsByBrand(
  userId: string
): Promise<Record<string, number>> {
  let query = supabase.from("icps").select("brand_id").eq("user_id", userId);
  query = applyCurrentIcpFilter(query);
  const { data, error } = await query;
  if (error) {
    console.error("[otherBrandCounts] ICP count failed", error);
    return {};
  }
  return tallyByBrandId((data || []) as Array<{ brand_id?: string | null }>);
}

export async function fetchCurrentStrategyCountsByBrand(
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("strategies")
    .select("brand_id")
    .eq("user_id", userId)
    .is("superseded_at", null)
    .is("deleted_at", null);
  if (error) {
    console.error("[otherBrandCounts] strategy count failed", error);
    return {};
  }
  return tallyByBrandId((data || []) as Array<{ brand_id?: string | null }>);
}

export async function fetchCurrentContentCountsByBrand(
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("content_items")
    .select("brand_id")
    .eq("user_id", userId)
    .is("superseded_at", null)
    .is("deleted_at", null);
  if (error) {
    console.error("[otherBrandCounts] content count failed", error);
    return {};
  }
  return tallyByBrandId((data || []) as Array<{ brand_id?: string | null }>);
}
