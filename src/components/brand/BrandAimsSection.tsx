import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ChevronDown, ChevronUp, RotateCcw, Archive } from "lucide-react";
import {
  BRAND_AIM_TYPE_OPTIONS,
  type BrandAimType,
} from "../../lib/brandAimVersioning";
import { useBrandAims, type BrandAim } from "../../hooks/useBrandAims";

const AIM_LABELS: Record<BrandAimType, string> = {
  awareness: "Awareness",
  leads: "Leads",
  enquiries: "Enquiries",
  sales: "Sales",
  retention: "Retention",
};

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

export function BrandAimsSection({ brandId }: { brandId: string }) {
  const {
    aims,
    archivedAims,
    isLoading,
    error,
    createAim,
    updateAim,
    archiveAim,
    restoreAim,
  } = useBrandAims(brandId);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingAimId, setEditingAimId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLineageId, setActionLineageId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const editingAim = useMemo(
    () => aims.find((aim) => aim.id === editingAimId) ?? null,
    [aims, editingAimId]
  );

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingAimId(null);
  };

  const startEdit = (aim: BrandAim) => {
    setEditingAimId(aim.id);
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
        await createAim(form);
      }
      resetForm();
    } catch (err) {
      console.error("[BrandAimsSection] save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (lineageId: string) => {
    setActionLineageId(lineageId);
    try {
      await archiveAim(lineageId);
    } finally {
      setActionLineageId(null);
    }
  };

  const handleRestore = async (lineageId: string) => {
    setActionLineageId(lineageId);
    try {
      await restoreAim(lineageId);
    } finally {
      setActionLineageId(null);
    }
  };

  return (
    <div className="bg-background border border-black rounded-design p-8 shadow-md animate-fade-in-up space-y-5">
      <div>
        <h2 className="font-['Fraunces'] text-2xl">Aims</h2>
        <p className="font-['Inter'] text-sm text-foreground/70">
          Strategy pillar foundation: define versioned brand growth aims.
        </p>
      </div>

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
                {AIM_LABELS[value]}
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
        {editingAim ? (
          <Button
            type="button"
            variant="outline"
            className="border-black rounded-design"
            onClick={resetForm}
          >
            Cancel edit
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="font-['Inter'] text-xs text-red-700">{error}</p>
      ) : null}

      {isLoading ? (
        <p className="font-['Inter'] text-sm text-foreground/60">Loading aims…</p>
      ) : aims.length === 0 ? (
        <p className="font-['Inter'] text-sm text-foreground/60">
          No current aims yet. Add your first one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {aims.map((aim) => (
            <li
              key={aim.id}
              className="rounded-design border border-black/15 bg-accent-grey/20 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-['Inter'] text-sm text-foreground">{aim.title}</p>
                  <p className="font-['Inter'] text-xs text-foreground/55">
                    {AIM_LABELS[aim.aim_type]} · v{aim.version} · updated {formatDate(aim.updated_at)}
                  </p>
                  {aim.description ? (
                    <p className="font-['Inter'] text-xs text-foreground/70 mt-2 whitespace-pre-wrap">
                      {aim.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-black rounded-design"
                    onClick={() => startEdit(aim)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionLineageId === aim.lineage_id}
                    className="border-black rounded-design"
                    onClick={() => void handleArchive(aim.lineage_id)}
                  >
                    {actionLineageId === aim.lineage_id ? "Archiving…" : "Archive"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
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
              {archivedAims.map((aim) => (
                <li
                  key={aim.lineage_id}
                  className="rounded-design border border-black/10 bg-white/70 px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-['Inter'] text-sm text-foreground truncate">{aim.title}</p>
                    <p className="font-['Inter'] text-xs text-foreground/55">
                      {AIM_LABELS[aim.aim_type]} · archived {aim.deleted_at ? formatDate(aim.deleted_at) : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-black rounded-design"
                    disabled={actionLineageId === aim.lineage_id}
                    onClick={() => void handleRestore(aim.lineage_id)}
                  >
                    {actionLineageId === aim.lineage_id ? (
                      "Restoring…"
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
