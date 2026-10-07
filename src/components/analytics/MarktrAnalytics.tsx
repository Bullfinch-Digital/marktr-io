import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isRealUser } from "../../utils/isRealUser";
import useSubscription from "../../hooks/useSubscription";
import { supabase } from "../../config/supabase";
import {
  installMarktrAnalyticsListeners,
  maybeClientTrialStart,
  maybeDashboardFirstView,
  maybeOnboardingComplete,
  maybeTrackAuth,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
} from "../../lib/analytics";
import { hasAnalyticsConsent } from "../../lib/cookieConsent";

function planLabel(isPro: boolean, trialActive: boolean): "free" | "trial" | "paid" {
  if (trialActive) return "trial";
  if (isPro) return "paid";
  return "free";
}

export function MarktrAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const { isPro, trialActive, ready } = useSubscription();

  useEffect(() => installMarktrAnalyticsListeners(), []);

  useEffect(() => {
    if (!user || !isRealUser(user) || !hasAnalyticsConsent()) return;
    maybeTrackAuth({
      id: user.id,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata as { provider?: string; providers?: string[] },
      identities: user.identities as Array<{ provider?: string }>,
    });
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
      maybeClientTrialStart("annual");
    }
  }, [location.pathname, location.search, user]);

  return null;
}
