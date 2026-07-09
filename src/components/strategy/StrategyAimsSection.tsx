import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronUp, Eye, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import {
  BRAND_AIM_TYPE_OPTIONS,
  type BrandAimType,
} from "../../lib/brandAimVersioning";
import { useBrandAims, type BrandAim } from "../../hooks/useBrandAims";
import { BrandAimVersionHistorySection } from "./BrandAimVersionHistorySection";
import { AIM_TYPE_LABELS } from "./StrategyCompositionBanner";
import AimArchiveModal from "./AimArchiveModal";
import AimPermanentDeleteModal from "./AimPermanentDeleteModal";
import { ArchiveActionTooltip } from "../ArchiveActionTooltip";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type FormState = {
  title: string;
  aim_type: BrandAimType;
  description: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  aim_type: "awareness",
  description: "",
};

type Props = {
  brandId: string;
  launcherPersonaName?: string | null;
  autoOpenCreate?: boolean;
  emphasizeEmpty?: boolean;
  onAimCreated?: (aim: BrandAim) => void;
};

export function StrategyAimsSection({
  brandId,
  launcherPersonaName = null,
  autoOpenCreate = false,
  emphasizeEmpty = false,
  onAimCreated,
}: Props) {
  const { user } = useAuth();
  const {
    aims,
    archivedAims,
    isLoading,
    error,
    createAim,
    updateAim,
    archiveAim,
    restoreAim,
    hardDeleteAim,
    fetchAims,
  } = useBrandAims(brandId);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingAimId, setEditingAimId] = useState<string | null>(null);
  const [expandedAimId, setExpandedAimId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLineageId, setActionLineageId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedSnapshotId, setArchivedSnapshotId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BrandAim | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<BrandAim | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (autoOpenCreate && !isLoading && aims.length === 0 && !editingAimId) {
      setShowCreateForm(true);
    }
  }, [autoOpenCreate, isLoading, aims.length, editingAimId]);

  const editingAim = useMemo(
    () => aims.find((aim) => aim.id === editingAimId) ?? null,
    [aims, editingAimId]
  );

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingAimId(null);
    setShowCreateForm(false);
  };

  const startEdit = (aim: BrandAim) => {
    setEditingAimId(aim.id);
    setShowCreateForm(true);
    setForm({
      title: aim.title,
      aim_type: aim.aim_type,
      description: aim.description ?? "",
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingAimId) {
        await updateAim(editingAimId, form);
      } else {
        const created = await createAim(form);
        if (created) onAimCreated?.(created);
      }
      resetForm();
    } catch (err) {
      console.error("[StrategyAimsSection] save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await archiveAim(archiveTarget.lineage_id);
      setArchiveTarget(null);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (lineageId: string) => {
    setActionLineageId(lineageId);
    try {
      await restoreAim(lineageId);
      setArchivedSnapshotId(null);
    } finally {
      setActionLineageId(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsPermanentDeleting(true);
    try {
      await hardDeleteAim(permanentDeleteTarget.lineage_id);
      setPermanentDeleteTarget(null);
      setArchivedSnapshotId(null);
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  return (
    <section className="rounded-design border border-black bg-background p-6 lg:p-8 shadow-md space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-['Fraunces'] text-2xl text-[#0D1833]">Aims</h2>
          <p className="font-['Inter'] text-sm text-foreground/70 mt-1">
            Brand growth goals that strategies are built to serve. Edits create a new version.
          </p>
        </div>
        {!showCreateForm && !editingAim ? (
          <Button
            type="button"
            variant="outline"
            className="border-black rounded-design"
            onClick={() => setShowCreateForm(true)}
          >
            Add aim
          </Button>
        ) : null}
      </div>

      {(showCreateForm || editingAim) ? (
        <div className="rounded-design border border-black/15 bg-accent-grey/15 p-4 space-y-4">
          <p className="font-['Inter'] text-sm font-medium text-foreground">
            {editingAim ? "Edit aim (saves as new version)" : "New aim"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 md:col-span-2">
              <label className="font-['Inter'] text-sm text-foreground/70">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="border-black rounded-design"
                placeholder="Build awareness of Spiced Apple launch"
              />
            </div>
            <div className="space-y-2">
              <label className="font-['Inter'] text-sm text-foreground/70">Aim type</label>
              <select
                value={form.aim_type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, aim_type: e.target.value as BrandAimType }))
                }
                className="w-full border border-black rounded-design px-4 py-3 bg-white font-['Inter'] text-foreground text-sm"
              >
                {BRAND_AIM_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {AIM_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-['Inter'] text-sm text-foreground/70">Description (optional)</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="border-black rounded-design resize-none"
              rows={3}
              placeholder="Optional detail about what this aim should achieve."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={saving || !form.title.trim()}
              onClick={() => void handleSave()}
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
            >
              {saving ? "Saving…" : editingAim ? "Save as new version" : "Add aim"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-black rounded-design"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="font-['Inter'] text-xs text-red-700">{error}</p> : null}

      {isLoading ? (
        <p className="font-['Inter'] text-sm text-foreground/60">Loading aims…</p>
      ) : aims.length === 0 ? (
        <div
          className={`rounded-design border px-4 py-5 space-y-3 ${
            emphasizeEmpty
              ? "border-black/20 bg-accent-grey/20"
              : "border-black/10 bg-accent-grey/10"
          }`}
        >
          {launcherPersonaName ? (
            <p className="font-['Inter'] text-sm text-foreground/80">
              To build a strategy for <strong>{launcherPersonaName}</strong>, start by defining what
              you want to achieve.
            </p>
          ) : null}
          <p className="font-['Fraunces'] text-lg text-[#0D1833]">
            Strategy starts with a goal — what are you trying to achieve?
          </p>
          <p className="font-['Inter'] text-sm text-foreground/70">
            Add a brand aim below. Once you have at least one aim, you can generate strategies that
            serve your personas.
          </p>
          {!showCreateForm ? (
            <Button
              type="button"
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first aim
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {aims.map((aim) => {
            const isExpanded = expandedAimId === aim.id;
            return (
              <li
                key={aim.id}
                className="rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-['Inter'] text-sm font-medium text-foreground">{aim.title}</p>
                      <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-['Inter'] text-[10px] text-primary">
                        {AIM_TYPE_LABELS[aim.aim_type]}
                      </span>
                    </div>
                    <p className="font-['Inter'] text-xs text-foreground/55 mt-1">
                      v{aim.version} · updated {formatDate(aim.updated_at)}
                    </p>
                    {aim.description ? (
                      <p className="font-['Inter'] text-xs text-foreground/70 mt-2 whitespace-pre-wrap line-clamp-2">
                        {aim.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-black rounded-design"
                      onClick={() => setExpandedAimId(isExpanded ? null : aim.id)}
                    >
                      {isExpanded ? "Collapse" : "Details"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-black rounded-design"
                      onClick={() => startEdit(aim)}
                    >
                      Edit
                    </Button>
                    <ArchiveActionTooltip>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-black rounded-design"
                        onClick={() => setArchiveTarget(aim)}
                      >
                        Archive
                      </Button>
                    </ArchiveActionTooltip>
                  </div>
                </div>

                {isExpanded && user?.id ? (
                  <div className="mt-3 space-y-2">
                    {aim.description ? (
                      <p className="font-['Inter'] text-sm text-foreground/75 whitespace-pre-wrap">
                        {aim.description}
                      </p>
                    ) : null}
                    <BrandAimVersionHistorySection
                      lineageId={aim.lineage_id}
                      currentAimId={aim.id}
                      userId={user.id}
                      onVersionRestored={() => void fetchAims()}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-black/10 pt-4">
        <button
          type="button"
          onClick={() => setArchivedOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80 transition-colors"
        >
          <Archive className="h-3.5 w-3.5" />
          Archived
          {archivedAims.length > 0 ? ` (${archivedAims.length})` : ""}
          {archivedOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {archivedOpen ? (
          archivedAims.length === 0 ? (
            <p className="mt-3 font-['Inter'] text-xs text-foreground/50">Nothing archived.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {archivedAims.map((aim) => {
                const snapshotOpen = archivedSnapshotId === aim.lineage_id;
                return (
                  <li
                    key={aim.lineage_id}
                    className="rounded-design border border-black/10 bg-white/70 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-['Inter'] text-sm text-foreground truncate">{aim.title}</p>
                        <p className="font-['Inter'] text-xs text-foreground/55">
                          {AIM_TYPE_LABELS[aim.aim_type]} · archived{" "}
                          {aim.deleted_at ? formatDate(aim.deleted_at) : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-black rounded-design font-['Inter'] text-xs h-8"
                          onClick={() =>
                            setArchivedSnapshotId(snapshotOpen ? null : aim.lineage_id)
                          }
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {snapshotOpen ? "Hide" : "View"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-black rounded-design font-['Inter'] text-xs h-8"
                          disabled={actionLineageId === aim.lineage_id || isPermanentDeleting}
                          onClick={() => void handleRestore(aim.lineage_id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          {actionLineageId === aim.lineage_id ? "Restoring…" : "Restore"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionLineageId === aim.lineage_id || isPermanentDeleting}
                          onClick={() => setPermanentDeleteTarget(aim)}
                          className="border-red-300 text-red-700 hover:bg-red-50 rounded-design font-['Inter'] text-xs h-8"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete permanently
                        </Button>
                      </div>
                    </div>

                    {snapshotOpen ? (
                      <div className="mt-3 rounded-design border border-black/10 bg-accent-grey/20 px-3 py-3 space-y-2">
                        <p className="font-['Inter'] text-sm font-medium text-foreground">{aim.title}</p>
                        <span className="inline-flex rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-['Inter'] text-[10px] text-primary">
                          {AIM_TYPE_LABELS[aim.aim_type]}
                        </span>
                        {aim.description ? (
                          <p className="font-['Inter'] text-sm text-foreground/75 whitespace-pre-wrap">
                            {aim.description}
                          </p>
                        ) : (
                          <p className="font-['Inter'] text-xs text-foreground/50">No description.</p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>

      <AimArchiveModal
        isOpen={!!archiveTarget}
        isArchiving={isArchiving}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void confirmArchive()}
      />

      <AimPermanentDeleteModal
        isOpen={!!permanentDeleteTarget}
        aimTitle={permanentDeleteTarget?.title ?? ""}
        isDeleting={isPermanentDeleting}
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={() => void confirmPermanentDelete()}
      />
    </section>
  );
}
