import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { calculateScores, type HealthCheckInput } from "../lib/healthCheckScoring";
import { mergeHealthFindings } from "../lib/healthCheckFindings";
import { setGuestHealthCheck } from "../lib/guestHealthCheck";
import { getGuestIdentityEmail } from "../lib/guestContext";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import {
  buildHealthCheckInputSnapshot,
  insertHealthCheckResult,
} from "../lib/healthCheckPersistence";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";

type LocationState = HealthCheckInput | null;

export default function HealthCheckResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as LocationState;
  const { user } = useAuth();
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
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
  const saveInFlightRef = useRef(false);

  const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);

  const effectiveEmail = state?.email?.trim() || getGuestIdentityEmail() || "";

  const scores = useMemo(
    () =>
      effectiveEmail && state
        ? calculateScores({ ...state, email: effectiveEmail })
        : null,
    [state, effectiveEmail]
  );

  useEffect(() => {
    if (!state || !scores) return;
    const email = state.email?.trim() || getGuestIdentityEmail() || "";
    if (!email) return;
    const findings = mergeHealthFindings(scores, state.websiteScore?.findings);
    setGuestHealthCheck({
      input: {
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        email,
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
    if (!user?.id || isAnonymous || !scores || !state) return;
    if (!isBrandScopeReady(brandLoading, brands, scopedBrandId)) return;
    if (!scopedBrandId) {
      console.error("[HealthCheckResults] cannot save — brand_id unresolved", {
        userId: user.id,
        activeBrandId,
        brandCount: brands.length,
      });
      return;
    }
    if (savedToDbRef.current || saveInFlightRef.current) return;

    savedToDbRef.current = true;
    saveInFlightRef.current = true;

    const inputSnapshot = buildHealthCheckInputSnapshot({
      websiteUrl: state.websiteUrl,
      instagramHandle: state.instagramHandle,
      facebookUrl: state.facebookUrl,
      businessName: state.businessName,
    });

    void insertHealthCheckResult(user.id, scopedBrandId, {
      scores,
      websiteScore: state.websiteScore,
      inputSnapshot,
    }).then((row) => {
      saveInFlightRef.current = false;
      if (!row) {
        console.warn("[HealthCheckResults] save health check failed");
        savedToDbRef.current = false;
      }
    });
  }, [
    user,
    scores,
    state,
    brandLoading,
    brands,
    scopedBrandId,
    activeBrandId,
  ]);

  if (!state || !effectiveEmail || !scores) {
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
      onGoToDashboard={() => navigate("/dashboard")}
    />
  );
}
