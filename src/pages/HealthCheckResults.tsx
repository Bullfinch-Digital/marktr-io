import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { calculateScores, type HealthCheckInput } from "../lib/healthCheckScoring";
import { mergeHealthFindings } from "../lib/healthCheckFindings";
import { setGuestHealthCheck } from "../lib/guestHealthCheck";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { HealthCheckReportView, extractDomain } from "../components/healthCheck/HealthCheckReportView";
import { serializeScoresForDb } from "../lib/healthCheckReportStorage";

type LocationState = HealthCheckInput | null;

export default function HealthCheckResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as LocationState;
  const { openPaywall } = usePaywall();
  const { user } = useAuth();
  const { isPro: subscriptionIsPro, loading: subscriptionLoading } = useSubscription();
  const { profile } = useProfile(user?.id ?? null);
  const isLoggedInReal = Boolean(
    user && !(user as { is_anonymous?: boolean }).is_anonymous
  );
  const hasPaidAccess =
    subscriptionIsPro || profile?.subscription_tier === "pro";
  const showDashboardCta =
    hasPaidAccess || (isLoggedInReal && subscriptionLoading);
  const showPaywallUpsell = !showDashboardCta;
  const savedToDbRef = useRef(false);

  const scores = useMemo(
    () => (state?.email?.trim() ? calculateScores(state) : null),
    [state]
  );

  useEffect(() => {
    if (!state?.email?.trim() || !scores) return;
    const findings = mergeHealthFindings(scores, state.websiteScore?.findings);
    setGuestHealthCheck({
      input: {
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        email: state.email,
      },
      scores: {
        websiteClarity: scores.websiteClarity.score,
        brandStory: scores.brandStory.score,
        contentConsistency: scores.contentConsistency.score,
        socialPresence: scores.socialPresence.score,
        overall: scores.overall,
        lowestDimension: scores.lowestDimension,
        lowestScore: scores.lowestScore,
      },
      websiteScore: state.websiteScore ?? undefined,
      findings,
      created_at: new Date().toISOString(),
    });
  }, [state, scores]);

  useEffect(() => {
    const isAnonymous = (user as { is_anonymous?: boolean } | null)?.is_anonymous === true;
    if (!user?.id || isAnonymous || !scores || !state || savedToDbRef.current) return;

    savedToDbRef.current = true;

    const domainValue = state.websiteUrl?.trim()
      ? extractDomain(state.websiteUrl.trim())
      : "";

    void supabase
      .from("health_check_results")
      .insert({
        user_id: user.id,
        domain: domainValue,
        instagram_handle: state.instagramHandle || "",
        facebook_url: state.facebookUrl || "",
        overall_score: scores.overall || 0,
        scores: serializeScoresForDb(scores, state.websiteScore),
      })
      .then(({ error }) => {
        if (error) {
          console.warn("[HealthCheckResults] save health check failed", error);
          savedToDbRef.current = false;
        }
      });
  }, [user, scores, state]);

  if (!state || !state.email?.trim() || !scores) {
    return <Navigate to="/health-check" replace />;
  }

  return (
    <HealthCheckReportView
      scores={scores}
      input={{
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        websiteScore: state.websiteScore,
      }}
      showPaywallUpsell={showPaywallUpsell}
      showDashboardCta={showDashboardCta}
      onOpenPaywall={openPaywall}
      onGoToDashboard={() => navigate("/dashboard")}
    />
  );
}
