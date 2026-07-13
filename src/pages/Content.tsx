import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { useBrand } from "../contexts/BrandContext";
import { useContentItems, type ContentItemWithComposition } from "../hooks/useContentItems";
import { useBrandStrategies } from "../hooks/useBrandStrategies";
import { useBrandAims } from "../hooks/useBrandAims";
import { useICPs } from "../hooks/useICPs";
import { isBrandScopeReady, resolveScopedBrandId } from "../lib/brandScopedReads";
import {
  readContentLauncherIntent,
  type ContentLauncherIntent,
} from "../lib/contentLauncherState";
import { CONTENT_ITEM_TYPES, type ContentItemType } from "../types/contentItemPayload";
import { CONTENT_TYPE_LABELS } from "../lib/contentTypeLabels";
import { ContentRosterCard } from "../components/content/ContentRosterCard";
import { ContentCompositionBanner } from "../components/content/ContentCompositionBanner";
import { ContentItemView } from "../components/content/ContentItemView";
import ContentArchiveModal from "../components/content/ContentArchiveModal";
import ContentPermanentDeleteModal from "../components/content/ContentPermanentDeleteModal";
import {
  ContentCreatePanel,
  type ContentCreateStrategyOption,
} from "../components/content/ContentCreatePanel";
import { exportContentListAsCSV } from "../utils/exportContent";

function formatArchivedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ContentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeBrandId, brands, loading: brandLoading, setActiveBrand, activeBrand } = useBrand();
  const scopedBrandId = useMemo(
    () => resolveScopedBrandId(activeBrandId, brands || []),
    [activeBrandId, brands]
  );

  const {
    items,
    archivedItems,
    isLoading,
    error,
    createContent,
    duplicateContent,
    archiveContent,
    restoreContent,
    hardDeleteContent,
  } = useContentItems(scopedBrandId || "");

  const { strategies, createStrategy, updateStrategy } = useBrandStrategies(scopedBrandId || "");
  const { aims } = useBrandAims(scopedBrandId ?? undefined);
  const { icps } = useICPs();
  const brandIcps = useMemo(
    () => (icps || []).filter((icp) => icp.brand_id === scopedBrandId),
    [icps, scopedBrandId]
  );

  const launcherIntentRef = useRef<ContentLauncherIntent | null>(null);
  const [launcherIntent, setLauncherIntent] = useState<ContentLauncherIntent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createPanelKey, setCreatePanelKey] = useState(0);

  const [filterStrategy, setFilterStrategy] = useState("");
  const [filterIdea, setFilterIdea] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ContentItemWithComposition | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    useState<ContentItemWithComposition | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);

  const brandReady = isBrandScopeReady(brandLoading, brands || [], scopedBrandId);

  useEffect(() => {
    const intent = readContentLauncherIntent(location.state);
    if (!intent) return;
    launcherIntentRef.current = intent;
    setLauncherIntent(intent);
    if (intent.brandId) setActiveBrand(intent.brandId);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, setActiveBrand]);

  useEffect(() => {
    if (!brandReady || !scopedBrandId) return;
    const intent = launcherIntentRef.current;
    if (!intent) return;
    if (intent.brandId && intent.brandId !== scopedBrandId) return;
    setShowCreate(true);
    setCreatePanelKey((k) => k + 1);
  }, [brandReady, scopedBrandId, launcherIntent, strategies.length]);

  const openCreate = () => {
    setLauncherIntent(null);
    launcherIntentRef.current = null;
    setShowCreate(true);
    setCreatePanelKey((k) => k + 1);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setLauncherIntent(null);
    launcherIntentRef.current = null;
  };

  const strategyOptions: ContentCreateStrategyOption[] = useMemo(
    () =>
      strategies.map((s) => ({
        id: s.id,
        lineage_id: s.lineage_id,
        title: s.title,
        strategy: s.strategy,
        icps: s.icps,
      })),
    [strategies]
  );

  const strategyFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.strategy_lineage_id, item.composition.strategy.title);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [items]);

  const ideaFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.campaign_idea_id) {
        map.set(item.campaign_idea_id, item.composition.campaignIdea.name);
      } else {
        map.set("__strategy_level__", "Strategy-level");
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStrategy && item.strategy_lineage_id !== filterStrategy) return false;
      if (filterIdea === "__strategy_level__") {
        if (item.campaign_idea_id) return false;
      } else if (filterIdea && item.campaign_idea_id !== filterIdea) {
        return false;
      }
      if (filterType && item.type !== filterType) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterStrategy, filterIdea, filterType, filterStatus]);

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await archiveContent(archiveTarget.lineage_id);
      setArchiveTarget(null);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDuplicate = async (item: ContentItemWithComposition) => {
    setDuplicatingId(item.id);
    try {
      const created = await duplicateContent(item.id);
      if (created?.id) navigate(`/content/${created.id}`);
    } catch (err) {
      console.error("[Content] duplicate failed", err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsPermanentDeleting(true);
    try {
      await hardDeleteContent(permanentDeleteTarget.lineage_id);
      setPermanentDeleteTarget(null);
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  if (!brandReady) {
    return (
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        <p className="font-['Inter'] text-sm text-foreground/60">Loading…</p>
      </DashboardShell>
    );
  }

  if (!scopedBrandId) {
    return (
      <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
        <div className="max-w-xl">
          <h1 className="font-['Fraunces'] text-3xl text-[#0D1833]">Content</h1>
          <p className="font-['Inter'] text-sm text-foreground/70 mt-3">
            Choose a brand to manage content.{" "}
            <Link to="/my-brands" className="underline underline-offset-2">
              Go to brands
            </Link>
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-['Fraunces'] text-3xl lg:text-4xl text-[#0D1833]">Content</h1>
            <p className="font-['Inter'] text-sm text-foreground/65 mt-2 max-w-xl">
              Pieces your strategy calls for — written for one persona at a time, ready to film
              on a phone.
            </p>
          </div>
          {!showCreate ? (
            <Button
              type="button"
              onClick={openCreate}
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design gap-2"
            >
              <Plus className="h-4 w-4" />
              Create content
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="font-['Inter'] text-sm text-red-700 bg-red-50 border border-red-200 rounded-design px-3 py-2">
            {error}
          </p>
        ) : null}

        {showCreate ? (
          <ContentCreatePanel
            key={createPanelKey}
            brandId={scopedBrandId}
            strategies={strategyOptions}
            initialIntent={launcherIntent}
            onGenerate={async (input) => createContent(input)}
            onClose={closeCreate}
            onGenerated={(record) => {
              closeCreate();
              if (record?.id) navigate(`/content/${record.id}`);
            }}
            strategyCreate={
              aims.length > 0 && brandIcps.length > 0
                ? {
                    aims,
                    icps: brandIcps,
                    brand: activeBrand,
                    onGenerate: createStrategy,
                  }
                : null
            }
            onAddCampaignIdea={async (strategyId, nextStrategy) =>
              updateStrategy(strategyId, { strategy: nextStrategy })
            }
          />
        ) : null}

        {isLoading ? (
          <p className="font-['Inter'] text-sm text-foreground/60">Loading content…</p>
        ) : items.length === 0 && !showCreate ? (
          <div className="rounded-design border border-dashed border-black/20 bg-accent-grey/10 px-6 py-12 text-center">
            <FileText className="h-8 w-8 text-foreground/35 mx-auto mb-3" />
            <h2 className="font-['Fraunces'] text-xl text-[#0D1833]">
              Content comes from a strategy
            </h2>
            <p className="font-['Inter'] text-sm text-foreground/65 mt-2 max-w-md mx-auto">
              Pick a strategy and we&apos;ll show you what to make — or create a piece freehand.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/strategy"
                className="inline-flex items-center h-10 px-4 rounded-design border border-black font-['Inter'] text-sm hover:bg-accent-grey/30"
              >
                Go to Strategy
              </Link>
              <Button
                type="button"
                onClick={openCreate}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
              >
                Create content
              </Button>
            </div>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2 items-end">
              <label className="space-y-1">
                <span className="font-['Inter'] text-[10px] uppercase tracking-wide text-foreground/45">
                  Strategy
                </span>
                <select
                  value={filterStrategy}
                  onChange={(e) => setFilterStrategy(e.target.value)}
                  className="block h-9 rounded-design border border-black/20 bg-white px-2 font-['Inter'] text-xs"
                >
                  <option value="">All</option>
                  {strategyFilterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-['Inter'] text-[10px] uppercase tracking-wide text-foreground/45">
                  Campaign idea
                </span>
                <select
                  value={filterIdea}
                  onChange={(e) => setFilterIdea(e.target.value)}
                  className="block h-9 rounded-design border border-black/20 bg-white px-2 font-['Inter'] text-xs"
                >
                  <option value="">All</option>
                  {ideaFilterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-['Inter'] text-[10px] uppercase tracking-wide text-foreground/45">
                  Type
                </span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="block h-9 rounded-design border border-black/20 bg-white px-2 font-['Inter'] text-xs"
                >
                  <option value="">All</option>
                  {CONTENT_ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CONTENT_TYPE_LABELS[type as ContentItemType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-['Inter'] text-[10px] uppercase tracking-wide text-foreground/45">
                  Status
                </span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block h-9 rounded-design border border-black/20 bg-white px-2 font-['Inter'] text-xs"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </label>
              </div>
              {filteredItems.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-black rounded-design h-9"
                  onClick={() => exportContentListAsCSV(filteredItems)}
                >
                  Export CSV
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <ContentRosterCard
                  key={item.id}
                  item={item}
                  onArchive={() => setArchiveTarget(item)}
                  onDuplicate={() => void handleDuplicate(item)}
                  duplicating={duplicatingId === item.id}
                />
              ))}
              {filteredItems.length === 0 ? (
                <p className="font-['Inter'] text-sm text-foreground/55">
                  No pieces match these filters.
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {archivedItems.length > 0 ? (
          <div className="border-t border-black/10 pt-6">
            <button
              type="button"
              onClick={() => setArchivedOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 font-['Inter'] text-sm text-foreground/60 hover:text-foreground/80"
            >
              <Archive className="h-4 w-4" />
              Archived ({archivedItems.length})
              {archivedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {archivedOpen ? (
              <div className="mt-4 space-y-4">
                {archivedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-design border border-black/10 bg-accent-grey/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-['Fraunces'] text-lg text-[#0D1833] truncate">
                          {item.title}
                        </h3>
                        <p className="font-['Inter'] text-xs text-foreground/50 mt-1">
                          {CONTENT_TYPE_LABELS[item.type]} · archived{" "}
                          {formatArchivedDate(item.deleted_at || item.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-black rounded-design gap-1"
                          onClick={() => navigate(`/content/${item.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-black rounded-design gap-1"
                          onClick={() => void restoreContent(item.lineage_id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-800 rounded-design gap-1"
                          onClick={() => setPermanentDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete permanently
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <ContentCompositionBanner composition={item.composition} compact />
                    </div>
                    <div className="mt-3 border-t border-black/10 pt-3">
                      <ContentItemView type={item.type} content={item.content} compact />
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ContentArchiveModal
        isOpen={!!archiveTarget}
        isArchiving={isArchiving}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
      />
      <ContentPermanentDeleteModal
        isOpen={!!permanentDeleteTarget}
        contentTitle={permanentDeleteTarget?.title ?? ""}
        isDeleting={isPermanentDeleting}
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </DashboardShell>
  );
}
