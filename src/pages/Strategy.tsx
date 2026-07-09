import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { useBrand } from "../contexts/BrandContext";
import { useICPs } from "../hooks/useICPs";
import { useBrandAims } from "../hooks/useBrandAims";
import { useBrandStrategies, type StrategyWithLinks } from "../hooks/useBrandStrategies";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import { compositionHasArchivedLinks } from "../lib/strategyComposition";
import { StrategyAimsSection } from "../components/strategy/StrategyAimsSection";
import { StrategyCreatePanel } from "../components/strategy/StrategyCreatePanel";
import { StrategyRosterCard } from "../components/strategy/StrategyRosterCard";
import { StrategyContentView } from "../components/strategy/StrategyContentView";
import { StrategyCompositionBanner } from "../components/strategy/StrategyCompositionBanner";
import StrategyArchiveModal from "../components/strategy/StrategyArchiveModal";
import StrategyPermanentDeleteModal from "../components/strategy/StrategyPermanentDeleteModal";

function formatArchivedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StrategyPage() {
  const { activeBrandId, brands, loading: brandLoading } = useBrand();
  const scopedBrandId = useMemo(
    () => resolveScopedBrandId(activeBrandId, brands || []),
    [activeBrandId, brands]
  );
  const activeBrandName = useMemo(
    () => (brands || []).find((b) => b.id === scopedBrandId)?.name ?? "your brand",
    [brands, scopedBrandId]
  );

  const { aims, isLoading: aimsLoading } = useBrandAims(scopedBrandId ?? undefined);
  const { icps } = useICPs();
  const brandIcps = useMemo(
    () => (icps || []).filter((icp) => icp.brand_id === scopedBrandId),
    [icps, scopedBrandId]
  );

  const {
    strategies,
    archivedStrategies,
    isLoading: strategiesLoading,
    error,
    createStrategy,
    archiveStrategy,
    restoreStrategy,
    hardDeleteStrategy,
  } = useBrandStrategies(scopedBrandId || "");

  const [showCreate, setShowCreate] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedSnapshotLineageId, setArchivedSnapshotLineageId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StrategyWithLinks | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [restoringLineageId, setRestoringLineageId] = useState<string | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<StrategyWithLinks | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [restoreNudge, setRestoreNudge] = useState<string | null>(null);

  const brandReady = isBrandScopeReady(brandLoading, brands || [], scopedBrandId);
  const isLoading = !brandReady || aimsLoading || strategiesLoading;

  useEffect(() => {
    if (!restoreNudge) return;
    const timer = window.setTimeout(() => setRestoreNudge(null), 8000);
    return () => window.clearTimeout(timer);
  }, [restoreNudge]);

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await archiveStrategy(archiveTarget.lineage_id);
      setArchiveTarget(null);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreArchived = async (strategy: StrategyWithLinks) => {
    setRestoringLineageId(strategy.lineage_id);
    try {
      await restoreStrategy(strategy.lineage_id);
      if (compositionHasArchivedLinks(strategy.aims, strategy.icps)) {
        setRestoreNudge(
          `"${strategy.title}" was restored. It still targets archived aims or personas — review it when you're ready.`
        );
      }
      setArchivedSnapshotLineageId(null);
    } finally {
      setRestoringLineageId(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsPermanentDeleting(true);
    try {
      await hardDeleteStrategy(permanentDeleteTarget.lineage_id);
      setPermanentDeleteTarget(null);
      setArchivedSnapshotLineageId(null);
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8 pb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-foreground/55 mb-2">
              <Target className="h-4 w-4" />
              <span className="font-['Inter'] text-xs uppercase tracking-wide">Strategy</span>
            </div>
            <h1 className="font-['Fraunces'] text-4xl font-bold text-[#0D1833]">Strategy</h1>
            <p className="font-['Inter'] text-sm text-foreground/70 mt-2 max-w-2xl">
              Aims and marketing strategies for <strong>{activeBrandName}</strong>. Generate once,
              then refine through edits and version history.
            </p>
          </div>
          {scopedBrandId && !showCreate ? (
            <Button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design gap-2"
            >
              <Plus className="h-4 w-4" />
              New strategy
            </Button>
          ) : null}
        </div>

        {!brandReady ? (
          <p className="font-['Inter'] text-sm text-foreground/60">Loading brand context…</p>
        ) : !scopedBrandId ? (
          <div className="rounded-design border border-black/15 bg-accent-grey/20 p-6">
            <p className="font-['Inter'] text-sm text-foreground/70">
              Select a brand from the header to manage aims and strategies.
            </p>
            <Link to="/my-brands" className="inline-block mt-3 font-['Inter'] text-sm text-primary underline">
              Go to Brands →
            </Link>
          </div>
        ) : (
          <>
            <StrategyAimsSection brandId={scopedBrandId} />

            <section className="space-y-5">
              <div>
                <h2 className="font-['Fraunces'] text-2xl text-[#0D1833]">Strategies</h2>
                <p className="font-['Inter'] text-sm text-foreground/70 mt-1">
                  Current strategies for this brand. Each shows which aims and personas it serves.
                </p>
              </div>

              {showCreate ? (
                <StrategyCreatePanel
                  aims={aims}
                  icps={brandIcps}
                  onGenerate={createStrategy}
                  onClose={() => setShowCreate(false)}
                />
              ) : null}

              {error ? <p className="font-['Inter'] text-sm text-red-700">{error}</p> : null}

              {isLoading ? (
                <p className="font-['Inter'] text-sm text-foreground/60">Loading strategies…</p>
              ) : strategies.length === 0 ? (
                <div className="rounded-design border border-black/15 bg-accent-grey/15 p-6 text-center">
                  <p className="font-['Inter'] text-sm text-foreground/70">
                    No strategies yet. Add aims above, then generate your first strategy.
                  </p>
                  {!showCreate ? (
                    <Button
                      type="button"
                      className="mt-4 bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
                      onClick={() => setShowCreate(true)}
                      disabled={aims.length === 0 || brandIcps.length === 0}
                    >
                      New strategy
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {strategies.map((strategy) => (
                    <StrategyRosterCard
                      key={strategy.id}
                      strategy={strategy}
                      onArchive={() => setArchiveTarget(strategy)}
                    />
                  ))}
                </div>
              )}

              <div className="border-t border-black/10 pt-6">
                <button
                  type="button"
                  onClick={() => setArchivedOpen((open) => !open)}
                  className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80 transition-colors"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archived
                  {archivedStrategies.length > 0 ? ` (${archivedStrategies.length})` : ""}
                  {archivedOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {restoreNudge ? (
                  <p className="mt-3 font-['Inter'] text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-design px-3 py-2 max-w-2xl">
                    {restoreNudge}
                  </p>
                ) : null}

                {archivedOpen ? (
                  <div className="mt-4 rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3">
                    {archivedStrategies.length === 0 ? (
                      <p className="font-['Inter'] text-xs text-foreground/50">Nothing archived.</p>
                    ) : (
                      <ul className="space-y-4">
                        {archivedStrategies.map((strategy) => {
                          const snapshotOpen = archivedSnapshotLineageId === strategy.lineage_id;
                          return (
                            <li
                              key={strategy.lineage_id}
                              className="border-b border-black/10 pb-4 last:border-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <Link
                                    to={`/strategy/${strategy.id}`}
                                    className="font-['Inter'] text-sm text-foreground truncate hover:underline block"
                                  >
                                    {strategy.title}
                                  </Link>
                                  {strategy.deleted_at ? (
                                    <p className="font-['Inter'] text-xs text-foreground/50">
                                      Archived {formatArchivedDate(strategy.deleted_at)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-black rounded-design font-['Inter'] text-xs h-8"
                                    onClick={() =>
                                      setArchivedSnapshotLineageId(
                                        snapshotOpen ? null : strategy.lineage_id
                                      )
                                    }
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    {snapshotOpen ? "Hide" : "View"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      restoringLineageId === strategy.lineage_id || isPermanentDeleting
                                    }
                                    onClick={() => void handleRestoreArchived(strategy)}
                                    className="border-black rounded-design font-['Inter'] text-xs h-8"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    {restoringLineageId === strategy.lineage_id
                                      ? "Restoring…"
                                      : "Restore"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      restoringLineageId === strategy.lineage_id || isPermanentDeleting
                                    }
                                    onClick={() => setPermanentDeleteTarget(strategy)}
                                    className="border-red-300 text-red-700 hover:bg-red-50 rounded-design font-['Inter'] text-xs h-8"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Delete permanently
                                  </Button>
                                </div>
                              </div>

                              {snapshotOpen ? (
                                <div className="mt-4 space-y-4 rounded-design border border-black/10 bg-white/80 p-4">
                                  <StrategyContentView strategy={strategy.strategy} />
                                  <StrategyCompositionBanner
                                    aims={strategy.aims}
                                    icps={strategy.icps}
                                  />
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>

      <StrategyArchiveModal
        isOpen={!!archiveTarget}
        isArchiving={isArchiving}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
      />

      <StrategyPermanentDeleteModal
        isOpen={!!permanentDeleteTarget}
        strategyTitle={permanentDeleteTarget?.title ?? ""}
        isDeleting={isPermanentDeleting}
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </DashboardShell>
  );
}
