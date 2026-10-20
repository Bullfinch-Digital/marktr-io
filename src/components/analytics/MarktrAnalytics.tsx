import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isRealUser } from "../../utils/isRealUser";
import useSubscription from "../../hooks/useSubscription";
import { supabase } from "../../config/supabase";
import {
  installMarktrAnalyticsListeners,
  maybeTrialCheckoutReturn,
  maybeDashboardFirstView,
  maybeOnboardingComplete,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
} from "../../lib/analytics";
import { hasAnalyticsConsent } from "../../lib/cookieConsent";
import { markCheckoutSucceeded } from "../../lib/paywallAbandon";

function planLabel(isPro: boolean, trialActive: boolean): "free" | "trial" | "paid" {
  if (trialActive) return "trial";
  if (isPro) return "paid";
  return "free";
}

export function MarktrAnalytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, trialActive, ready } = useSubscription();

  useEffect(() => installMarktrAnalyticsListeners(), []);

  useEffect(() => {
    if (!user || !isRealUser(user) || !hasAnalyticsConsent()) return;
    setAnalyticsUserId(user.id);
  }, [user]);

  useEffect(() => {
    if (!user || !isRealUser(user) || !hasAnalyticsConsent() || !ready) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ count: brandCount }, { count: icpCount }] = await Promise.all([
          supabase.from("brands").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("icps").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        if (cancelled) return;
        setAnalyticsUserProperties({
          plan: planLabel(isPro, trialActive),
          has_brand: (brandCount ?? 0) > 0,
          has_icp: (icpCount ?? 0) > 0,
        });
      } catch {
        if (!cancelled) {
          setAnalyticsUserProperties({
            plan: planLabel(isPro, trialActive),
            has_brand: false,
            has_icp: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPro, trialActive, ready]);

  useEffect(() => {
    if (!user || !isRealUser(user)) return;
    if (location.pathname === "/dashboard") {
      maybeDashboardFirstView({ id: user.id, created_at: user.created_at });
      maybeOnboardingComplete(user.id);
    }
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      const queryPlan = params.get("plan");
      let plan: "annual" | "monthly" = queryPlan === "monthly" ? "monthly" : "annual";
      if (queryPlan !== "monthly" && queryPlan !== "annual") {
        try {
          if (sessionStorage.getItem("marktr_checkout_plan") === "monthly") plan = "monthly";
        } catch {
          // ignore
        }
      }
      markCheckoutSucceeded(user.id);
      if (!maybeTrialCheckoutReturn(plan)) return;
      params.delete("checkout");
      params.delete("plan");
      const search = params.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
        { replace: true },
      );
    }
  }, [location.hash, location.pathname, location.search, navigate, user]);

  return null;
}
