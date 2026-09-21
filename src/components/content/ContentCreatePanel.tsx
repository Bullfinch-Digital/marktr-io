import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { ContentItemRow, ContentItemType } from "../../types/contentItemPayload";
import { CONTENT_ITEM_TYPES } from "../../types/contentItemPayload";
import type { ICPStrategyPayload } from "../../types/icpStrategyPayload";
import type { ContentLauncherIntent } from "../../lib/contentLauncherState";
import { isContentItemType } from "../../lib/contentItemPayload";
import { CONTENT_TYPE_LABELS } from "../../lib/contentTypeLabels";
import type { CompositionIcp } from "../../lib/strategyComposition";
import { createEmptyCampaignIdea } from "../../lib/strategyEditPayload";
import { StrategyCreatePanel } from "../strategy/StrategyCreatePanel";
import type { Brand } from "../../hooks/useBrands";
import type { BrandAim } from "../../hooks/useBrandAims";
import type { ICP } from "../../hooks/useICPs";
import type { StrategyRow } from "../../hooks/useBrandStrategies";

const GENERATION_LOADING_ITEMS = [
  "Reading your strategy",
  "Focusing on the campaign idea",
  "Matching the target persona",
  "Shaping channel-native copy",
  "Structuring the content brief",
  "Writing your content…",
] as const;

export type ContentCreateStrategyOption = {
  id: string;
  lineage_id: string;
  title: string;
  strategy: ICPStrategyPayload;
  icps?: CompositionIcp[];
};

export type ContentGenerateInput = {
  strategyLineageId: string;
  campaignIdeaId: string | null;
  icpLineageId: string;
  type: ContentItemType;
  suggestedContentId?: string | null;
};

type Props = {
  brandId: string;
  strategies: ContentCreateStrategyOption[];
  initialIntent?: ContentLauncherIntent | null;
  onGenerate: (input: ContentGenerateInput) => Promise<ContentItemRow | null>;
  onClose: () => void;
  onGenerated?: (record: ContentItemRow) => void;
  /** When set, enables inline strategy creation (reuse StrategyCreatePanel). */
  strategyCreate?: {
    aims: BrandAim[];
    icps: ICP[];
    brand?: Brand | null;
    onGenerate: (input: {
      aimLineageIds: string[];
      icpLineageIds: string[];
      title?: string;
      channel?: string | null;
      tone?: string | null;
    }) => Promise<StrategyRow | null | unknown>;
  } | null;
  /** Persist a new campaign idea onto the selected strategy. */
  onAddCampaignIdea?: (
    strategyId: string,
    nextStrategy: ICPStrategyPayload
  ) => Promise<StrategyRow | null | unknown>;
};

export function ContentCreatePanel({
  brandId,
  strategies,
  initialIntent = null,
  onGenerate,
  onClose,
  onGenerated,
  strategyCreate = null,
  onAddCampaignIdea,
}: Props) {
  const suggestionMode = Boolean(initialIntent?.strategyLineageId && initialIntent?.type);

  const [strategyLineageId, setStrategyLineageId] = useState("");
  const [campaignIdeaId, setCampaignIdeaId] = useState<string | null>(null);
  const [icpLineageId, setIcpLineageId] = useState("");
  const [contentType, setContentType] = useState<ContentItemType | "">("");
  const [suggestedContentId, setSuggestedContentId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [showStrategyCreate, setShowStrategyCreate] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaName, setIdeaName] = useState("");
  const [ideaHook, setIdeaHook] = useState("");
  const [savingIdea, setSavingIdea] = useState(false);

  useEffect(() => {
    if (!initialIntent) return;
    setStrategyLineageId(initialIntent.strategyLineageId);
    setCampaignIdeaId(initialIntent.campaignIdeaId ?? null);
    setIcpLineageId(initialIntent.icpLineageId ?? "");
    setSuggestedContentId(initialIntent.suggestedContentId ?? null);
    if (isContentItemType(initialIntent.type)) {
      setContentType(initialIntent.type);
    }
  }, [initialIntent]);

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.lineage_id === strategyLineageId) ?? null,
    [strategies, strategyLineageId]
  );

  const campaignIdeas = selectedStrategy?.strategy?.campaign_ideas ?? [];
  const personas = (selectedStrategy?.icps ?? []).filter(
    (icp) => icp.linkState === "live" && !!icp.lineage_id
  );

  const availablePersonas = suggestionMode
    ? personas.length
      ? personas
      : initialIntent?.icpLineageId
        ? [
            {
              lineage_id: initialIntent.icpLineageId,
              name: initialIntent.icpName || "Selected persona",
              linkState: "live" as const,
              isArchived: false,
              isDeleted: false,
            },
          ]
        : []
    : personas;

  const singlePersona =
    availablePersonas.length === 1 ? availablePersonas[0] : null;
  const showPersonaPicker = availablePersonas.length > 1;
  const showInlineStrategyCreate = !suggestionMode && strategies.length <= 1;

  useEffect(() => {
    if (!selectedStrategy) return;
    if (
      campaignIdeaId &&
      !campaignIdeas.some((idea) => idea.id === campaignIdeaId) &&
      !(suggestionMode && initialIntent?.campaignIdeaId === campaignIdeaId)
    ) {
      setCampaignIdeaId(null);
    }
  }, [
    selectedStrategy,
    campaignIdeaId,
    campaignIdeas,
    suggestionMode,
    initialIntent?.campaignIdeaId,
  ]);

  useEffect(() => {
    if (singlePersona) {
      if (icpLineageId !== singlePersona.lineage_id) {
        setIcpLineageId(singlePersona.lineage_id);
      }
      return;
    }
    if (!icpLineageId) return;
    const stillValid = availablePersonas.some((p) => p.lineage_id === icpLineageId);
    if (!stillValid && !suggestionMode) {
      setIcpLineageId("");
    }
  }, [availablePersonas, icpLineageId, suggestionMode, singlePersona]);

  const canGenerate =
    !!brandId &&
    !!strategyLineageId &&
    !!icpLineageId &&
    !!contentType &&
    !generating;

  const handleGenerate = async () => {
    if (!canGenerate || !contentType) return;
    setError(null);
    setGenerating(true);
    setCompletedCount(0);

    const timers: number[] = [];
    const checklistPromise = new Promise<void>((resolve) => {
      for (let i = 1; i <= GENERATION_LOADING_ITEMS.length; i += 1) {
        timers.push(window.setTimeout(() => setCompletedCount(i), i * 3500));
      }
      timers.push(
        window.setTimeout(() => resolve(), GENERATION_LOADING_ITEMS.length * 3500 + 500)
      );
    });

    try {
      const [record] = await Promise.all([
        onGenerate({
          strategyLineageId,
          campaignIdeaId,
          icpLineageId,
          type: contentType,
          suggestedContentId: suggestedContentId ?? null,
        }),
        checklistPromise,
      ]);
      if (record) onGenerated?.(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content.");
    } finally {
      timers.forEach((t) => window.clearTimeout(t));
      setGenerating(false);
      setCompletedCount(0);
    }
  };

  const handleSaveCampaignIdea = async () => {
    if (!selectedStrategy || !onAddCampaignIdea) return;
    const name = ideaName.trim();
    if (!name) {
      setError("Give the campaign idea a name.");
      return;
    }
    setSavingIdea(true);
    setError(null);
    try {
      const nextIdea = {
        ...createEmptyCampaignIdea(),
        name,
        hook: ideaHook.trim(),
      };
      const nextStrategy: ICPStrategyPayload = {
        ...selectedStrategy.strategy,
        campaign_ideas: [...(selectedStrategy.strategy.campaign_ideas ?? []), nextIdea],
      };
      await onAddCampaignIdea(selectedStrategy.id, nextStrategy);
      setCampaignIdeaId(nextIdea.id);
      setIdeaName("");
      setIdeaHook("");
      setShowIdeaForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add campaign idea.");
    } finally {
      setSavingIdea(false);
    }
  };

  if (generating) {
    return (
      <div className="rounded-design border border-black bg-white p-6 lg:p-8 shadow-md">
        <h3 className="font-['Fraunces'] text-2xl text-[#0D1833]">Generating your content…</h3>
        <p className="font-['Inter'] text-sm text-foreground/65 mt-2">
          This usually takes about 30 seconds. You can refine the result after it&apos;s ready.
        </p>
        <div className="mt-6 space-y-3">
          {GENERATION_LOADING_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active =
              index === completedCount && completedCount < GENERATION_LOADING_ITEMS.length;
            return (
              <div key={item} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-[#E8650A]" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Loader2 className="h-5 w-5 text-muted-foreground/40" />
                )}
                <p
                  className={`font-['Inter'] text-sm ${
                    done
                      ? "text-foreground"
                      : active
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {item}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const campaignIdeaLabel =
    campaignIdeaId === null
      ? "strategy-level"
      : campaignIdeas.find((idea) => idea.id === campaignIdeaId)?.name ||
        initialIntent?.campaignIdeaName ||
        "Campaign idea";

  return (
    <div className="rounded-design border border-black bg-accent-grey/15 p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-['Fraunces'] text-2xl text-[#0D1833]">
            {suggestionMode ? "Create from suggestion" : "New content"}
          </h3>
          <p className="font-['Inter'] text-sm text-foreground/70 mt-1">
            {suggestionMode
              ? "Pick one persona from this strategy’s targets, then generate. You can refine the result through edits — not regeneration."
              : "Choose a strategy, campaign idea (or strategy-level), one persona, and a content type."}
          </p>
        </div>
        <Button type="button" variant="outline" className="border-black rounded-design" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {suggestionMode && initialIntent ? (
        <div className="rounded-design border border-black/10 bg-white px-4 py-3 space-y-1">
          <p className="font-['Inter'] text-sm text-foreground">
            <span className="text-foreground/55">Strategy:</span>{" "}
            {initialIntent.strategyTitle || selectedStrategy?.title || "Selected strategy"}
          </p>
          <p className="font-['Inter'] text-sm text-foreground">
            <span className="text-foreground/55">Campaign idea:</span> {campaignIdeaLabel}
            {initialIntent.campaignIdeaRemoved ? (
              <span className="ml-1 text-amber-700">(removed from strategy)</span>
            ) : null}
          </p>
          <p className="font-['Inter'] text-sm text-foreground">
            <span className="text-foreground/55">Type:</span>{" "}
            {isContentItemType(initialIntent.type)
              ? CONTENT_TYPE_LABELS[initialIntent.type]
              : initialIntent.type}
          </p>
          {initialIntent.rationale ? (
            <p className="font-['Inter'] text-xs text-foreground/60 mt-2">{initialIntent.rationale}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-['Inter'] text-sm text-foreground">Strategy</p>
              {showInlineStrategyCreate && !showStrategyCreate ? (
                strategyCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowStrategyCreate(true)}
                    className="inline-flex items-center gap-1 font-['Inter'] text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create a new strategy
                  </button>
                ) : (
                  <Link
                    to="/strategy"
                    className="inline-flex items-center gap-1 font-['Inter'] text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create a new strategy
                  </Link>
                )
              ) : null}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {strategies.length ? (
                strategies.map((strategy) => {
                  const selected = strategy.lineage_id === strategyLineageId;
                  return (
                    <label
                      key={strategy.lineage_id}
                      className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-black/10 bg-white hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="content-strategy"
                        checked={selected}
                        onChange={() => {
                          setStrategyLineageId(strategy.lineage_id);
                          setCampaignIdeaId(null);
                          setIcpLineageId("");
                          setShowIdeaForm(false);
                        }}
                        className="mt-1"
                      />
                      <span className="font-['Inter'] text-sm text-foreground truncate">
                        {strategy.title}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="font-['Inter'] text-xs text-foreground/50">
                  {showInlineStrategyCreate
                    ? "No strategies yet — create one below to generate content."
                    : "Create a strategy first, then generate content from it."}
                </p>
              )}
            </div>

            {showInlineStrategyCreate && showStrategyCreate && strategyCreate ? (
              <div className="pt-2">
                <StrategyCreatePanel
                  aims={strategyCreate.aims}
                  icps={strategyCreate.icps}
                  brand={strategyCreate.brand}
                  onGenerate={async (input) => {
                    const record = await strategyCreate.onGenerate(input);
                    const created = record as StrategyRow | null;
                    if (created?.lineage_id) {
                      setStrategyLineageId(created.lineage_id);
                      setCampaignIdeaId(null);
                      setIcpLineageId("");
                    }
                    setShowStrategyCreate(false);
                    return record;
                  }}
                  onClose={() => setShowStrategyCreate(false)}
                />
              </div>
            ) : null}
          </div>

          {selectedStrategy ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-['Inter'] text-sm text-foreground">Campaign idea</p>
                {onAddCampaignIdea && !showIdeaForm ? (
                  <button
                    type="button"
                    onClick={() => setShowIdeaForm(true)}
                    className="inline-flex items-center gap-1 font-['Inter'] text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a campaign idea
                  </button>
                ) : null}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label
                  className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                    campaignIdeaId === null
                      ? "border-primary bg-primary/5"
                      : "border-black/10 bg-white hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="content-campaign-idea"
                    checked={campaignIdeaId === null}
                    onChange={() => setCampaignIdeaId(null)}
                    className="mt-1"
                  />
                  <span className="font-['Inter'] text-sm text-foreground">
                    Strategy-level (whole strategy)
                  </span>
                </label>
                {campaignIdeas.map((idea) => {
                  const selected = campaignIdeaId === idea.id;
                  return (
                    <label
                      key={idea.id}
                      className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-black/10 bg-white hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="content-campaign-idea"
                        checked={selected}
                        onChange={() => setCampaignIdeaId(idea.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="font-['Inter'] text-sm text-foreground block truncate">
                          {idea.name || "Untitled idea"}
                        </span>
                        {idea.hook ? (
                          <span className="font-['Inter'] text-xs text-foreground/55 line-clamp-1">
                            {idea.hook}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>

              {showIdeaForm && onAddCampaignIdea ? (
                <div className="rounded-design border border-black/15 bg-white p-4 space-y-3">
                  <p className="font-['Inter'] text-sm text-foreground">New campaign idea</p>
                  <Input
                    value={ideaName}
                    onChange={(e) => setIdeaName(e.target.value)}
                    placeholder="Idea name"
                    className="border border-black rounded-design"
                  />
                  <Textarea
                    value={ideaHook}
                    onChange={(e) => setIdeaHook(e.target.value)}
                    placeholder="Hook (optional)"
                    className="border border-black rounded-design min-h-[72px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={savingIdea}
                      onClick={() => void handleSaveCampaignIdea()}
                      className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design"
                    >
                      {savingIdea ? "Saving…" : "Save idea"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingIdea}
                      className="border-black rounded-design"
                      onClick={() => {
                        setShowIdeaForm(false);
                        setIdeaName("");
                        setIdeaHook("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="font-['Inter'] text-sm text-foreground">Content type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTENT_ITEM_TYPES.map((type) => {
                const selected = contentType === type;
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-black/10 bg-white hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="content-type"
                      checked={selected}
                      onChange={() => setContentType(type)}
                    />
                    <span className="font-['Inter'] text-sm text-foreground">
                      {CONTENT_TYPE_LABELS[type]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        {singlePersona ? (
          <div className="rounded-design border border-black/10 bg-white px-4 py-3">
            <p className="font-['Inter'] text-sm text-foreground">
              <span className="text-foreground/55">Targeting:</span> {singlePersona.name}
            </p>
            <p className="font-['Inter'] text-xs text-foreground/55 mt-1">
              Inherited from this strategy
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="font-['Inter'] text-sm text-foreground">
                {showPersonaPicker ? "Persona (exactly 1)" : "Persona"}
              </p>
              {showPersonaPicker ? (
                <p className="font-['Inter'] text-xs text-foreground/50">
                  {icpLineageId ? "1/1 selected" : "0/1 selected"}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {showPersonaPicker ? (
                availablePersonas.map((icp) => {
                  const selected = icp.lineage_id === icpLineageId;
                  return (
                    <label
                      key={icp.lineage_id}
                      className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-black/10 bg-white hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="content-persona"
                        checked={selected}
                        onChange={() => setIcpLineageId(icp.lineage_id)}
                        className="mt-1"
                      />
                      <span className="font-['Inter'] text-sm text-foreground truncate">
                        {icp.name}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="font-['Inter'] text-xs text-foreground/50">
                  {selectedStrategy || suggestionMode
                    ? "This strategy has no live persona targets."
                    : "Select a strategy to choose a persona."}
                </p>
              )}
            </div>
            {showPersonaPicker && !icpLineageId ? (
              <p className="font-['Inter'] text-xs text-red-700">Select exactly one persona.</p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6"
        >
          Generate content
        </Button>
      </div>

      {error ? <p className="font-['Inter'] text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
