import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Activity, BookOpen, ChevronRight, Users } from "lucide-react";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { MarktrStepCard } from "../components/dashboard/MarktrStepCard";
import { HealthScoreHero } from "../components/dashboard/HealthScoreHero";
import { BrandStorySummaryCard } from "../components/dashboard/BrandStorySummaryCard";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import { useCollections, fetchCollectionNamesByLineageIds } from "../hooks/useCollections";
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
import { supabase } from "../config/supabase";
import { retryGuestICPFlushIfNeeded } from "../lib/guestICP";
import { attachOrphanIcpsToBrand } from "../lib/icpBrandAttach";
import { isBrandScopeReady, resolveScopedBrandId, scopeQueryToActiveBrand } from "../lib/brandScopedReads";
import {
  storyOutputFromRow,
  type BrandStoryRow as PersistedBrandStoryRow,
} from "../lib/brandStoryPersistence";
import { CONTENT_TYPE_LABELS } from "../lib/contentTypeLabels";
import type { ContentItemType } from "../types/contentItemPayload";
import DashboardShell from "../layouts/DashboardShell";

type HealthCheckRow = {
  id: string;
  overall_score: number | null;
  scores: Record<string, unknown> | null;
};

type BrandStoryRow = {
  id: string;
  story_data: unknown;
};

type NextAction = {
  label: string;
  tag: string;
  desc: string;
  href: string;
};

function readDimensionScore(
  scores: Record<string, unknown> | null | undefined,
  key: string
): number | "—" {
  if (!scores) return "—";
  const entry = scores[key];
  if (typeof entry === "number") return entry;
  if (entry && typeof entry === "object" && "score" in entry) {
    const score = (entry as { score?: unknown }).score;
    if (typeof score === "number") return score;
    if (score === null) return "—";
  }
  return "—";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function deriveNextAction(input: {
  hasBrandStory: boolean;
  hasIcps: boolean;
  hasHealthCheck: boolean;
  scores: Record<string, unknown> | null | undefined;
}): NextAction | null {
  if (!input.hasBrandStory) {
    return {
      label: "Build your brand story",
      tag: "STORY",
      desc: "Capture positioning and purpose so Strategy and Content speak with one voice.",
      href: "/story",
    };
  }

  if (!input.hasIcps) {
    return {
      label: "Define your ideal customer",
      tag: "ICP",
      desc: "Every strategy starts with knowing exactly who you serve.",
      href: "/onboarding-build",
    };
  }

  if (!input.hasHealthCheck) {
    return {
      label: "Run your digital health check",
      tag: "HEALTH",
      desc: "Score Website, Brand Story, Content, and Social so you know where to focus.",
      href: "/health-check",
    };
  }

  const pillars: Array<{ key: string; label: string; href: string; score: number | "—" }> = [
    {
      key: "websiteClarity",
      label: "Website Clarity",
      href: "/health-check",
      score: readDimensionScore(input.scores, "websiteClarity"),
    },
    {
      key: "brandStory",
      label: "Brand Story",
      href: "/story-report",
      score: readDimensionScore(input.scores, "brandStory"),
    },
    {
      key: "contentConsistency",
      label: "Content Consistency",
      href: "/health-check",
      score: readDimensionScore(input.scores, "contentConsistency"),
    },
    {
      key: "socialPresence",
      label: "Social Presence",
      href: "/health-check",
      score: readDimensionScore(input.scores, "socialPresence"),
    },
  ];

  const numeric = pillars.filter((p): p is typeof p & { score: number } => typeof p.score === "number");
  if (numeric.length === 0) return null;

  const lowest = numeric.reduce((min, p) => (p.score < min.score ? p : min));
  // Only surface when there's a real gap — perfect scores aren't actionable.
  if (lowest.score >= 90) return null;

  return {
    label: `Improve ${lowest.label}`,
    tag: "HEALTH",
    desc: `This is your lowest pillar at ${lowest.score}/100. Focus here next.`,
    href: lowest.href,
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaywall } = usePaywall();
  const { openSignIn } = useAuthModal();
  const finishPromptedRef = useRef(false);

  const { user, loading: authLoading } = useAuth();
  const { activeBrandId, loading: brandLoading, brands } = useBrand();
  const { profile } = useProfile(user?.id ?? null);
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
  const { strategies, isLoading: strategiesLoading } = useBrandStrategies(scopedBrandId);
  const { items: contentItems, isLoading: contentLoading } = useContentItems(scopedBrandId);

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
      url.searchParams.delete("checkout");
      url.searchParams.delete("guest_ref");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, [location.search, openSignIn, user]);

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
      isLocked: subReady ? !canViewICP(effectiveTier as "free" | "pro", icp._index ?? index) : false,
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
  const overallScore =
    typeof healthCheck?.overall_score === "number"
      ? healthCheck.overall_score
      : readDimensionScore(healthScores, "overall");

  const latestStrategy = strategies[0] ?? null;
  const campaignIdeaCount = latestStrategy?.strategy?.campaign_ideas?.length ?? 0;

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

  const nextAction = useMemo(
    () =>
      deriveNextAction({
        hasBrandStory: hasStory,
        hasIcps: hasICPs,
        hasHealthCheck: hasHealth,
        scores: healthScores,
      }),
    [hasStory, hasICPs, hasHealth, healthScores]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName =
    profile?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";
  const greetingName = firstName ? `, ${firstName}` : "";

  const previewIcps = icps.slice(0, 3);
  const showIcpPlaceholder = !hasLoadedOnce || icpsLoading;

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardShell onCreateNew={handleCreateNew}>
        <div className="max-w-5xl space-y-10">
          <header>
            <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833]">
              {getGreeting()}
              {greetingName}.
            </h1>
            <p className="mt-1 font-['DM_Sans'] text-base text-muted-foreground">
              Your brand cockpit — health, story, customers, strategy, and content.
            </p>
          </header>

          {/* 1. Health score hero — step chain + 4-pillar breakdown */}
          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <MarktrStepCard
                step={1}
                title="Digital health check"
                complete={hasHealth}
                onClick={() => navigate(hasHealth ? "/health-report" : "/health-check")}
                summary={
                  <div className="mt-2 flex items-center gap-2">
                    <Activity
                      className={`h-5 w-5 shrink-0 ${hasHealth ? "text-[#2D7A5F]" : "text-muted-foreground"}`}
                      aria-hidden
                    />
                    {hasHealth ? (
                      <p className="font-['DM_Sans'] text-sm text-[#2D7A5F]">
                        Overall score{" "}
                        <span className="font-['Fraunces'] text-xl font-bold">{overallScore}</span>
                        /100
                      </p>
                    ) : (
                      <p className="font-['DM_Sans'] text-sm text-muted-foreground">Not started yet</p>
                    )}
                  </div>
                }
              />
              <MarktrStepCard
                step={2}
                title="Brand story"
                complete={hasStory}
                onClick={() => navigate(hasStory ? "/story-report" : "/story")}
                summary={
                  <div className="mt-2 flex items-center gap-2">
                    <BookOpen
                      className={`h-5 w-5 shrink-0 ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`}
                      aria-hidden
                    />
                    <p
                      className={`font-['DM_Sans'] text-sm ${hasStory ? "text-[#E8650A]" : "text-muted-foreground"}`}
                    >
                      {hasStory ? "Brand story ready" : "Not started yet"}
                    </p>
                  </div>
                }
              />
              <MarktrStepCard
                step={3}
                title="Know your customer"
                complete={hasICPs}
                onClick={() => navigate(hasICPs ? "/icps" : "/onboarding-build")}
                summary={
                  <div className="mt-2 flex items-center gap-2">
                    <Users
                      className={`h-5 w-5 shrink-0 ${hasICPs ? "text-[#E8650A]" : "text-muted-foreground"}`}
                      aria-hidden
                    />
                    <p
                      className={`font-['DM_Sans'] text-sm ${hasICPs ? "text-[#D4871A]" : "text-muted-foreground"}`}
                    >
                      {hasICPs ? `${icps.length} profiles` : "Not started yet"}
                    </p>
                  </div>
                }
              />
            </div>

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
          <BrandStorySummaryCard story={storyOutput} />

          {/* 3. ICPs — same card as My ICPs */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Your ICPs</h2>
              <Link
                to="/icps"
                className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </div>

            {showIcpPlaceholder ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-design border border-black/10 bg-muted/30"
                  />
                ))}
              </div>
            ) : previewIcps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                <p className="font-['DM_Sans'] text-sm text-muted-foreground">
                  No customer profiles yet.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="mt-3 font-['DM_Sans'] text-sm font-semibold text-primary hover:underline"
                >
                  Create your first ICP →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewIcps.map((icp) => (
                  <ICPPreviewCard
                    key={icp.id}
                    icp={icp}
                    userTier={effectiveTier}
                    onUpgrade={handleUpgrade}
                    isLocked={!canViewICP(effectiveTier as "free" | "pro", icp._index ?? 0)}
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
                ))}
              </div>
            )}
          </section>

          {/* 4. Latest strategy */}
          <section className="rounded-2xl border border-border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Latest strategy</h2>
              <Link
                to="/strategy"
                className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            {strategiesLoading ? (
              <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">Loading…</p>
            ) : latestStrategy ? (
              <button
                type="button"
                onClick={() => navigate(`/strategy/${latestStrategy.id}`)}
                className="mt-4 w-full rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40"
              >
                <p className="font-['Fraunces'] text-lg font-bold text-[#0D1833] truncate">
                  {latestStrategy.title}
                </p>
                <p className="mt-1 font-['DM_Sans'] text-xs text-muted-foreground">
                  v{latestStrategy.version} · updated {formatDate(latestStrategy.updated_at)} ·{" "}
                  {campaignIdeaCount} campaign idea{campaignIdeaCount === 1 ? "" : "s"}
                </p>
              </button>
            ) : (
              <div className="mt-4">
                <p className="font-['DM_Sans'] text-sm text-muted-foreground">
                  No strategy versions yet.
                </p>
                <Link
                  to="/strategy"
                  className="mt-2 inline-block font-['DM_Sans'] text-sm font-semibold text-primary hover:underline"
                >
                  Create a strategy →
                </Link>
              </div>
            )}
          </section>

          {/* 5. Content in draft */}
          <section className="rounded-2xl border border-border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">Content in draft</h2>
              <Link
                to="/content"
                className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
              >
                Open Content →
              </Link>
            </div>
            {contentLoading ? (
              <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">Loading…</p>
            ) : draftItems.length === 0 ? (
              <p className="mt-4 font-['DM_Sans'] text-sm text-muted-foreground">
                No draft content yet.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {draftCountsByType.map(([type, count]) => (
                    <span
                      key={type}
                      className="rounded-full border border-border bg-background px-3 py-1 font-['DM_Sans'] text-xs text-[#0D1833]"
                    >
                      {CONTENT_TYPE_LABELS[type]}: {count}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {recentDrafts.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/content/${item.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                      >
                        <span className="min-w-0 truncate font-['DM_Sans'] text-sm text-[#0D1833]">
                          {CONTENT_TYPE_LABELS[item.type]}
                          {item.composition?.persona?.name
                            ? ` · ${item.composition.persona.name}`
                            : ""}
                        </span>
                        <span className="shrink-0 font-['DM_Sans'] text-xs text-muted-foreground">
                          {formatDate(item.updated_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* 6. Next action — single derived card, omitted when nothing actionable */}
          {nextAction ? (
            <section>
              <p className="mb-4 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                What to do next
              </p>
              <button
                type="button"
                onClick={() => navigate(nextAction.href)}
                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary font-['DM_Sans'] text-sm font-medium text-primary">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="font-['DM_Sans'] text-sm font-medium text-[#0D1833]">
                      {nextAction.label}
                    </span>
                    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {nextAction.tag}
                    </span>
                  </div>
                  <p className="font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
                    {nextAction.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            </section>
          ) : null}
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
