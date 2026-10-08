import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateScores, type HealthCheckInput } from "../lib/healthCheckScoring";
import { mergeHealthFindings } from "../lib/healthCheckFindings";
import { setGuestHealthCheck } from "../lib/guestHealthCheck";
import { getGuestIdentityEmail } from "../lib/guestContext";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { HealthCheckReportView } from "../components/healthCheck/HealthCheckReportView";
import { DashboardSaveFailedNotice } from "../components/DashboardSaveFailedNotice";
import {
  persistHealthCheckForActiveBrand,
  type HealthCheckSaveFailureReason,
} from "../lib/healthCheckPersistence";
import { resolveScopedBrandId } from "../lib/brandScopedReads";
import { markHealthCompleted, scoreBand, track } from "../lib/analytics";

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
  const completeTrackedRef = useRef(false);
  const lastPersistedRunKeyRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const scopedBrandId = resolveScopedBrandId(activeBrandId, brands);

  const effectiveEmail = state?.email?.trim() || getGuestIdentityEmail() || "";

  const scores = useMemo(
    () =>
      effectiveEmail && state
        ? calculateScores({ ...state, email: effectiveEmail })
        : null,
    [state, effectiveEmail]
  );

  const persistRunKey = useMemo(() => {
    if (!state || !scores) return "";
    return JSON.stringify({
      websiteUrl: state.websiteUrl ?? "",
      instagramHandle: state.instagramHandle ?? "",
      facebookUrl: state.facebookUrl ?? "",
      overall: scores.overall,
      modelVersion: scores.deterministic?.modelVersion ?? "",
    });
  }, [state, scores]);

  const persistResult = useCallback(async (): Promise<boolean> => {
    const isAnonymous = (user as { is_anonymous?: boolean } | null)?.is_anonymous === true;
    if (!user?.id || isAnonymous || !scores || !state || !persistRunKey) return true;
    if (brandLoading) return true;
    if (lastPersistedRunKeyRef.current === persistRunKey) return true;
    if (saveInFlightRef.current) return true;

    saveInFlightRef.current = true;
    const result = await persistHealthCheckForActiveBrand({
      userId: user.id,
      contextBrandId: scopedBrandId,
      brands,
      scores,
      websiteScore: state.websiteScore,
      input: {
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        businessName: state.businessName,
      },
    });
    saveInFlightRef.current = false;

    if (result.ok) {
      lastPersistedRunKeyRef.current = persistRunKey;
      setSaveFailed(false);
      return true;
    }

    const reason: HealthCheckSaveFailureReason = result.reason;
    setSaveFailed(true);
    track("health_check_save_failed", { reason });
    console.warn("[HealthCheckResults] save failed", { reason });
    return false;
  }, [
    user?.id,
    scores,
    state,
    persistRunKey,
    brandLoading,
    scopedBrandId,
    brands,
  ]);

  useEffect(() => {
    if (!state || !scores) return;
    if (!completeTrackedRef.current) {
      completeTrackedRef.current = true;
      markHealthCompleted();
      track("health_check_complete", { score_band: scoreBand(scores.overall) });
    }
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
    void persistResult();
  }, [persistResult]);

  const handleRetrySave = async () => {
    setRetrying(true);
    try {
      lastPersistedRunKeyRef.current = null;
      await persistResult();
    } finally {
      setRetrying(false);
    }
  };

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
      saveNotice={
        saveFailed ? (
          <DashboardSaveFailedNotice onRetry={() => void handleRetrySave()} retrying={retrying} />
        ) : null
      }
    />
  );
}
