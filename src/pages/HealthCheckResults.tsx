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
  resolveBrandIdForHealthWrite,
} from "../lib/healthCheckPersistence";
import { resolveScopedBrandId } from "../lib/brandScopedReads";

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
  const saveInFlightRef = useRef(false);
  const lastPersistedRunKeyRef = useRef<string | null>(null);

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
    if (!user?.id || isAnonymous || !scores || !state || !persistRunKey) return;
    if (saveInFlightRef.current) return;
    if (lastPersistedRunKeyRef.current === persistRunKey) {
      console.debug("[HealthCheckResults] save skipped — already persisted this run", {
        persistRunKey,
      });
      return;
    }

    let cancelled = false;
    saveInFlightRef.current = true;

    void (async () => {
      const { brandId, source } = await resolveBrandIdForHealthWrite(
        user.id,
        scopedBrandId,
        brands
      );

      if (cancelled) {
        saveInFlightRef.current = false;
        return;
      }

      if (!brandId) {
        console.error("[HealthCheckResults] save skipped — brand_id unresolved after fallbacks", {
          userId: user.id,
          activeBrandId,
          scopedBrandId,
          brandCount: brands.length,
          brandLoading,
          hasBrandProvider: brands.length > 0 || Boolean(activeBrandId),
        });
        saveInFlightRef.current = false;
        return;
      }

      const inputSnapshot = buildHealthCheckInputSnapshot({
        websiteUrl: state.websiteUrl,
        instagramHandle: state.instagramHandle,
        facebookUrl: state.facebookUrl,
        businessName: state.businessName,
      });

      console.log("[HealthCheckResults] save inserting", {
        userId: user.id,
        brandId,
        brandSource: source,
        overall: scores.overall,
        hasDeterministic: Boolean(scores.deterministic ?? state.websiteScore?.deterministic),
        persistRunKey,
      });

      const row = await insertHealthCheckResult(user.id, brandId, {
        scores,
        websiteScore: state.websiteScore,
        inputSnapshot,
      });

      saveInFlightRef.current = false;

      if (cancelled) return;

      if (!row) {
        console.warn("[HealthCheckResults] save failed — insert returned null", {
          userId: user.id,
          brandId,
        });
        return;
      }

      lastPersistedRunKeyRef.current = persistRunKey;
      console.log("[HealthCheckResults] save inserted", {
        rowId: row.id,
        brandId: row.brand_id,
        createdAt: row.created_at,
        hasDeterministic: Boolean(row.scores?.deterministic),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    scores,
    state,
    persistRunKey,
    scopedBrandId,
    activeBrandId,
    brands,
    brandLoading,
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
