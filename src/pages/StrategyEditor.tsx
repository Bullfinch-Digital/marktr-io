import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import type { ICPStrategyPayload } from "../types/icpStrategyPayload";
import {
  useBrandStrategies,
  type StrategyRow,
  type StrategyWithLinks,
} from "../hooks/useBrandStrategies";
import {
  fetchCompositionForStrategyLineage,
  type CompositionAim,
  type CompositionIcp,
} from "../lib/strategyComposition";
import { subscribeStrategyCompositionStale } from "../lib/strategyEvents";
import {
  applyStrategySectionSnapshot,
  captureStrategySectionSnapshot,
  getStagedStrategySections,
  normalizeStrategyPayload,
  serializeStrategyDraft,
  type StrategySectionId,
  type StrategySectionSnapshot,
} from "../lib/strategyEditPayload";
import { StrategyCompositionBanner } from "../components/strategy/StrategyCompositionBanner";
import { StrategyEditableDocument } from "../components/strategy/StrategyEditableDocument";
import { StrategyVersionHistorySection } from "../components/strategy/StrategyVersionHistorySection";
import StrategyArchiveModal from "../components/strategy/StrategyArchiveModal";
import StrategyPermanentDeleteModal from "../components/strategy/StrategyPermanentDeleteModal";
import { StrategySuggestedContentChecklist } from "../components/strategy/StrategySuggestedContentChecklist";
import { ArchiveActionTooltip } from "../components/ArchiveActionTooltip";
import { exportStrategyAsPDF } from "../utils/exportStrategy";
import "../styles/Modal.css";

type StrategyDetail = StrategyRow & {
  aims: CompositionAim[];
  icps: CompositionIcp[];
};

async function loadStrategyDetail(
  userId: string,
  strategyId: string
): Promise<StrategyDetail | null> {
  const { data: row, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", userId)
    .eq("id", strategyId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const strategyRow = row as StrategyRow;
  const { aims, icps } = await fetchCompositionForStrategyLineage(userId, strategyRow.lineage_id);
  return { ...strategyRow, aims, icps };
}

export default function StrategyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStrategy, setDraftStrategy] = useState<ICPStrategyPayload | null>(null);
  const [activeSection, setActiveSection] = useState<StrategySectionId | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const editBaselineRef = useRef<string | null>(null);
  const sectionSnapshotRef = useRef<StrategySectionSnapshot | null>(null);

  const brandId = strategy?.brand_id ?? "";
  const { updateStrategy, archiveStrategy, hardDeleteStrategy } = useBrandStrategies(brandId);

  const resetEditDraft = useCallback((detail: StrategyDetail) => {
    const normalized = normalizeStrategyPayload(detail.strategy);
    setDraftTitle(detail.title);
    setDraftStrategy(normalized);
    editBaselineRef.current = serializeStrategyDraft(detail.title, normalized);
    setIsDirty(false);
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  }, []);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await loadStrategyDetail(user.id, id);
      if (!detail) {
        setError("Strategy not found.");
        setStrategy(null);
        return;
      }
      if (detail.superseded_at) {
        const { data: current } = await supabase
          .from("strategies")
          .select("id")
          .eq("user_id", user.id)
          .eq("lineage_id", detail.lineage_id)
          .is("superseded_at", null)
          .is("deleted_at", null)
          .maybeSingle();
        if (current?.id && current.id !== id) {
          navigate(`/strategy/${current.id}`, { replace: true });
          return;
        }
      }
      setStrategy(detail);
    } catch (err) {
      console.error("[StrategyEditor] load failed", err);
      setError("Failed to load strategy.");
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!strategy) return;
    resetEditDraft(strategy);
  }, [strategy?.id, strategy?.version, resetEditDraft]);

  useEffect(() => {
    if (!user?.id || !strategy?.lineage_id) return;
    const lineageId = strategy.lineage_id;

    const refreshComposition = async () => {
      try {
        const { aims, icps } = await fetchCompositionForStrategyLineage(user.id, lineageId);
        setStrategy((prev) =>
          prev && prev.lineage_id === lineageId ? { ...prev, aims, icps } : prev
        );
      } catch (err) {
        console.error("[StrategyEditor] composition refresh failed", err);
      }
    };

    return subscribeStrategyCompositionStale(() => void refreshComposition());
  }, [user?.id, strategy?.lineage_id]);

  useEffect(() => {
    if (!draftStrategy || !editBaselineRef.current || !strategy) {
      setIsDirty(false);
      return;
    }
    const current = serializeStrategyDraft(draftTitle, draftStrategy);
    setIsDirty(current !== editBaselineRef.current);
  }, [draftTitle, draftStrategy, strategy]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const onClickCapture = (e: MouseEvent) => {
      if (!isDirty) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-allow-navigation='true']")) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) return;

      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = nextPath;
      setLeaveDialogOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  const isArchived = !!strategy?.deleted_at;
  const readOnly = isArchived;

  const savedTitle = strategy?.title ?? "";
  const savedStrategy = useMemo(
    () => (strategy ? normalizeStrategyPayload(strategy.strategy) : null),
    [strategy]
  );

  const stagedSections = useMemo(() => {
    if (!savedStrategy || !draftStrategy) return [];
    return getStagedStrategySections(savedTitle, savedStrategy, draftTitle, draftStrategy);
  }, [savedTitle, savedStrategy, draftTitle, draftStrategy]);

  const startSectionEdit = (section: StrategySectionId) => {
    if (!draftStrategy || readOnly || activeSection) return;
    sectionSnapshotRef.current = captureStrategySectionSnapshot(section, draftTitle, draftStrategy);
    setActiveSection(section);
  };

  const doneSectionEdit = () => {
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  };

  const cancelSectionEdit = () => {
    if (!activeSection || !draftStrategy || !sectionSnapshotRef.current) {
      setActiveSection(null);
      sectionSnapshotRef.current = null;
      return;
    }
    const restored = applyStrategySectionSnapshot(
      activeSection,
      draftTitle,
      draftStrategy,
      sectionSnapshotRef.current
    );
    setDraftTitle(restored.title);
    setDraftStrategy(restored.strategy);
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  };

  const discardAllDraft = () => {
    if (strategy) {
      resetEditDraft(strategy);
    }
    setLeaveDialogOpen(false);
    pendingNavRef.current = null;
  };

  const handleSave = async (): Promise<boolean> => {
    if (!strategy || !draftStrategy || readOnly) return false;
    setSaving(true);
    setError(null);
    try {
      const payload = normalizeStrategyPayload(draftStrategy);
      const updated = await updateStrategy(strategy.id, {
        title: draftTitle.trim() || strategy.title,
        strategy: payload,
      });
      if (updated) {
        const reloaded = await loadStrategyDetail(user!.id, updated.id);
        if (reloaded) {
          setStrategy(reloaded);
          resetEditDraft(reloaded);
        }
        if (updated.id !== strategy.id) {
          navigate(`/strategy/${updated.id}`, { replace: true });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("[StrategyEditor] save failed", err);
      setError("Could not save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!strategy) return;
    setIsArchiving(true);
    try {
      await archiveStrategy(strategy.lineage_id);
      setArchiveOpen(false);
      navigate("/strategy");
    } finally {
      setIsArchiving(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!strategy) return;
    setIsPermanentDeleting(true);
    try {
      await hardDeleteStrategy(strategy.lineage_id);
      setPermanentDeleteOpen(false);
      navigate("/strategy");
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const handleVersionRestored = (row: StrategyRow) => {
    setActiveSection(null);
    sectionSnapshotRef.current = null;
    if (row.id !== strategy?.id) {
      navigate(`/strategy/${row.id}`, { replace: true });
    } else {
      void load();
    }
  };

  const performPendingNavigation = (path: string | null) => {
    if (!path) return;
    pendingNavRef.current = null;
    navigate(path);
  };

  const handleLeaveWithoutSaving = () => {
    setLeaveDialogOpen(false);
    if (strategy) resetEditDraft(strategy);
    performPendingNavigation(pendingNavRef.current);
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (!ok) return;
    setLeaveDialogOpen(false);
    performPendingNavigation(pendingNavRef.current);
  };

  const rosterStrategy: StrategyWithLinks | null = useMemo(() => {
    if (!strategy) return null;
    return strategy as StrategyWithLinks;
  }, [strategy]);

  return (
    <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
      {leaveDialogOpen ? (
        <div
          className="modal-overlay"
          onClick={() => {
            pendingNavRef.current = null;
            setLeaveDialogOpen(false);
          }}
          role="presentation"
        >
          <div
            className="modal-content modal-content-wide"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                pendingNavRef.current = null;
                setLeaveDialogOpen(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2>Save changes before leaving?</h2>
            <p className="font-['Inter'] text-sm text-foreground/80">
              You have unsaved edits to this strategy. Save as a new version, or discard your
              changes.
            </p>
            <div className="modal-buttons">
              <button type="button" className="modal-cancel" onClick={handleLeaveWithoutSaving}>
                Discard changes
              </button>
              <button
                type="button"
                className="modal-save"
                disabled={saving}
                onClick={() => void handleSaveAndLeave()}
              >
                {saving ? "Saving…" : "Save as new version"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/15 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <span className="font-['Inter'] text-sm text-amber-800">Unsaved changes</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
              >
                {saving ? "Saving…" : "Save as new version"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-black rounded-design"
                disabled={saving}
                onClick={discardAllDraft}
              >
                Discard all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`mx-auto max-w-4xl space-y-6 ${isDirty ? "pb-24" : "pb-10"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/strategy"
            data-allow-navigation={isDirty ? undefined : "true"}
            className="inline-flex items-center gap-2 font-['Inter'] text-sm text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Strategy
          </Link>
        </div>

        {loading ? (
          <p className="font-['Inter'] text-sm text-foreground/60">Loading strategy…</p>
        ) : error || !strategy ? (
          <div className="rounded-design border border-black/15 bg-accent-grey/20 p-6">
            <p className="font-['Inter'] text-sm text-red-700">{error || "Strategy not found."}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {isArchived ? (
                  <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-['Inter'] text-[11px] text-amber-900 mb-2">
                    Archived (read-only)
                  </span>
                ) : null}
                <p className="font-['Inter'] text-xs text-foreground/55">
                  Version {strategy.version}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {rosterStrategy ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-black rounded-design"
                    onClick={() => exportStrategyAsPDF(rosterStrategy)}
                  >
                    Export
                  </Button>
                ) : null}
                {!readOnly ? (
                  <ArchiveActionTooltip>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-black rounded-design"
                      onClick={() => setArchiveOpen(true)}
                    >
                      Archive
                    </Button>
                  </ArchiveActionTooltip>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPermanentDeleting}
                    onClick={() => setPermanentDeleteOpen(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50 rounded-design font-['Inter'] text-sm gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete permanently
                  </Button>
                )}
              </div>
            </div>

            {rosterStrategy ? (
              <StrategyCompositionBanner aims={rosterStrategy.aims} icps={rosterStrategy.icps} />
            ) : null}

            {!readOnly && strategy ? (
              <StrategySuggestedContentChecklist
                brandId={strategy.brand_id}
                strategyLineageId={strategy.lineage_id}
                strategyTitle={strategy.title}
                strategy={draftStrategy ?? strategy.strategy}
                icps={rosterStrategy?.icps ?? []}
              />
            ) : null}

            {draftStrategy ? (
              <StrategyEditableDocument
                title={draftTitle}
                strategy={draftStrategy}
                stagedSections={stagedSections}
                activeSection={activeSection}
                readOnly={readOnly}
                onStartEdit={startSectionEdit}
                onDoneSection={doneSectionEdit}
                onCancelSection={cancelSectionEdit}
                onTitleChange={setDraftTitle}
                onStrategyChange={setDraftStrategy}
              />
            ) : null}

            {user?.id && !readOnly ? (
              <StrategyVersionHistorySection
                lineageId={strategy.lineage_id}
                currentStrategyId={strategy.id}
                userId={user.id}
                onVersionRestored={handleVersionRestored}
              />
            ) : null}
          </>
        )}
      </div>

      <StrategyArchiveModal
        isOpen={archiveOpen}
        isArchiving={isArchiving}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => void confirmArchive()}
      />

      <StrategyPermanentDeleteModal
        isOpen={permanentDeleteOpen}
        strategyTitle={strategy?.title ?? ""}
        isDeleting={isPermanentDeleting}
        onClose={() => setPermanentDeleteOpen(false)}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </DashboardShell>
  );
}
