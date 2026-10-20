import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import {
  getPlanWithDays,
  listPlans,
  PLANS_CHANGED_EVENT,
  type Plan,
  type PlanWithDays,
} from "../lib/plans";
import { isRealUser } from "../utils/isRealUser";

export function useLatestActivePlan() {
  const { user } = useAuth();
  const { activeBrandId } = useBrand();
  const [plan, setPlan] = useState<PlanWithDays | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isRealUser(user) || !user?.id) {
      setPlan(null);
      setLoading(false);
      return;
    }

    const userId = user.id;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const plans = (await listPlans(userId)).filter((row) => row.status === "active");
        if (plans.length === 0) {
          if (!cancelled) setPlan(null);
          return;
        }

        let match: Plan | null = plans[0] ?? null;
        if (activeBrandId) {
          const { data, error } = await supabase
            .from("strategies")
            .select("id")
            .eq("user_id", userId)
            .eq("brand_id", activeBrandId)
            .in(
              "id",
              plans.map((row) => row.strategy_id)
            );
          if (error) throw error;
          const strategyIds = new Set((data ?? []).map((row) => (row as { id: string }).id));
          match = plans.find((row) => strategyIds.has(row.strategy_id)) ?? null;
        }

        if (!match) {
          if (!cancelled) setPlan(null);
          return;
        }

        const detail = await getPlanWithDays(match.id, userId);
        if (!cancelled) setPlan(detail);
      } catch (err) {
        console.error("[useLatestActivePlan] load failed", err);
        if (!cancelled) setPlan(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const onChange = () => void load();
    window.addEventListener(PLANS_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(PLANS_CHANGED_EVENT, onChange);
    };
  }, [user, activeBrandId]);

  return { planId: plan?.id ?? null, plan, loading };
}
