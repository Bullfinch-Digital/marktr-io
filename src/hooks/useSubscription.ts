import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../contexts/AuthContext";
import { isProSubscriptionStatus } from "../lib/proAccess";

function parseSupabaseTimestamptz(input: string | null | undefined): number | null {
  if (!input) return null;

  let s = String(input).trim();

  // Supabase can return microseconds (6 digits). JS Date parsing is not consistent across browsers.
  // Trim fractional seconds to milliseconds (3 digits).
  // Example: .325607 -> .325
  s = s.replace(/(\.\d{3})\d+/, "$1");

  // Optional: if it's exactly UTC offset, Safari is happier with Z sometimes
  s = s.replace(/\+00:00$/, "Z");

  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export type Tier = "free" | "pro" | "team";

export default function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [trialActive, setTrialActive] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!activeRef.current) return;
    setIsLoading(true);
    if (!user?.id) {
      setTier("free");
      setTrialEndsAt(null);
      setTrialActive(false);
      setTrialExpired(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stripe_subscriptions")
        .select("status, trial_end, current_period_end")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("useSubscription: fetch error", error);
        if (!activeRef.current) return;
        setTier("free");
        setTrialEndsAt(null);
        setTrialActive(false);
        setTrialExpired(false);
        setIsLoading(false);
        return;
      }

      const status = (data as any)?.status ?? null;
      const endsRaw = (data as any)?.trial_end ?? null;
      const ends = parseSupabaseTimestamptz(endsRaw);
      const now = Date.now();
      const isTrialing = status === "trialing";
      // Same Pro rule as public.user_has_pro_access / src/lib/proAccess.ts
      const isPro = isProSubscriptionStatus(status);
      const isExpired = !isPro && ends !== null && ends <= now;

      if (!activeRef.current) return;
      setTier(isPro ? "pro" : "free");
      setTrialEndsAt(endsRaw);
      setTrialActive(isTrialing);
      setTrialExpired(isExpired);
      setIsLoading(false);
    } catch (err) {
      console.warn("useSubscription: unexpected error", err);
      if (!activeRef.current) return;
      setTier("free");
      setTrialEndsAt(null);
      setTrialActive(false);
      setTrialExpired(false);
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => {
      void fetchProfile();
    };
    window.addEventListener("auth:changed", handler);
    window.addEventListener("subscription:changed", handler);
    return () => {
      window.removeEventListener("auth:changed", handler);
      window.removeEventListener("subscription:changed", handler);
    };
  }, [fetchProfile]);

  const bypassPaywall =
    import.meta.env.MODE === "development" &&
    import.meta.env.VITE_BYPASS_PAYWALL === "true";

  // Convenience helpers used throughout the app for gating.
  const isPro = bypassPaywall || tier === "pro";
  const effectiveTier: Tier = isPro ? "pro" : "free";
  const hasFullAccess = isPro;
  const resolvedTrialActive = bypassPaywall ? true : trialActive;
  const resolvedTrialExpired = bypassPaywall ? false : trialExpired;

  return {
    tier,
    effectiveTier,
    hasFullAccess,
    isPro,
    trialActive: resolvedTrialActive,
    trialExpired: resolvedTrialExpired,
    trialEndsAt,
    isLoading,
    loading: isLoading,
    ready: !isLoading,
  };
}
