import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardShell from "../layouts/DashboardShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../config/supabase";
import type { ICPStrategyPayload } from "../hooks/useICPStrategy";
import {
  useBrandStrategies,
  type StrategyRow,
  type StrategyWithLinks,
} from "../hooks/useBrandStrategies";
import {
  fetchCompositionForLineages,
  type CompositionAim,
  type CompositionIcp,
} from "../lib/strategyComposition";
import { StrategyCompositionBanner } from "../components/strategy/StrategyCompositionBanner";
import { StrategyContentView } from "../components/strategy/StrategyContentView";
import { StrategyVersionHistorySection } from "../components/strategy/StrategyVersionHistorySection";
import StrategyArchiveModal from "../components/strategy/StrategyArchiveModal";

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

  const [aimLinks, icpLinks] = await Promise.all([
    supabase
      .from("strategy_aims")
      .select("aim_lineage_id")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategyRow.lineage_id),
    supabase
      .from("strategy_targets")
      .select("icp_lineage_id")
      .eq("user_id", userId)
      .eq("strategy_lineage_id", strategyRow.lineage_id),
  ]);

  if (aimLinks.error) throw aimLinks.error;
  if (icpLinks.error) throw icpLinks.error;

  const aimLineageIds = (aimLinks.data || []).map((r: any) => r.aim_lineage_id);
  const icpLineageIds = (icpLinks.data || []).map((r: any) => r.icp_lineage_id);
  const { aims, icps } = await fetchCompositionForLineages(userId, aimLineageIds, icpLineageIds);

  return { ...strategyRow, aims, icps };
}

export default function StrategyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editOneLiner, setEditOneLiner] = useState("");
  const [editWhyUs, setEditWhyUs] = useState("");
  const [editValueProps, setEditValueProps] = useState("");

  const brandId = strategy?.brand_id ?? "";
  const { updateStrategy, archiveStrategy } = useBrandStrategies(brandId);

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

  const isArchived = !!strategy?.deleted_at;
  const readOnly = isArchived;

  const startEdit = () => {
    if (!strategy) return;
    setEditTitle(strategy.title);
    setEditOneLiner(strategy.strategy?.positioning?.one_liner ?? "");
    setEditWhyUs(strategy.strategy?.positioning?.why_us ?? "");
    setEditValueProps((strategy.strategy?.messaging?.value_props ?? []).join("\n"));
    setEditing(true);
  };

  const buildUpdatedPayload = (): ICPStrategyPayload => {
    if (!strategy) return strategy!.strategy;
    const next = structuredClone(strategy.strategy);
    next.positioning = {
      ...next.positioning,
      one_liner: editOneLiner.trim(),
      why_us: editWhyUs.trim(),
    };
    next.messaging = {
      ...next.messaging,
      value_props: editValueProps
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    return next;
  };

  const handleSave = async () => {
    if (!strategy || readOnly) return;
    setSaving(true);
    try {
      const updated = await updateStrategy(strategy.id, {
        title: editTitle.trim() || strategy.title,
        strategy: buildUpdatedPayload(),
      });
      if (updated) {
        await load();
        if (updated.id !== strategy.id) {
          navigate(`/strategy/${updated.id}`, { replace: true });
        }
      }
      setEditing(false);
    } catch (err) {
      console.error("[StrategyEditor] save failed", err);
      setError("Could not save changes.");
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

  const handleVersionRestored = (row: StrategyRow) => {
    if (row.id !== strategy?.id) {
      navigate(`/strategy/${row.id}`, { replace: true });
    } else {
      void load();
    }
  };

  const rosterStrategy: StrategyWithLinks | null = useMemo(() => {
    if (!strategy) return null;
    return strategy as StrategyWithLinks;
  }, [strategy]);

  return (
    <DashboardShell contentClassName="flex-1 px-6 py-8 lg:px-12">
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <Link
          to="/strategy"
          className="inline-flex items-center gap-2 font-['Inter'] text-sm text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Strategy
        </Link>

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
                <h1 className="font-['Fraunces'] text-3xl lg:text-4xl text-[#0D1833]">{strategy.title}</h1>
                <p className="font-['Inter'] text-xs text-foreground/55 mt-2">
                  Version {strategy.version}
                </p>
              </div>
              {!readOnly ? (
                <div className="flex flex-wrap items-center gap-2">
                  {editing ? (
                    <>
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
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-black rounded-design"
                        onClick={startEdit}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-black rounded-design"
                        onClick={() => setArchiveOpen(true)}
                      >
                        Archive
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {rosterStrategy ? (
              <StrategyCompositionBanner aims={rosterStrategy.aims} icps={rosterStrategy.icps} />
            ) : null}

            {editing && !readOnly ? (
              <div className="rounded-design border border-black/15 bg-accent-grey/15 p-5 space-y-4">
                <p className="font-['Inter'] text-sm font-medium text-foreground">
                  Refine key fields (saves as a new version)
                </p>
                <div className="space-y-2">
                  <label className="font-['Inter'] text-sm text-foreground/70">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-black rounded-design"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-['Inter'] text-sm text-foreground/70">Positioning one-liner</label>
                  <Textarea
                    value={editOneLiner}
                    onChange={(e) => setEditOneLiner(e.target.value)}
                    className="border-black rounded-design resize-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-['Inter'] text-sm text-foreground/70">Why us</label>
                  <Textarea
                    value={editWhyUs}
                    onChange={(e) => setEditWhyUs(e.target.value)}
                    className="border-black rounded-design resize-none"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-['Inter'] text-sm text-foreground/70">
                    Value props (one per line)
                  </label>
                  <Textarea
                    value={editValueProps}
                    onChange={(e) => setEditValueProps(e.target.value)}
                    className="border-black rounded-design resize-none"
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <StrategyContentView strategy={strategy.strategy} />
            )}

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
    </DashboardShell>
  );
}
