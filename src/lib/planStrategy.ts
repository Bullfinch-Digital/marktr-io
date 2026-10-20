import { supabase } from "../config/supabase";
import { buildCompositionLookup } from "./strategyComposition";

export type PlanStrategyContext = {
  id: string;
  lineageId: string;
  brandId: string;
  title: string;
  aims: Array<{ lineageId: string; title: string }>;
  icps: Array<{ lineageId: string; name: string; description: string }>;
};

export async function getPlanStrategyContext(
  strategyId: string,
  userId: string
): Promise<PlanStrategyContext | null> {
  const { data: row, error } = await supabase
    .from("strategies")
    .select("id, brand_id, title, lineage_id")
    .eq("id", strategyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[planStrategy] lookup failed", error);
    throw error;
  }
  if (!row) return null;

  const lineageId = (row as { lineage_id: string }).lineage_id;
  const { data: current, error: currentError } = await supabase
    .from("strategies")
    .select("id, brand_id, title, lineage_id")
    .eq("user_id", userId)
    .eq("lineage_id", lineageId)
    .is("superseded_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (currentError) {
    console.error("[planStrategy] current lookup failed", currentError);
    throw currentError;
  }

  const strategy = (current ?? row) as {
    id: string;
    brand_id: string;
    title: string;
    lineage_id: string;
  };

  const [aimLink, icpLink] = await Promise.all([
    supabase
      .from("strategy_aims")
      .select("aim_lineage_id, aim_title_snapshot")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategy.lineage_id),
    supabase
      .from("strategy_targets")
      .select("icp_lineage_id, icp_name_snapshot")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategy.lineage_id),
  ]);

  if (aimLink.error) throw aimLink.error;
  if (icpLink.error) throw icpLink.error;

  const aimJoins = (aimLink.data ?? []).map((link) => ({
    aim_lineage_id: link.aim_lineage_id,
    aim_title_snapshot: link.aim_title_snapshot,
  }));
  const icpJoins = (icpLink.data ?? []).map((link) => ({
    icp_lineage_id: link.icp_lineage_id,
    icp_name_snapshot: link.icp_name_snapshot,
  }));

  const lookup = await buildCompositionLookup(userId, aimJoins, icpJoins);
  const aims = aimJoins
    .map((join) => lookup.resolveAim(join))
    .filter((aim) => aim.linkState === "live")
    .map((aim) => ({ lineageId: aim.lineage_id, title: aim.title }));
  const liveIcps = icpJoins
    .map((join) => lookup.resolveIcp(join))
    .filter((icp) => icp.linkState === "live");

  const descriptions = new Map<string, string>();
  if (liveIcps.length > 0) {
    const { data: icpRows, error: icpError } = await supabase
      .from("icps")
      .select("lineage_id, description")
      .eq("user_id", userId)
      .in(
        "lineage_id",
        liveIcps.map((icp) => icp.lineage_id)
      )
      .is("superseded_at", null)
      .is("deleted_at", null);
    if (icpError) throw icpError;
    for (const row of icpRows ?? []) {
      const lineage = (row as { lineage_id?: string }).lineage_id;
      const description = (row as { description?: string | null }).description?.trim() || "";
      if (lineage && description) descriptions.set(lineage, description);
    }
  }

  const icps = liveIcps.map((icp) => ({
    lineageId: icp.lineage_id,
    name: icp.name,
    description: descriptions.get(icp.lineage_id) || "",
  }));

  return {
    id: strategy.id,
    lineageId: strategy.lineage_id,
    brandId: strategy.brand_id,
    title: strategy.title,
    aims,
    icps,
  };
}
