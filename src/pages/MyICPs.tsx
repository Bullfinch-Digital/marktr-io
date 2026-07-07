import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ICPPreviewCard } from "../components/cards/ICPPreviewCard";
import ICPColorModal from "../components/ICPColorModal";
import ICPAvatarModal from "../components/ICPAvatarModal";
import { CollectionPickerModal } from "../components/modals/CollectionPickerModal";
import { useICPs } from "../hooks/useICPs";
import { useBrands } from "../hooks/useBrands";
import { useCollections } from "../hooks/useCollections";
import useSubscription from "../hooks/useSubscription";
import { useOutboxSync } from "../hooks/useOutboxSync";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { usePaywall } from "../contexts/PaywallContext";
import { seedExampleICPs } from "../utils/seedExampleICPs";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { fetchArchivedIcpsForBrand, type ArchivedIcpRow } from "../lib/icpVersioning";
import { Search, Plus, Sparkles, WifiOff, AlertCircle, Archive, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { canViewICP, canCreateICP } from "../config/accessRules";
import DashboardShell from "../layouts/DashboardShell";

function formatArchivedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyICPsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
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
  const [addToCollectionLineageId, setAddToCollectionLineageId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedRows, setArchivedRows] = useState<ArchivedIcpRow[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [restoringLineageId, setRestoringLineageId] = useState<string | null>(null);
  const [restoreNudge, setRestoreNudge] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { icps: rawICPs, isLoading: icpsLoading, fetchICPs, isOffline: icpsOffline, updateICP, restoreICP } = useICPs();
  const { brands } = useBrands();
  const { activeBrandId, loading: brandLoading } = useBrand();
  const { addICPToCollection, createCollection } = useCollections();
  const { tier: userTier, effectiveTier, trialActive, isLoading: subscriptionLoading } = useSubscription();
  const { isSyncing, pendingCount } = useOutboxSync();
  const { openPaywall } = usePaywall();

  const scopedBrandId = useMemo(
    () => resolveScopedBrandId(activeBrandId, brands || []),
    [activeBrandId, brands]
  );

  const loadArchived = useCallback(async () => {
    if (!user?.id || !scopedBrandId) {
      setArchivedRows([]);
      return;
    }
    setArchivedLoading(true);
    try {
      const rows = await fetchArchivedIcpsForBrand(user.id, scopedBrandId);
      setArchivedRows(rows);
    } catch (err) {
      console.error("[MyICPs] archived fetch failed", err);
      setArchivedRows([]);
    } finally {
      setArchivedLoading(false);
    }
  }, [user?.id, scopedBrandId]);

  const refreshRoster = useCallback(async () => {
    await fetchICPs(true);
    await loadArchived();
  }, [fetchICPs, loadArchived]);

  useEffect(() => {
    if (!isBrandScopeReady(brandLoading, brands || [], scopedBrandId)) return;
    void loadArchived();
  }, [loadArchived, brandLoading, brands, scopedBrandId]);

  useEffect(() => {
    const onChanged = () => {
      void loadArchived();
    };
    window.addEventListener("icps:changed", onChanged);
    return () => window.removeEventListener("icps:changed", onChanged);
  }, [loadArchived]);

  const handleRestoreArchived = async (lineageId: string) => {
    setRestoringLineageId(lineageId);
    setRestoreNudge(null);
    try {
      const result = await restoreICP(lineageId);
      if (result.nudge) setRestoreNudge(result.nudge);
      if (result.ok) {
        await loadArchived();
        try {
          window.dispatchEvent(new Event("icps:changed"));
        } catch {}
      }
    } finally {
      setRestoringLineageId(null);
    }
  };

  const brandNameById = useMemo(() => {
    const map = new Map<string, string>();
    (brands || []).forEach((b: any) => {
      if (b?.id) map.set(b.id, b.name || "Untitled Brand");
    });
    return map;
  }, [brands]);

  const icps = useMemo(() => {
    return rawICPs.map((icp, index) => ({
      ...icp,
      _index: icp._index ?? index,
      tags: icp.tags || [],
      isLocked: !canViewICP(effectiveTier as any, icp._index ?? index),
      gender: (icp as any).gender ?? (icp as any).avatar_gender ?? null,
      age_range: (icp as any).age_range ?? (icp as any).avatar_age_range ?? null,
      brandName:
        (icp as any).brand_id ? brandNameById.get((icp as any).brand_id) || null : null,
    }));
  }, [rawICPs, userTier, effectiveTier, brandNameById]);

  const handleCreateNew = () => {
    const canCreate = canCreateICP(icps.length, effectiveTier as any);
    if (!canCreate) {
      openPaywall();
      return;
    }
    navigate("/onboarding-build");
  };

  const handleSeedExamples = async () => {
    if (!user?.id) return;
    setIsSeeding(true);
    try {
      await seedExampleICPs(user.id, activeBrandId);
      await fetchICPs();
    } catch (error) {
      console.error("Error seeding example ICPs:", error);
      alert("Failed to load example ICPs. Please try again.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpgrade = () => openPaywall();

  const handleMoveIcpToBrand = async (icpId: string, brandId: string | null) => {
    await updateICP(icpId, { brand_id: brandId } as any);
    try {
      window.dispatchEvent(new Event("icps:changed"));
    } catch {}
    await fetchICPs(true);
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

  const filteredICPs = icps.filter((icp) =>
    icp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    icp.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    icp.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showEmptyState = !authLoading && !icpsLoading && icps.length === 0;
  const isLoading = authLoading || icpsLoading || subscriptionLoading;

  useEffect(() => {
    if (authLoading || icpsLoading || subscriptionLoading) {
      console.log("MyICPs loading states", {
        authLoading,
        icpsLoading,
        subscriptionLoading,
        hasUser: !!user,
        icpCount: icps.length,
      });
    }
  }, [authLoading, icpsLoading, subscriptionLoading, user, icps.length]);

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
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {pendingCount > 0 && (
            <div className={`mb-4 px-4 py-3 rounded-design border border-black flex items-center gap-2 ${
              isSyncing
                ? "bg-amber-50 text-amber-800"
                : icpsOffline
                ? "bg-red-50 text-red-800"
                : "bg-green-50 text-green-800"
            }`}>
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Syncing changes...</span>
                </>
              ) : icpsOffline ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Some changes pending sync ({pendingCount})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">All changes synced</span>
                </>
              )}
            </div>
          )}

          {(icpsOffline) && !isLoading && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-design p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-['Inter']">
                  We're having trouble syncing with the server. Your ICPs are saved locally and will sync automatically when the connection is restored.
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-button-green border-t-transparent rounded-full animate-spin" />
                <p className="text-foreground/70 mb-2">Loading...</p>
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="font-['Fraunces'] text-3xl lg:text-4xl mb-2">My ICPs</h1>
                  <p className="font-['Inter'] text-foreground/70">{icps.length} ICPs created</p>
                </div>

                <Button
                  onClick={handleCreateNew}
                  className="hidden sm:flex bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-5 transition-all hover:scale-[1.02] hover:shadow-md items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create New ICP</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>

              {icps.length > 0 && (
                <div className="relative max-w-md mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                  <Input
                    type="text"
                    placeholder="Search ICPs by name, description, or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-black rounded-design font-['Inter']"
                  />
                </div>
              )}
            </div>
          )}

          {!isLoading && showEmptyState && (
            <div className="flex items-center justify-center min-h-[500px] animate-fade-in-up">
              <div className="text-center max-w-lg px-6">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-[#BBA0E5] to-[#FFD336] rounded-full border-2 border-black flex items-center justify-center shadow-lg">
                  <Sparkles className="w-16 h-16 text-background" />
                </div>
                <h2 className="font-['Fraunces'] text-3xl mb-4">Create your first ICP</h2>
                <p className="font-['Inter'] text-foreground/70 text-lg mb-8">
                  Start with AI-powered guidance to build detailed customer personas that drive your marketing strategy.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={handleCreateNew}
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Generate New ICP
                  </Button>
                  <Button
                    onClick={handleSeedExamples}
                    disabled={isSeeding}
                    variant="outline"
                    className="border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg flex items-center gap-2"
                  >
                    {isSeeding ? (
                      <>
                        <div className="w-5 h-5 border-2 border-button-green border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Load Example ICPs
                      </>
                    )}
                  </Button>
                </div>
                <p className="font-['Inter'] text-sm text-foreground/50 mt-6">
                  Generate takes about 2 minutes • Examples are ready instantly
                </p>
              </div>
            </div>
          )}

          {!isLoading && !showEmptyState && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredICPs.map((icp) => (
                <ICPPreviewCard
                  key={icp.id}
                  icp={icp}
                      userTier={effectiveTier}
                      onUpgrade={handleUpgrade}
                      isLocked={!canViewICP(effectiveTier as any, icp._index ?? 0)}
                  onChangeColor={handleOpenIcpColorModal}
                  onChangeAvatar={handleOpenIcpAvatarModal}
                  brands={brands?.map((b) => ({ id: b.id, name: b.name })) || []}
                  onMoveToBrand={handleMoveIcpToBrand}
                  onDelete={refreshRoster}
                  onAddToCollection={() => {
                    if (icp.lineage_id) setAddToCollectionLineageId(icp.lineage_id);
                  }}
                />
              ))}
            </div>
          )}

          {!isLoading && scopedBrandId && (
            <div className="mt-10 border-t border-black/10 pt-6">
              <button
                type="button"
                onClick={() => setArchivedOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80 transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                Archived
                {archivedRows.length > 0 ? ` (${archivedRows.length})` : ""}
                {archivedOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {restoreNudge && (
                <p className="mt-3 font-['Inter'] text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-design px-3 py-2 max-w-2xl">
                  {restoreNudge}
                </p>
              )}

              {archivedOpen && (
                <div className="mt-4 rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3">
                  {archivedLoading ? (
                    <p className="font-['Inter'] text-xs text-foreground/50">Loading archived profiles…</p>
                  ) : archivedRows.length === 0 ? (
                    <p className="font-['Inter'] text-xs text-foreground/50">Nothing archived.</p>
                  ) : (
                    <ul className="space-y-3">
                      {archivedRows.map((row) => (
                        <li
                          key={row.lineage_id}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-['Inter'] text-sm text-foreground truncate">
                              {row.name || "Untitled profile"}
                            </p>
                            {row.deleted_at && (
                              <p className="font-['Inter'] text-xs text-foreground/50">
                                Archived {formatArchivedDate(row.deleted_at)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={restoringLineageId === row.lineage_id}
                            onClick={() => void handleRestoreArchived(row.lineage_id)}
                            className="border-black rounded-design font-['Inter'] text-xs h-8 px-3 gap-1.5"
                          >
                            {restoringLineageId === row.lineage_id ? (
                              <span className="w-3.5 h-3.5 border-2 border-foreground/40 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLoading && userTier === "free" && !trialActive && icps.length >= 1 && (
            <div className="mt-12 text-center animate-fade-in-up">
              <div className="bg-accent-grey/30 border border-black rounded-design p-8 max-w-2xl mx-auto">
                <h3 className="font-['Fraunces'] text-xl mb-3">You've reached your free ICP limit</h3>
                <p className="font-['Inter'] text-foreground/70 mb-6">
                  Unlock unlimited ICPs, full data exports, and advanced features.
                </p>
                <Button
                  onClick={handleUpgrade}
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-8 py-6 transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  Upgrade to unlock unlimited ICPs
                </Button>
              </div>
            </div>
          )}
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
          if (ok) setAddToCollectionLineageId(null);
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
