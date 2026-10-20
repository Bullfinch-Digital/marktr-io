import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { LockedCustomerProfileCard } from "../components/icp/LockedIcpTeaser";
import { DashboardFoundationSteps } from "../components/dashboard/DashboardFoundationSteps";
import { DashboardNextActionCard } from "../components/dashboard/DashboardNextActionCard";
import { DashboardTrialUnlocks } from "../components/dashboard/DashboardTrialUnlocks";
import { HealthScoreHero } from "../components/dashboard/HealthScoreHero";
import { BrandStorySummaryCard } from "../components/dashboard/BrandStorySummaryCard";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import { useCollections, fetchCollectionNamesByLineageIds } from "../hooks/useCollections";
import { useBrandAims } from "../hooks/useBrandAims";
import { useBrandStrategies } from "../hooks/useBrandStrategies";
import { useContentItems } from "../hooks/useContentItems";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import { CollectionPickerModal } from "../components/modals/CollectionPickerModal";
import { canCreateICP, canViewICP } from "../config/accessRules";
import { brandBandForIndex } from "../lib/brandPalette";
import { supabase } from "../config/supabase";
import { retryGuestICPFlushIfNeeded } from "../lib/guestICP";
import { attachOrphanIcpsToBrand } from "../lib/icpBrandAttach";
import { isBrandScopeReady, resolveScopedBrandId, scopeQueryToActiveBrand } from "../lib/brandScopedReads";
import {
  storyOutputFromRow,
  type BrandStoryRow as PersistedBrandStoryRow,
} from "../lib/brandStoryPersistence";
import { storyForViewer } from "../lib/brandStoryAccess";
import { CONTENT_TYPE_LABELS } from "../lib/contentTypeLabels";
import type { ContentItemType } from "../types/contentItemPayload";
import DashboardShell from "../layouts/DashboardShell";
import { ViewEditButton } from "../components/ui/ViewEditButton";
import { StrategyRosterCard } from "../components/strategy/StrategyRosterCard";
import { WeeklyProgressCard } from "../components/dashboard/WeeklyProgressCard";
import {
  isOnboardingIcpArrival,
  revealIcpSection,
  withoutOnboardingIcpArrival,
} from "../lib/onboardingIcpArrival";
import {
  firstUntickedFourteenDayItem,
  readFourteenDayChecks,
  resolveDashboardNextAction,
} from "../lib/dashboardNextAction";
import { greetingFirstName } from "../lib/greetingName";
import { DASHBOARD_STRATEGY_STATE_KEY } from "../lib/dashboardStrategyIntent";
import { useLatestActivePlan } from "../hooks/useLatestActivePlan";
import { isRealUser } from "../utils/isRealUser";

type HealthCheckRow = {
  id: string;
  overall_score: number | null;
  scores: Record<string, unknown> | null;
};

type BrandStoryRow = {
  id: string;
  story_data: unknown;
};

function readDimensionScore(
  scores: Record<string, unknown> | null | undefined,
  key: string
): number | "—" | "Not assessed" {
  if (!scores) return "—";
  const entry = scores[key];
  if (typeof entry === "number") return entry;
  if (entry && typeof entry === "object" && "score" in entry) {
    const score = (entry as { score?: unknown }).score;
    if (typeof score === "number") return score;
    if (score === null) return key === "contentConsistency" ? "Not assessed" : "—";
  }
  if (entry === null && key === "contentConsistency") return "Not assessed";
  return "—";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaywall } = usePaywall();
  const { openSignIn } = useAuthModal();
  const finishPromptedRef = useRef(false);
  const icpSectionRef = useRef<HTMLElement>(null);
  const [revealIcps, setRevealIcps] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const { profile, loading: profileLoading } = useProfile(user?.id ?? null);
  const [healthCheck, setHealthCheck] = useState<HealthCheckRow | null>(null);
  const [brandStory, setBrandStory] = useState<BrandStoryRow | null>(null);

  const scopedBrandId = resolveScopedBrandId(activeBrandId, brands) || "";

  const {
    icps: rawICPs,
    isLoading: icpsLoading,
    fetchICPs,
    updateICP,
    hasLoadedOnce,
  } = useICPs();
  const { refetch: refetchBrands } = useBrands();
  const { addICPToCollection, createCollection } = useCollections();
  const { aims, isLoading: aimsLoading } = useBrandAims(scopedBrandId || undefined);
  const { strategies, isLoading: strategiesLoading } = useBrandStrategies(scopedBrandId);
  const { items: contentItems, isLoading: contentLoading } = useContentItems(scopedBrandId);
  const { plan: activePlan, loading: planLoading } = useLatestActivePlan();

  const { ready: subReady, isPro } = useSubscription();

  const [collectionNamesByLineage, setCollectionNamesByLineage] = useState<
    Record<string, string[]>
  >({});
  const [addToCollectionLineageId, setAddToCollectionLineageId] = useState<string | null>(null);
  const [icpColorModal, setIcpColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });
  const [icpAvatarModal, setIcpAvatarModal] = useState({
    open: false,
    id: null as string | null,
    currentAvatarKey: null as string | null,
    gender: null as string | null,
    ageRange: null as string | null,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout");
    const isAnonymous = Boolean((user as { is_anonymous?: boolean })?.is_anonymous);
    if (checkout === "success" && !finishPromptedRef.current) {
      finishPromptedRef.current = true;
      if (isAnonymous) {
        openSignIn({
          redirectPath: "/dashboard",
          heading: "Your trial is ready",
          subheading: "Sign in with Google to activate it.",
        });
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("guest_ref");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [location.search, openSignIn, user]);

  useEffect(() => {
    if (!isOnboardingIcpArrival(location.state)) return;
    setRevealIcps(true);
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: withoutOnboardingIcpArrival(location.state),
    });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (finishPromptedRef.current) return;
    const isAnonymous = Boolean((user as { is_anonymous?: boolean })?.is_anonymous);
    if (isAnonymous && isPro) {
      finishPromptedRef.current = true;
      openSignIn({
        redirectPath: "/dashboard",
        heading: "Your trial is ready",
        subheading: "Sign in with Google to activate it.",
      });
    }
  }, [user, isPro, openSignIn]);

  const effectiveTier = subReady ? (isPro ? "pro" : "free") : "free";

  const icps = useMemo(() => {
    return rawICPs.map((icp, index) => ({
      ...icp,
      _index: icp._index ?? index,
      tags: icp.tags || [],
      isLocked: !canViewICP(effectiveTier as "free" | "pro", icp._index ?? index),
      gender: (icp as { gender?: string | null }).gender ?? (icp as { avatar_gender?: string | null }).avatar_gender ?? null,
      age_range:
        (icp as { age_range?: string | null }).age_range ??
        (icp as { avatar_age_range?: string | null }).avatar_age_range ??
        null,
    }));
  }, [rawICPs, subReady, effectiveTier]);

  const canCreateICPFlag = canCreateICP(icps.length, effectiveTier as "free" | "pro");

  const handleCreateNew = () => {
    if (!canCreateICPFlag) {
      openPaywall();
      return;
    }
    navigate("/onboarding-build");
  };

  const handleUpgrade = () => {
    openPaywall();
  };

  const handleOpenIcpColorModal = (id: string, currentColor?: string | null) => {
    setIcpColorModal({
      open: true,
      id,
      currentColor: currentColor ?? null,
    });
  };

  const handleOpenIcpAvatarModal = (
    id: string,
    currentAvatarKey?: string | null,
    gender?: string | null,
    ageRange?: string | null
  ) => {
    setIcpAvatarModal({
      open: true,
      id,
      currentAvatarKey: currentAvatarKey ?? null,
      gender: gender ?? null,
      ageRange: ageRange ?? null,
    });
  };

  const handleMoveIcpToBrand = async (icpId: string, brandId: string | null) => {
    await updateICP(icpId, { brand_id: brandId } as { brand_id: string | null });
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user?.id || authLoading || brandLoading || !activeBrandId) return;

    void (async () => {
      const attached = await attachOrphanIcpsToBrand(user.id, activeBrandId, {
        onlyWhenSingleBrand: true,
      });
      const flushed = await retryGuestICPFlushIfNeeded(user.id, { brandId: activeBrandId });
      if (attached > 0 || flushed) {
        await fetchICPs(true);
      }
    })();
  }, [user?.id, authLoading, brandLoading, activeBrandId, fetchICPs]);

  useEffect(() => {
    const onIcpsChanged = () => {
      void fetchICPs();
    };
    const onBrandsChanged = () => {
      void refetchBrands();
    };
    window.addEventListener("icps:changed", onIcpsChanged);
    window.addEventListener("brands:changed", onBrandsChanged);
    return () => {
      window.removeEventListener("icps:changed", onIcpsChanged);
      window.removeEventListener("brands:changed", onBrandsChanged);
    };
  }, [fetchICPs, refetchBrands]);

  useEffect(() => {
    if (!user?.id) {
      setHealthCheck(null);
      setBrandStory(null);
      return;
    }

    const brandId = resolveScopedBrandId(activeBrandId, brands);
    if (!isBrandScopeReady(brandLoading, brands, brandId)) {
      return;
    }

    let cancelled = false;

    const loadMarktrResults = async () => {
      let healthQuery = supabase
        .from("health_check_results")
        .select("id, overall_score, scores")
        .eq("user_id", user.id);
      healthQuery = scopeQueryToActiveBrand(healthQuery, brandId);

      let storyQuery = supabase
        .from("brand_story_results")
        .select("id, story_data")
        .eq("user_id", user.id);
      storyQuery = scopeQueryToActiveBrand(storyQuery, brandId);

      const [{ data: healthData }, { data: storyData }] = await Promise.all([
        healthQuery.order("created_at", { ascending: false }).limit(1).maybeSingle(),
        storyQuery.order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (cancelled) return;
      setHealthCheck((healthData as HealthCheckRow | null) ?? null);
      setBrandStory((storyData as BrandStoryRow | null) ?? null);
    };

    void loadMarktrResults();

    const onGuestDataReady = () => {
      void loadMarktrResults();
    };
    window.addEventListener("marktr:guest-data-ready", onGuestDataReady);

    return () => {
      cancelled = true;
      window.removeEventListener("marktr:guest-data-ready", onGuestDataReady);
    };
  }, [user?.id, activeBrandId, brandLoading, brands]);

  const loadCollectionMemberships = useCallback(async () => {
    if (!user?.id) {
      setCollectionNamesByLineage({});
      return;
    }
    const lineageIds = [
      ...new Set(
        icps
          .map((icp) => icp.lineage_id)
          .filter((lineageId): lineageId is string => Boolean(lineageId))
      ),
    ];
    if (!lineageIds.length) {
      setCollectionNamesByLineage({});
      return;
    }
    try {
      const map = await fetchCollectionNamesByLineageIds(user.id, lineageIds);
      setCollectionNamesByLineage(map);
    } catch (err) {
      console.error("[Dashboard] collection membership fetch failed", err);
    }
  }, [user?.id, icps]);

  useEffect(() => {
    void loadCollectionMemberships();
    const onChanged = () => void loadCollectionMemberships();
    window.addEventListener("collections:changed", onChanged);
    return () => window.removeEventListener("collections:changed", onChanged);
  }, [loadCollectionMemberships]);

  const storyOutput = useMemo(
    () =>
      storyOutputFromRow(
        brandStory
          ? ({
              id: brandStory.id,
              user_id: user?.id ?? "",
              brand_id: scopedBrandId || null,
              story_data: brandStory.story_data as PersistedBrandStoryRow["story_data"],
              created_at: "",
            } as PersistedBrandStoryRow)
          : null
      ),
    [brandStory, user?.id, scopedBrandId]
  );

  const hasHealth = Boolean(healthCheck?.scores);
  const hasStory = Boolean(storyOutput);
  const hasICPs = icps.length > 0;

  const healthScores = healthCheck?.scores as Record<string, unknown> | null | undefined;
  const websiteScore = readDimensionScore(healthScores, "websiteClarity");
  const brandStoryScore = readDimensionScore(healthScores, "brandStory");
  const contentScore = readDimensionScore(healthScores, "contentConsistency");
  const socialScore = readDimensionScore(healthScores, "socialPresence");
  const overallFromScores = readDimensionScore(healthScores, "overall");
  const overallScore: number | "—" =
    typeof healthCheck?.overall_score === "number"
      ? healthCheck.overall_score
      : overallFromScores === "Not assessed"
        ? "—"
        : overallFromScores;

  const previewStrategies = strategies.slice(0, 3);
  const latestStrategy = strategies[0];

  const draftItems = useMemo(
    () => contentItems.filter((item) => item.status === "draft"),
    [contentItems]
  );

  const draftCountsByType = useMemo(() => {
    const counts: Partial<Record<ContentItemType, number>> = {};
    for (const item of draftItems) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return Object.entries(counts) as Array<[ContentItemType, number]>;
  }, [draftItems]);

  const recentDrafts = draftItems.slice(0, 3);

  const isGuest = !isRealUser(user);
  const hasAccess = (subReady && isPro) || profile?.role === "admin";
  const showTrialUnlocks = subReady && !profileLoading && !hasAccess;
  const latestAim = aims[0];
  const fourteenDayChecks = latestStrategy ? readFourteenDayChecks(latestStrategy.id) : null;
  const firstUntickedPlanItem = latestStrategy
    ? firstUntickedFourteenDayItem(
        latestStrategy.strategy?.channel_plan?.first_14_days,
        fourteenDayChecks
      )
    : null;

  const nextAction = useMemo(
    () =>
      resolveDashboardNextAction({
        hasHealth,
        hasStory,
        hasCustomers: hasICPs,
        hasAccess,
        isGuest,
        progressReady: !aimsLoading && !strategiesLoading,
        hasAim: aims.length > 0,
        aimLineageId: latestAim?.lineage_id,
        hasStrategy: strategies.length > 0,
        strategyId: latestStrategy?.id,
        firstUntickedPlanItem,
        planReady: !planLoading,
        activePlan: activePlan
          ? {
              id: activePlan.id,
              startDate: activePlan.start_date,
              lengthDays: activePlan.length_days,
              days: activePlan.days,
            }
          : null,
      }),
    [
      hasHealth,
      hasStory,
      hasICPs,
      hasAccess,
      isGuest,
      aimsLoading,
      strategiesLoading,
      aims.length,
      latestAim?.lineage_id,
      strategies.length,
      latestStrategy?.id,
      firstUntickedPlanItem,
      planLoading,
      activePlan,
    ]
  );

  const runNextAction = () => {
    if (!nextAction) return;
    if (nextAction.id === "health") {
      navigate("/health-check");
      return;
    }
    if (nextAction.id === "story") {
      navigate("/story");
      return;
    }
    if (nextAction.id === "customer") {
      navigate("/onboarding-build");
      return;
    }
    if (nextAction.id === "aim") {
      navigate("/strategy", { state: { [DASHBOARD_STRATEGY_STATE_KEY]: { kind: "aim" } } });
      return;
    }
    if (nextAction.id === "strategy" && nextAction.aimLineageId) {
      navigate("/strategy", {
        state: {
          [DASHBOARD_STRATEGY_STATE_KEY]: {
            kind: "strategy",
            aimLineageId: nextAction.aimLineageId,
          },
        },
      });
      return;
    }
    if (nextAction.id === "plan") {
      const params = new URLSearchParams({ create: "1" });
      if (nextAction.strategyId) params.set("strategy", nextAction.strategyId);
      navigate(`/plan?${params.toString()}`);
      return;
    }
    if (
      (nextAction.id === "today" || nextAction.id === "plan_next") &&
      nextAction.planId &&
      nextAction.dayNumber
    ) {
      navigate(`/plan/${nextAction.planId}/day/${nextAction.dayNumber}`);
      return;
    }
    if (nextAction.id === "plan_complete" && nextAction.planId) {
      navigate(`/plan/${nextAction.planId}?extend=1`);
      return;
    }
    if (nextAction.id === "trial") openPaywall();
  };

  const renderFoundationSteps = () => (
    <DashboardFoundationSteps
      hasHealth={hasHealth}
      hasStory={hasStory}
      hasCustomers={hasICPs}
      overallScore={overallScore}
      customerCount={icps.length}
      onHealth={() => navigate(hasHealth ? "/health-report" : "/health-check")}
      onStory={() => navigate(hasStory ? "/story-report" : "/story")}
      onCustomers={() => navigate(hasICPs ? "/icps" : "/onboarding-build")}
    />
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = (key: string): string | null => {
    const value = metadata[key];
    return typeof value === "string" ? value : null;
  };
  const firstName = greetingFirstName(
    [profile?.name, metadataName("given_name"), metadataName("name"), metadataName("full_name")],
    user?.email
  );
  const greetingName = firstName ? `, ${firstName}` : "";

  const previewIcps = icps.slice(0, 3);
  const showIcpPlaceholder = !hasLoadedOnce || icpsLoading;
  const icpsReadyToReveal = !showIcpPlaceholder && previewIcps.length > 0;

  useEffect(() => {
    if (!revealIcps || !icpsReadyToReveal) return;
    const el = icpSectionRef.current;
    if (!el) return;
    return revealIcpSection(el);
  }, [revealIcps, icpsReadyToReveal]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardShell onCreateNew={handleCreateNew}>
        <div className="max-w-5xl space-y-8">
          {nextAction ? (
            <DashboardNextActionCard
              title={nextAction.title}
              benefit={nextAction.benefit}
              cta={nextAction.cta}
              onAction={runNextAction}
              trackId={nextAction.trackId}
            />
          ) : null}

          {showTrialUnlocks ? (
            <DashboardTrialUnlocks onStartTrial={() => openPaywall()} />
          ) : null}

          <header>
            <h1 className="app-heading-page font-['Fraunces'] text-[2.5rem] leading-tight tracking-[-0.01em] text-foreground">
              {getGreeting()}
              {greetingName}.
            </h1>
            <p className="mt-1 font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
              Your brand cockpit — health, story, customers, strategy, and content.
            </p>
          </header>

          {latestStrategy ? (
            <WeeklyProgressCard
              userId={user.id}
              strategyId={latestStrategy.id}
              channels={latestStrategy.strategy?.channel_plan?.channels}
              location="dashboard"
            />
          ) : null}

          {/* 1. Health score hero — step chain + 4-pillar breakdown */}
          <section className="space-y-8">
            {renderFoundationSteps()}

            <HealthScoreHero
              empty={!hasHealth}
              overall={overallScore}
              reportHref="/health-report"
              onStartHealthCheck={() => navigate("/health-check")}
              dimensions={[
                {
                  key: "websiteClarity",
                  label: "Website Clarity",
                  score: websiteScore,
                  rerunHref: "/health-check",
                },
                {
                  key: "brandStory",
                  label: "Brand Story",
                  score: brandStoryScore,
                },
                {
                  key: "contentConsistency",
                  label: "Content Consistency",
                  score: contentScore,
                  rerunHref: "/health-check",
                },
                {
                  key: "socialPresence",
                  label: "Social Presence",
                  score: socialScore,
                  rerunHref: "/health-check",
                },
              ]}
            />
          </section>

          {/* 2. Brand story summary */}
          <BrandStorySummaryCard
            story={storyOutput ? storyForViewer(storyOutput, isPro) : null}
            hasAccess={isPro}
          />

          {/* 3. ICPs — same card as My ICPs */}
          <section ref={icpSectionRef} className="scroll-mt-20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Your ICPs</h2>
              <Link
                to="/icps"
                className="app-text-link font-['Plus_Jakarta_Sans']"
              >
                View all →
              </Link>
            </div>

            {showIcpPlaceholder ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-[18px] border border-brand-nested-stroke bg-muted/30"
                  />
                ))}
              </div>
            ) : previewIcps.length === 0 ? (
              <div className="app-card border-dashed p-8 text-center">
                <p className="font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
                  No customer profiles yet.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="app-text-link mt-3 font-['Plus_Jakarta_Sans']"
                >
                  Create your first ICP →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewIcps.map((icp, index) => {
                  const profileIndex = icp._index ?? index;
                  if (!canViewICP(effectiveTier as "free" | "pro", profileIndex)) {
                    return (
                      <LockedCustomerProfileCard
                        key={icp.id}
                        profileNumber={profileIndex + 1}
                        onUnlock={handleUpgrade}
                      />
                    );
                  }
                  const { pain_points: sourcePain, ...cardRest } = icp;
                  const cardIcp = {
                    ...cardRest,
                    painPoints: (sourcePain ?? []).slice(0, effectiveTier === "pro" ? undefined : 2),
                  };
                  return (
                  <ICPPreviewCard
                    key={icp.id}
                    icp={cardIcp}
                    userTier={effectiveTier}
                    onUpgrade={handleUpgrade}
                    isLocked={false}
                    bandColor={brandBandForIndex(index)}
                    branded
                    nested
                    collectionNames={
                      icp.lineage_id ? collectionNamesByLineage[icp.lineage_id] || [] : []
                    }
                    onChangeColor={handleOpenIcpColorModal}
                    onChangeAvatar={handleOpenIcpAvatarModal}
                    brands={brands?.map((b) => ({ id: b.id, name: b.name })) || []}
                    onMoveToBrand={handleMoveIcpToBrand}
                    onDelete={() => void fetchICPs()}
                    onAddToCollection={() => {
                      if (icp.lineage_id) setAddToCollectionLineageId(icp.lineage_id);
                    }}
                  />
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Campaigns — same compact cards as Strategy */}
          <section className="scroll-mt-20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Campaigns</h2>
              <Link
                to="/strategy"
                className="app-text-link font-['Plus_Jakarta_Sans']"
              >
                View all →
              </Link>
            </div>
            {strategiesLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-[24px] border-2 border-brand-stroke bg-muted/30"
                  />
                ))}
              </div>
            ) : previewStrategies.length === 0 ? (
              <div className="app-card border-dashed p-8 text-center">
                <p className="font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
                  No campaigns yet.
                </p>
                <Link
                  to="/strategy"
                  className="app-text-link mt-3 font-['Plus_Jakarta_Sans']"
                >
                  Create a campaign →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {previewStrategies.map((strategy) => (
                  <StrategyRosterCard key={strategy.id} strategy={strategy} />
                ))}
              </div>
            )}
          </section>

          {/* 5. Content in draft */}
          <section className="app-card p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Content in draft</h2>
              <Link
                to="/content"
                className="app-text-link font-['Plus_Jakarta_Sans']"
              >
                Open Content →
              </Link>
            </div>
            {contentLoading ? (
              <p className="mt-4 font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">Loading…</p>
            ) : draftItems.length === 0 ? (
              <p className="mt-4 font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
                No draft content yet.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {draftCountsByType.map(([type, count]) => (
                    <span
                      key={type}
                      className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm"
                    >
                      {CONTENT_TYPE_LABELS[type]}: {count}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {recentDrafts.map((item) => (
                    <li key={item.id}>
                      <div
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/content/${item.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(`/content/${item.id}`);
                          }
                        }}
                        className="app-card-nested flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="min-w-0 truncate font-['Plus_Jakarta_Sans'] text-base text-foreground">
                          {CONTENT_TYPE_LABELS[item.type]}
                          {item.composition?.persona?.name
                            ? ` · ${item.composition.persona.name}`
                            : ""}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
                            {formatDate(item.updated_at)}
                          </span>
                          <span onClick={(event) => event.stopPropagation()}>
                            <ViewEditButton href={`/content/${item.id}`} />
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">Your progress</h2>
            {renderFoundationSteps()}
          </section>
        </div>
      </DashboardShell>

      <ICPColorModal
        isOpen={icpColorModal.open}
        id={icpColorModal.id}
        currentColor={icpColorModal.currentColor}
        onClose={() => setIcpColorModal({ open: false, id: null, currentColor: null })}
        onSaved={async () => {
          setIcpColorModal({ open: false, id: null, currentColor: null });
          await fetchICPs();
        }}
      />

      <ICPAvatarModal
        isOpen={icpAvatarModal.open}
        icpId={icpAvatarModal.id}
        currentAvatarKey={icpAvatarModal.currentAvatarKey}
        gender={icpAvatarModal.gender}
        ageRange={icpAvatarModal.ageRange}
        onClose={() =>
          setIcpAvatarModal({
            open: false,
            id: null,
            currentAvatarKey: null,
            gender: null,
            ageRange: null,
          })
        }
        onSaved={async () => {
          await fetchICPs();
        }}
      />

      <CollectionPickerModal
        isOpen={!!addToCollectionLineageId}
        onClose={() => setAddToCollectionLineageId(null)}
        onSelectCollection={async (collectionId) => {
          if (!addToCollectionLineageId) return false;
          const ok = await addICPToCollection(collectionId, addToCollectionLineageId);
          if (ok) {
            setAddToCollectionLineageId(null);
            void loadCollectionMemberships();
          }
          return ok;
        }}
        onCreateCollection={async (data) => {
          const created = await createCollection(data);
          return created?.id ?? null;
        }}
      />
    </>
  );
}
