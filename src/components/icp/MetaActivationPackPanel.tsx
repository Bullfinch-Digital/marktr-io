import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  MetaActivationPackRecord,
  useMetaActivationPack,
} from "../../hooks/useMetaActivationPack";
import { Loader2 } from "lucide-react";
import {
  exportMetaPackAsJSON,
  exportMetaPackAsPDF,
  exportMetaPackAudienceCSV,
} from "../../utils/exportMetaActivationPack";

type Props = {
  icpId?: string;
  selectedStrategyId?: string | null;
  isFreeTier: boolean;
  onUpgrade: () => void;
  onUnsavedRenameChange?: (hasUnsaved: boolean) => void;
  registerSavePendingRename?: (saveFn: (() => Promise<boolean>) | null) => void;
};

export function MetaActivationPackPanel({
  icpId,
  selectedStrategyId,
  isFreeTier,
  onUpgrade,
  onUnsavedRenameChange,
  registerSavePendingRename,
}: Props) {
  const {
    records,
    record,
    selectedId,
    selectPack,
    isLoading,
    isGenerating,
    error,
    maxPacks,
    generatePack,
    renamePack,
    deletePack,
  } = useMetaActivationPack(icpId);

  const [goal, setGoal] = useState("Build a practical Meta audience and campaign roadmap");
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!record) {
      setRenameValue("");
      return;
    }
    setRenameValue(record.pack_name);
  }, [record?.id, record?.pack_name]);

  const hasReachedLimit = records.length >= maxPacks;
  const pack = record?.pack_json ?? null;
  const hasUnsavedRename =
    isRenaming && !!record && renameValue.trim() !== (record.pack_name || "").trim();

  const savePendingRename = useCallback(async () => {
    if (!record) return true;
    if (!hasUnsavedRename) return true;
    const ok = await renamePack(record.id, renameValue);
    if (ok) setIsRenaming(false);
    return ok;
  }, [record, hasUnsavedRename, renamePack, renameValue]);

  const summary = useMemo(() => {
    if (!pack) return null;
    return {
      audienceCount: pack.audience_plan?.length ?? 0,
      matrixCount: pack.messaging_matrix?.length ?? 0,
      roadmapCount: pack.roadmap_30d?.length ?? 0,
    };
  }, [pack]);

  useEffect(() => {
    onUnsavedRenameChange?.(hasUnsavedRename);
  }, [hasUnsavedRename, onUnsavedRenameChange]);

  useEffect(() => {
    registerSavePendingRename?.(hasUnsavedRename ? savePendingRename : null);
    return () => {
      registerSavePendingRename?.(null);
    };
  }, [hasUnsavedRename, savePendingRename, registerSavePendingRename]);

  if (isFreeTier) {
    return (
      <div className="bg-white border border-black rounded-design p-4">
        <h4 className="font-['Fraunces'] text-lg mb-2">Meta Activation Pack</h4>
        <p className="text-sm font-['Inter'] text-foreground/70 mb-3">
          Generate audience recipes, lookalike plans, and a 30-day Meta rollout from this ICP.
        </p>
        <Button
          className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
          onClick={onUpgrade}
        >
          Unlock Meta Activation Pack
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-black rounded-design p-4 space-y-4">
      <div>
        <h4 className="font-['Fraunces'] text-lg">Meta Activation Pack</h4>
        <p className="text-xs font-['Inter'] text-foreground/60 mt-1">
          Build Meta-ready custom audience recipes, lookalike tiering, and launch roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Primary objective</p>
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="border-black rounded-design"
          />
        </div>
        <div>
          <p className="text-xs font-['Inter'] text-foreground/60 mb-1">Pack name (optional)</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border-black rounded-design"
            placeholder={`Meta Activation Pack ${records.length + 1}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
          disabled={isGenerating || hasReachedLimit}
          onClick={() =>
            void generatePack({
              strategyId: selectedStrategyId ?? null,
              goal: goal || null,
              packName: newName || null,
            })
          }
        >
          {isGenerating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating pack...
            </span>
          ) : (
            "Generate Pack"
          )}
        </Button>
        {hasReachedLimit && (
          <p className="text-xs font-['Inter'] text-foreground/60">
            Maximum of {maxPacks} packs reached. Delete one to create another.
          </p>
        )}
      </div>

      {records.length > 0 && (
        <div className="border border-black/20 rounded-design p-3">
          <div className="flex flex-wrap gap-2">
            {records.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectPack(r.id)}
                  className={`px-3 py-1.5 rounded-design border text-xs font-['Inter'] ${
                    active
                      ? "bg-button-green/40 border-black text-foreground"
                      : "bg-white border-black/40 text-foreground/70 hover:bg-accent-grey/30"
                  }`}
                >
                  {r.pack_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs font-['Inter'] text-red-600">{error}</p>}
      {isLoading && <p className="text-xs font-['Inter'] text-foreground/60">Loading packs…</p>}
      {isGenerating && (
        <p className="text-xs font-['Inter'] text-foreground/70 animate-pulse">
          Building audiences, messaging matrix, and 30-day roadmap. Please do not refresh or navigate away.
        </p>
      )}

      {record && pack && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isRenaming ? (
              <>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-9 border-black rounded-design max-w-xs"
                  maxLength={80}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-black rounded-design"
                  onClick={async () => {
                    if (!record) return;
                    const ok = await renamePack(record.id, renameValue);
                    if (ok) setIsRenaming(false);
                  }}
                >
                  Save name
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-black rounded-design"
                  onClick={() => {
                    setIsRenaming(false);
                    setRenameValue(record.pack_name);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-black rounded-design"
                  onClick={() => setIsRenaming(true)}
                >
                  Rename pack
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-700 hover:bg-red-50 rounded-design"
                  onClick={async () => {
                    if (!record) return;
                    const ok = window.confirm(
                      "Delete this Meta activation pack? This action cannot be undone."
                    );
                    if (!ok) return;
                    await deletePack(record.id);
                  }}
                >
                  Delete pack
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-black rounded-design ml-auto"
              onClick={() => exportMetaPackAsPDF(record)}
            >
              Export PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-black rounded-design"
              onClick={() => exportMetaPackAudienceCSV(record)}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-black rounded-design"
              onClick={() => exportMetaPackAsJSON(record)}
            >
              Export JSON
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Audience recipes" value={summary?.audienceCount ?? 0} />
            <StatCard label="Messaging rows" value={summary?.matrixCount ?? 0} />
            <StatCard label="Roadmap phases" value={summary?.roadmapCount ?? 0} />
          </div>

          <Section title="Audience Plan">
            {(pack.audience_plan || []).map((a, i) => (
              <li key={`aud-${i}`} className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">{a.audience_name}</span> — {a.source_type}. {a.build_rule}
              </li>
            ))}
          </Section>

          <Section title="Lookalike Plan">
            <p className="text-sm font-['Inter'] text-foreground/80">
              <span className="font-semibold">Sources:</span>{" "}
              {(pack.lookalike_plan?.source_audiences || []).join(" | ") || "—"}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {(pack.lookalike_plan?.tier_recommendations || []).map((t, i) => (
                <li key={`tier-${i}`} className="text-sm font-['Inter'] text-foreground/80">
                  {t.tier_name} ({t.percentage}) — {t.use_case}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Messaging Matrix">
            {(pack.messaging_matrix || []).map((m, i) => (
              <li key={`msg-${i}`} className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">{m.audience}</span> [{m.funnel_stage}] — {m.pain_angle} to{" "}
                {m.promise_angle} (CTA: {m.primary_cta})
              </li>
            ))}
          </Section>

          <Section title="30-Day Roadmap">
            {(pack.roadmap_30d || []).map((w, i) => (
              <li key={`road-${i}`} className="text-sm font-['Inter'] text-foreground/80">
                <span className="font-semibold">{w.week}:</span> {w.focus}
              </li>
            ))}
          </Section>

          <Section title="Compliance Notes">
            {(pack.compliance_notes || []).map((n, i) => (
              <li key={`cmp-${i}`} className="text-sm font-['Inter'] text-foreground/80">
                {n}
              </li>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black rounded-design p-3 bg-white">
      <p className="text-xs font-['Inter'] text-foreground/60">{label}</p>
      <p className="font-['Fraunces'] text-xl">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-black rounded-design p-4 bg-white">
      <h5 className="font-['Fraunces'] text-base mb-2">{title}</h5>
      <ul className="list-disc list-inside space-y-1">{children}</ul>
    </div>
  );
}

export type { MetaActivationPackRecord };
