import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { listPlans, PLANS_CHANGED_EVENT } from "../lib/plans";
import { isRealUser } from "../utils/isRealUser";

export function useLatestActivePlan() {
  const { user } = useAuth();
  const { activeBrandId } = useBrand();
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!isRealUser(user) || !user?.id) {
      setPlanId(null);
      return;
    }

    const userId = user.id;
    let cancelled = false;
    const load = async () => {
      try {
        const plans = (await listPlans(userId)).filter((plan) => plan.status === "active");
        if (plans.length === 0) {
          if (!cancelled) setPlanId(null);
          return;
        }

        if (!activeBrandId) {
          if (!cancelled) setPlanId(plans[0].id);
          return;
        }

        const { data, error } = await supabase
          .from("strategies")
          .select("id")
          .eq("user_id", userId)
          .eq("brand_id", activeBrandId)
          .in(
            "id",
            plans.map((plan) => plan.strategy_id)
          );
        if (error) throw error;
        const strategyIds = new Set((data ?? []).map((row) => (row as { id: string }).id));
        const match = plans.find((plan) => strategyIds.has(plan.strategy_id));
        if (!cancelled) setPlanId(match?.id ?? null);
      } catch (err) {
        console.error("[useLatestActivePlan] load failed", err);
        if (!cancelled) setPlanId(null);
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

  return planId;
}
