import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import { CollectionCard as DashboardCollectionCard } from "../components/cards/DashboardCollectionCard";
import { BrandCard } from "../components/cards/BrandCard";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import { useCollections, type Collection } from "../hooks/useCollections";
import useSubscription from "../hooks/useSubscription";
import useProfile from "../hooks/useProfile";
import { useOutboxSync } from "../hooks/useOutboxSync";
import { useAuth } from "../contexts/AuthContext";
import { usePaywall } from "../contexts/PaywallContext";
import { useAuthModal } from "../contexts/AuthModalContext";
import { WifiOff, AlertCircle, ChevronRight, Plus } from "lucide-react";
import { exportBrandAsPDF } from "../utils/exportBrand";
import CollectionColorModal from "../components/CollectionColorModal";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import CollectionRenameModal from "../components/CollectionRenameModal";
import CollectionDeleteModal from "../components/CollectionDeleteModal";
import { canCreateICP, canCreateCollection, canViewICP, canCreateBrand, canExportBrand } from "../config/accessRules";
import { supabase } from "../config/supabase";
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
  }
  return "—";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaywall } = usePaywall();
  const { openSignIn } = useAuthModal();
  const finishPromptedRef = useRef(false);

  // Fetch data from Supabase
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const [healthCheck, setHealthCheck] = useState<HealthCheckRow | null>(null);
  const [brandStory, setBrandStory] = useState<BrandStoryRow | null>(null);
  const {
    icps: rawICPs,
    isLoading: icpsLoading,
    isOffline: icpsOffline,
    fetchICPs,
    updateICP,
    hasLoadedOnce,
  } = useICPs();
  const {
    brands,
    isLoading: brandsLoading,
    createBrand,
    deleteBrand,
    refetch: refetchBrands,
  } = useBrands();
  const {
    collections,
    isLoading: collectionsLoading,
    isOffline: collectionsOffline,
    refetch: refetchCollections,
  } = useCollections();
  const {
    tier: userTier,
    trialActive,
    ready: subReady,
    loading: subLoading,
    isPro,
  } = useSubscription();
  const { isSyncing, pendingCount } = useOutboxSync();
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const getUniqueBrandName = (baseInput: string, suffixWord: string, existingNames: string[]) => {
    const existing = new Set(existingNames.map((n) => (n || "").trim().toLowerCase()));
    const stripSuffix = (name: string) => {
      let candidate = name.trim();
      const re = new RegExp(`\\s\\(${suffixWord}(?:\\s\\d+)?\\)$`, "i");
      while (re.test(candidate)) {
        candidate = candidate.replace(re, "").trim();
      }
      return candidate;
    };
    const base = stripSuffix(baseInput || "Untitled Brand") || "Untitled Brand";
    if (!existing.has(base.toLowerCase())) return base;
    let i = 1;
    while (true) {
      const candidate = `${base} (${suffixWord}${i === 1 ? "" : ` ${i}`})`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      i += 1;
    }
  };
  const [icpColorModal, setIcpColorModal] = useState({
    open: false,
    id: null as string | null,
    currentColor: null as string | null,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout");
    const isAnonymous = Boolean((user as any)?.is_anonymous);
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
    const isAnonymous = Boolean((user as any)?.is_anonymous);
    if (isAnonymous && isPro) {
      finishPromptedRef.current = true;
      openSignIn({
        redirectPath: "/dashboard",
        heading: "Your trial is ready",
        subheading: "Sign in with Google to activate it.",
      });
    }
  }, [user, isPro, openSignIn]);

  const [icpAvatarModal, setIcpAvatarModal] = useState({
    open: false,
    id: null as string | null,
    currentAvatarKey: null as string | null,
    gender: null as string | null,
    ageRange: null as string | null,
  });

  // Transform ICP data to match component expectations
  const effectiveTier = subReady ? (isPro ? "pro" : "free") : "free";

  const icps = useMemo(() => {
    return rawICPs.map((icp, index) => ({
      ...icp,
      _index: icp._index ?? index,
      tags: icp.tags || [],
      isLocked: subReady ? !canViewICP(effectiveTier as any, icp._index ?? index) : false,
      gender: (icp as any).gender ?? (icp as any).avatar_gender ?? null,
      age_range: (icp as any).age_range ?? (icp as any).avatar_age_range ?? null,
    }));
  }, [rawICPs, subReady, userTier, trialActive, effectiveTier, isPro]);

  const canCreateICPFlag = canCreateICP(icps.length, effectiveTier as any);
  const canCreateCollectionFlag = canCreateCollection(collections.length, effectiveTier as any);
  const canCreateBrandFlag = canCreateBrand(brands.length, effectiveTier as any);

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

  const handleCreateBrand = async () => {
    if (!canCreateBrandFlag) {
      openPaywall();
      return;
    }
    if (!createBrand) {
      navigate("/my-brands");
      return;
    }
    setCreatingBrand(true);
    try {
      const uniqueName = getUniqueBrandName(
        "Untitled Brand",
        "New",
        (brands || []).map((b: any) => b?.name || "")
      );
      const created = await createBrand({ name: uniqueName } as any);
      await refetchBrands();
      if (created?.id) {
        navigate(`/my-brands/${created.id}`);
      } else {
        navigate("/my-brands");
      }
    } catch (err) {
      console.error("Dashboard: create brand error", err);
      navigate("/my-brands");
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleOpenColorModal = (collection: Collection) => {
    setEditingCollection(collection);
    setShowColorModal(true);
  };

  const handleOpenRenameModal = (collection: Collection) => {
    setEditingCollection(collection);
    setShowRenameModal(true);
  };

  const handleOpenDeleteModal = (collection: Collection) => {
    setEditingCollection(collection);
    setShowDeleteModal(true);
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
    await updateICP(icpId, { brand_id: brandId } as any);
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {}
  };

  // Refetch on global change events
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

    let cancelled = false;

    const loadMarktrResults = async () => {
      const [{ data: healthData }, { data: storyData }] = await Promise.all([
        supabase
          .from("health_check_results")
          .select("id, overall_score, scores")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("brand_story_results")
          .select("id, story_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setHealthCheck((healthData as HealthCheckRow | null) ?? null);
      setBrandStory((storyData as BrandStoryRow | null) ?? null);
    };

    void loadMarktrResults();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isLoading = authLoading || icpsLoading || collectionsLoading;
  const showEmptyIcps = hasLoadedOnce && !icpsLoading && rawICPs.length === 0;
  const showIcpPlaceholder = !hasLoadedOnce || icpsLoading;

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

  const healthScores = healthCheck?.scores as Record<string, unknown> | null | undefined;

  const metricCards = [
    {
      label: "Website",
      value: readDimensionScore(healthScores, "websiteClarity"),
      href: "/health-check",
    },
    {
      label: "Brand Story",
      value: readDimensionScore(healthScores, "brandStory"),
      href: "/story",
    },
    {
      label: "Content",
      value: readDimensionScore(healthScores, "contentConsistency"),
      href: "/health-check",
    },
    {
      label: "Social",
      value: readDimensionScore(healthScores, "socialPresence"),
      href: "/scheduling",
    },
  ];

  const setupProgress = useMemo(() => {
    let score = 0;
    const brand = brands?.[0];
    if (brand) {
      score += 20; // brand exists
      if (brand.founding_story?.trim()) score += 15;
      if (brand.voice_adjectives?.length) score += 10;
      if (brand.primary_goal?.trim()) score += 5;
    }
    if (icps && icps.length > 0) score += 30;
    if (icps && icps.length >= 2) score += 20;
    return Math.min(score, 100);
  }, [brands, icps]);

  const nextActions = useMemo(() => {
    const actions: {
      label: string;
      tag: string;
      desc: string;
      href: string;
    }[] = [];

    if (!healthCheck) {
      actions.push({
        label: "Check your digital health",
        tag: "HEALTH",
        desc: "See how your website and social presence scores today.",
        href: "/health-check",
      });
    }

    if (healthCheck && !brandStory) {
      actions.push({
        label: "Build your brand story",
        tag: "STORY",
        desc: "Turn your health check findings into a clear brand narrative.",
        href: "/story",
      });
    }

    if (!icps || icps.length === 0) {
      actions.push({
        label: "Define your ideal customer",
        tag: "ICP",
        desc: "Every strategy starts with knowing exactly who you serve.",
        href: "/onboarding-build",
      });
    }

    actions.push({
      label: "Connect Instagram",
      tag: "CONNECT",
      desc: "Link your account to enable real engagement data.",
      href: "/scheduling",
    });

    return actions.slice(0, 3);
  }, [healthCheck, brandStory, icps]);

  void [
    Button,
    ICPPreviewCard,
    DashboardCollectionCard,
    BrandCard,
    WifiOff,
    AlertCircle,
    exportBrandAsPDF,
    canExportBrand,
    icpsOffline,
    brandsLoading,
    deleteBrand,
    collectionsOffline,
    isSyncing,
    pendingCount,
    creatingBrand,
    canCreateCollectionFlag,
    handleUpgrade,
    handleCreateBrand,
    handleOpenColorModal,
    handleOpenRenameModal,
    handleOpenDeleteModal,
    handleOpenIcpColorModal,
    handleOpenIcpAvatarModal,
    handleMoveIcpToBrand,
    isLoading,
    showEmptyIcps,
    showIcpPlaceholder,
  ];

  // Debug logging and error display
  useEffect(() => {
    if (authLoading || icpsLoading || collectionsLoading || subLoading) {
      console.log("Dashboard loading states:", {
        authLoading,
        icpsLoading,
        collectionsLoading,
        subscriptionLoading: subLoading,
        hasUser: !!user,
        userId: user?.id,
        subReady,
      });
    }
  }, [authLoading, icpsLoading, collectionsLoading, subLoading, subReady, user]);

  console.log("Dashboard loading states:", {
    authLoading,
    icpsLoading,
    collectionsLoading,
    subscriptionLoading: subLoading,
    subReady,
    hasUser: !!user,
    hasICPs: icps.length > 0,
    hasCollections: collections.length > 0,
  });

  // Only block on auth loading or missing user; other data can be empty/fail softly.
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
        <div className="max-w-5xl space-y-8">
          {/* GREETING HEADER */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833]">
                {getGreeting()}
                {greetingName}.
              </h1>
              <p className="mt-1 font-['DM_Sans'] text-base text-muted-foreground">
                Here's where things stand today.
              </p>
            </div>
            <div className="hidden min-w-[180px] flex-col items-end gap-2 lg:flex">
              <span className="font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Setup progress
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: setupProgress + "%" }}
                />
              </div>
              <span className="font-['DM_Sans'] text-sm font-medium text-primary">{setupProgress}%</span>
            </div>
          </div>

          {/* METRIC CARDS */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metricCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => navigate(card.href)}
                className="rounded-xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
              >
                <p className="mb-2 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {card.label}
                </p>
                <p className="font-['Fraunces'] text-4xl font-bold leading-none text-primary">{card.value}</p>
                <p className="mt-1.5 font-['DM_Sans'] text-xs text-muted-foreground">score / 100</p>
              </button>
            ))}
          </div>

          {healthCheck && (
            <div className="rounded-xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Your Digital Health Score
                  </p>
                  <p className="mt-2 font-['Fraunces'] text-4xl font-bold text-primary">
                    {healthCheck.overall_score ?? "—"}
                    <span className="text-xl font-medium text-muted-foreground">/100</span>
                  </p>
                </div>
                <Link
                  to="/health-check"
                  className="font-['DM_Sans'] text-sm text-primary hover:underline"
                >
                  View full report →
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {metricCards.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => navigate(chip.href)}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-['DM_Sans'] text-xs text-primary transition-colors hover:border-primary/40"
                  >
                    {chip.label}: {chip.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WHAT TO DO NEXT */}
          <div>
            <p className="mb-4 font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              What to do next
            </p>
            <div className="space-y-3">
              {nextActions.map((action, i) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary font-['DM_Sans'] text-sm font-medium text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-['DM_Sans'] text-sm font-medium text-[#0D1833]">{action.label}</span>
                      <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        {action.tag}
                      </span>
                    </div>
                    <p className="font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">{action.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>

          {/* ICP STRIP */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-['DM_Sans'] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Your ICPs
              </p>
              <button
                type="button"
                onClick={() => navigate("/icps")}
                className="font-['DM_Sans'] text-sm text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-3 scroll-smooth">
                {icps?.slice(0, 3).map((icp) => (
                  <div
                    key={icp.id}
                    className="min-w-[200px] flex-shrink-0 cursor-pointer rounded-xl border border-border bg-white p-4 transition-colors hover:border-primary/40"
                    onClick={() => navigate("/icp/" + icp.id)}
                  >
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-full font-['DM_Sans'] text-sm font-bold text-white"
                      style={{ background: icp.color ?? "#E8650A" }}
                    >
                      {icp.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="line-clamp-2 font-['DM_Sans'] text-sm font-medium leading-snug text-[#0D1833]">
                      {icp.name}
                    </p>
                  </div>
                ))}
                {(!icps || icps.length === 0) && (
                  <div
                    onClick={() => navigate("/onboarding-build")}
                    className="flex min-w-[200px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white p-4 text-center transition-colors hover:border-primary/40"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <p className="font-['DM_Sans'] text-xs text-muted-foreground">Create your first ICP</p>
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-16 bg-gradient-to-l from-background to-transparent" />
            </div>
          </div>
        </div>
      </DashboardShell>

      <CollectionColorModal
        open={showColorModal}
        id={editingCollection?.id ?? null}
        currentColor={editingCollection?.color ?? null}
        onClose={() => setShowColorModal(false)}
        onSaved={async () => {
          setShowColorModal(false);
          await refetchCollections();
        }}
      />

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

      <CollectionRenameModal
        isOpen={showRenameModal}
        initialName={editingCollection?.name || ""}
        onClose={() => setShowRenameModal(false)}
        onConfirm={async (newName) => {
          if (!editingCollection?.id) return;
          const { error } = await supabase
            .from("collections")
            .update({ name: newName })
            .eq("id", editingCollection.id);

          if (error) {
            console.error("Dashboard: Rename failed", error);
          } else {
            await refetchCollections();
          }
          setShowRenameModal(false);
        }}
      />

      <CollectionDeleteModal
        isOpen={showDeleteModal}
        collectionName={editingCollection?.name || ""}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          if (!editingCollection?.id) return;
          const { error } = await supabase.from("collections").delete().eq("id", editingCollection.id);
          if (error) {
            console.error("Dashboard: Failed to delete collection", error);
          } else {
            await refetchCollections();
          }
          setShowDeleteModal(false);
        }}
      />
    </>
  );
}
