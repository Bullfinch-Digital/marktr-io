import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import type { ContentItemRow, ContentItemStatus } from "../types/contentItemPayload";
import { normalizeContentPayload } from "../lib/contentItemPayload";
import {
  applyContentSectionSnapshot,
  captureContentSectionSnapshot,
  getStagedContentSections,
  normalizeContentDraft,
  serializeContentDraft,
  type ContentDraft,
  type ContentSectionId,
  type ContentSectionSnapshot,
} from "../lib/contentItemEditPayload";
import {
  attachCompositionToContentItems,
  type ContentComposition,
} from "../lib/contentComposition";
import { useContentItems } from "../hooks/useContentItems";
import { CONTENT_TYPE_LABELS } from "../lib/contentTypeLabels";
import { ContentCompositionBanner } from "../components/content/ContentCompositionBanner";
import { ContentEditableDocument } from "../components/content/ContentEditableDocument";
import { ContentVersionHistorySection } from "../components/content/ContentVersionHistorySection";
import ContentArchiveModal from "../components/content/ContentArchiveModal";
import ContentPermanentDeleteModal from "../components/content/ContentPermanentDeleteModal";
import { ArchiveActionTooltip } from "../components/ArchiveActionTooltip";
import { exportContentAsPDF } from "../utils/exportContent";
import "../styles/Modal.css";

type ContentDetail = ContentItemRow & { composition: ContentComposition };

async function loadContentDetail(
  userId: string,
  itemId: string
): Promise<ContentDetail | null> {
  const { data: row, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const item = {
    ...(row as ContentItemRow),
    content: normalizeContentPayload((row as ContentItemRow).type, (row as ContentItemRow).content),
  };
  const [withComp] = await attachCompositionToContentItems(userId, [item]);
  return withComp ?? null;
}

export default function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [activeSection, setActiveSection] = useState<ContentSectionId | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const editBaselineRef = useRef<string | null>(null);
  const sectionSnapshotRef = useRef<ContentSectionSnapshot | null>(null);

  const brandId = item?.brand_id ?? "";
  const { updateContent, setContentStatus, archiveContent, hardDeleteContent } =
    useContentItems(brandId);

  const resetEditDraft = useCallback((detail: ContentDetail) => {
    const next = normalizeContentDraft(detail.type, detail.title, detail.content);
    setDraft(next);
    editBaselineRef.current = serializeContentDraft(detail.type, next);
    setIsDirty(false);
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  }, []);

  const load = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await loadContentDetail(user.id, id);
      if (!detail) {
        setError("Content item not found.");
        setItem(null);
        return;
      }
      if (detail.superseded_at) {
        const { data: current } = await supabase
          .from("content_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("lineage_id", detail.lineage_id)
          .is("superseded_at", null)
          .maybeSingle();
        if (current?.id && current.id !== id) {
          navigate(`/content/${current.id}`, { replace: true });
          return;
        }
      }
      setItem(detail);
    } catch (err) {
      console.error("[ContentEditor] load failed", err);
      setError("Failed to load content.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!item) return;
    resetEditDraft(item);
  }, [item?.id, item?.version, resetEditDraft]);

  useEffect(() => {
    if (!draft || !editBaselineRef.current || !item) {
      setIsDirty(false);
      return;
    }
    setIsDirty(serializeContentDraft(item.type, draft) !== editBaselineRef.current);
  }, [draft, item]);

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
      if (!isDirty || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target || target.closest("[data-allow-navigation='true']")) return;
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

  const isArchived = !!item?.deleted_at;
  const readOnly = isArchived;

  const savedDraft = useMemo(
    () => (item ? normalizeContentDraft(item.type, item.title, item.content) : null),
    [item]
  );

  const stagedSections = useMemo(() => {
    if (!item || !savedDraft || !draft) return [];
    return getStagedContentSections(item.type, savedDraft, draft);
  }, [item, savedDraft, draft]);

  const startSectionEdit = (section: ContentSectionId) => {
    if (!draft || !item || readOnly || activeSection) return;
    sectionSnapshotRef.current = captureContentSectionSnapshot(item.type, draft);
    setActiveSection(section);
  };

  const doneSectionEdit = () => {
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  };

  const cancelSectionEdit = () => {
    if (!activeSection || !draft || !item || !sectionSnapshotRef.current) {
      setActiveSection(null);
      sectionSnapshotRef.current = null;
      return;
    }
    setDraft(
      applyContentSectionSnapshot(
        item.type,
        activeSection,
        draft,
        sectionSnapshotRef.current
      )
    );
    setActiveSection(null);
    sectionSnapshotRef.current = null;
  };

  const discardAllDraft = () => {
    if (item) resetEditDraft(item);
    setLeaveDialogOpen(false);
    pendingNavRef.current = null;
  };

  const handleSave = async (): Promise<boolean> => {
    if (!item || !draft || readOnly) return false;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateContent(item.id, {
        title: draft.title.trim() || item.title,
        content: draft.content,
      });
      if (updated) {
        const reloaded = await loadContentDetail(user!.id, updated.id);
        if (reloaded) {
          setItem(reloaded);
          resetEditDraft(reloaded);
        }
        if (updated.id !== item.id) {
          navigate(`/content/${updated.id}`, { replace: true });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("[ContentEditor] save failed", err);
      setError("Could not save changes.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!item || readOnly || statusSaving) return;
    const next: ContentItemStatus = item.status === "approved" ? "draft" : "approved";
    setStatusSaving(true);
    try {
      await setContentStatus(item.id, next);
      setItem((prev) => (prev ? { ...prev, status: next } : prev));
    } catch (err) {
      console.error("[ContentEditor] status toggle failed", err);
      setError("Could not update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!item) return;
    setIsArchiving(true);
    try {
      await archiveContent(item.lineage_id);
      setArchiveOpen(false);
      navigate("/content");
    } finally {
      setIsArchiving(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!item) return;
    setIsPermanentDeleting(true);
    try {
      await hardDeleteContent(item.lineage_id);
      setPermanentDeleteOpen(false);
      navigate("/content");
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const handleVersionRestored = (row: ContentItemRow) => {
    setActiveSection(null);
    sectionSnapshotRef.current = null;
    if (row.id !== item?.id) {
      navigate(`/content/${row.id}`, { replace: true });
    } else {
      void load();
    }
  };

  const performPendingNavigation = (path: string | null) => {
    if (!path) return;
    pendingNavRef.current = null;
    navigate(path);
  };

  if (loading) {
    return (
      <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
        <p className="font-['Inter'] text-sm text-foreground/60">Loading content…</p>
      </DashboardShell>
    );
  }

  if (!item || !draft) {
    return (
      <DashboardShell requirePro contentClassName="flex-1 px-6 py-8 lg:px-12">
        <p className="font-['Inter'] text-sm text-red-700">{error || "Content not found."}</p>
        <Link to="/content" className="font-['Inter'] text-sm underline mt-3 inline-block">
          Back to Content
        </Link>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requirePro contentClassName={`flex-1 px-6 py-8 lg:px-12 ${isDirty ? "pb-24" : ""}`}>
      {leaveDialogOpen ? (
        <div
          className="modal-overlay"
          onClick={() => {
            pendingNavRef.current = null;
            setLeaveDialogOpen(false);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Unsaved changes</h2>
            <p className="font-['Inter'] text-sm text-foreground/70 mt-2">
              Save as a new version before leaving, or discard your draft.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => {
                  setLeaveDialogOpen(false);
                  pendingNavRef.current = null;
                }}
              >
                Stay
              </button>
              <button
                type="button"
                className="modal-cancel"
                onClick={() => {
                  if (item) resetEditDraft(item);
                  performPendingNavigation(pendingNavRef.current);
                }}
              >
                Leave without saving
              </button>
              <button
                type="button"
                className="modal-save"
                onClick={async () => {
                  const ok = await handleSave();
                  if (!ok) return;
                  setLeaveDialogOpen(false);
                  performPendingNavigation(pendingNavRef.current);
                }}
              >
                Save and leave
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/content"
            data-allow-navigation="true"
            className="inline-flex items-center gap-1.5 font-['Inter'] text-sm text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Content
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-black/15 bg-accent-grey/30 px-2.5 py-1 font-['Inter'] text-[11px]">
              {CONTENT_TYPE_LABELS[item.type]}
            </span>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => void handleStatusToggle()}
                disabled={statusSaving}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] transition-colors ${
                  item.status === "approved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
                title="Toggle draft / approved (does not create a version)"
              >
                {statusSaving
                  ? "Updating…"
                  : item.status === "approved"
                    ? "Approved · mark draft"
                    : "Draft · mark approved"}
              </button>
            ) : (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
                  item.status === "approved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {item.status === "approved" ? "Approved" : "Draft"}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design"
              onClick={() => exportContentAsPDF(item)}
            >
              Export
            </Button>
            {isArchived ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-300 text-red-800 rounded-design gap-1"
                onClick={() => setPermanentDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete permanently
              </Button>
            ) : (
              <ArchiveActionTooltip>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-black rounded-design"
                  onClick={() => setArchiveOpen(true)}
                >
                  Archive
                </Button>
              </ArchiveActionTooltip>
            )}
          </div>
        </div>

        {isArchived ? (
          <p className="font-['Inter'] text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-design px-3 py-2">
            This piece is archived. Restore it from the Content roster to edit again.
          </p>
        ) : null}

        {error ? (
          <p className="font-['Inter'] text-sm text-red-700 bg-red-50 border border-red-200 rounded-design px-3 py-2">
            {error}
          </p>
        ) : null}

        <ContentCompositionBanner composition={item.composition} />

        <ContentEditableDocument
          type={item.type}
          draft={draft}
          stagedSections={stagedSections}
          activeSection={activeSection}
          readOnly={readOnly}
          onStartEdit={startSectionEdit}
          onDoneSection={doneSectionEdit}
          onCancelSection={cancelSectionEdit}
          onDraftChange={setDraft}
        />

        {user?.id ? (
          <ContentVersionHistorySection
            lineageId={item.lineage_id}
            currentItemId={item.id}
            userId={user.id}
            disabled={readOnly || isDirty}
            onVersionRestored={handleVersionRestored}
          />
        ) : null}
      </div>

      {isDirty && !readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/15 bg-white/95 backdrop-blur px-4 py-3">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <p className="font-['Inter'] text-sm text-foreground/70">Unsaved changes</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-black rounded-design"
                onClick={discardAllDraft}
                disabled={saving}
              >
                Discard all
              </Button>
              <Button
                type="button"
                className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save as new version"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ContentArchiveModal
        isOpen={archiveOpen}
        isArchiving={isArchiving}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => void confirmArchive()}
      />
      <ContentPermanentDeleteModal
        isOpen={permanentDeleteOpen}
        contentTitle={item.title}
        isDeleting={isPermanentDeleting}
        onClose={() => setPermanentDeleteOpen(false)}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </DashboardShell>
  );
}
