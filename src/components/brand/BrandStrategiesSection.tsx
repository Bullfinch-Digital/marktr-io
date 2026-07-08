import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Archive } from "lucide-react";
import { useICPs } from "../../hooks/useICPs";
import { useBrandAims } from "../../hooks/useBrandAims";
import { useBrandStrategies } from "../../hooks/useBrandStrategies";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function BrandStrategiesSection({ brandId }: { brandId: string }) {
  const { icps } = useICPs();
  const { aims, isLoading: aimsLoading } = useBrandAims(brandId);
  const {
    strategies,
    archivedStrategies,
    isLoading: strategiesLoading,
    error,
    createStrategy,
    regenerateStrategy,
    archiveStrategy,
    restoreStrategy,
  } = useBrandStrategies(brandId);

  const [selectedAimLineages, setSelectedAimLineages] = useState<string[]>([]);
  const [selectedIcpLineages, setSelectedIcpLineages] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [expandedLineageId, setExpandedLineageId] = useState<string | null>(null);
  const [restoringLineageId, setRestoringLineageId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const brandIcps = useMemo(() => {
    return (icps || []).filter((x) => x.brand_id === brandId);
  }, [icps, brandId]);

  const aimOptions = aimsLoading
    ? []
    : aims;

  const icpOptions = brandIcps || [];

  const aimCount = selectedAimLineages.length;
  const icpCount = selectedIcpLineages.length;

  const aimError =
    aimCount < 1 || aimCount > 3
      ? "Select 1–3 aims."
      : null;
  const icpError =
    icpCount < 1 || icpCount > 5
      ? "Select 1–5 ICPs."
      : null;

  const canGenerate = !!selectedAimLineages.length &&
    !!selectedIcpLineages.length &&
    !aimError &&
    !icpError &&
    !generating;

  const toggleAim = (lineageId: string) => {
    setSelectedAimLineages((prev) => {
      if (prev.includes(lineageId)) return prev.filter((x) => x !== lineageId);
      if (prev.length >= 3) return prev; // cap
      return [...prev, lineageId];
    });
  };

  const toggleIcp = (lineageId: string) => {
    setSelectedIcpLineages((prev) => {
      if (prev.includes(lineageId)) return prev.filter((x) => x !== lineageId);
      if (prev.length >= 5) return prev; // cap
      return [...prev, lineageId];
    });
  };

  const selectedAimTitles = useMemo(() => {
    const map = new Map(aimOptions.map((a) => [a.lineage_id, a.title]));
    return selectedAimLineages.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [aimOptions, selectedAimLineages]);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const channelValue = channel && channel.trim() ? channel.trim() : null;
      const toneValue = tone && tone.trim() ? tone.trim() : null;
      await createStrategy({
        aimLineageIds: uniq(selectedAimLineages),
        icpLineageIds: uniq(selectedIcpLineages),
        title: title.trim() || undefined,
        channel: channelValue,
        tone: toneValue,
      });
      setTitle("");
      setSelectedAimLineages([]);
      setSelectedIcpLineages([]);
    } finally {
      setGenerating(false);
    }
  };

  const strategySummary = (s: typeof strategies[number]) => {
    const aimsText = s.aims.length
      ? s.aims.map((a) => a.aim_type).slice(0, 3).join(", ")
      : "No aims (legacy)";
    const icpsText = s.icps.length ? `${s.icps.length} ICPs` : "0 ICPs";
    return `${aimsText} · ${icpsText}`;
  };

  const renderStrategyContent = (strategy: any) => {
    const positioning = strategy?.positioning;
    const messaging = strategy?.messaging;
    const offer = strategy?.offer;
    const channelPlan = strategy?.channel_plan;
    const campaigns = strategy?.campaign_ideas || [];
    const success = strategy?.success_metrics;

    return (
      <div className="space-y-3">
        {positioning ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Positioning</p>
            <p className="font-['Inter'] text-sm text-foreground/80 font-medium mt-1">
              {positioning.one_liner}
            </p>
            <p className="font-['Inter'] text-xs text-foreground/70 mt-1 whitespace-pre-wrap">
              {positioning.why_us}
            </p>
          </div>
        ) : null}

        {messaging ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Messaging</p>
            <ul className="list-disc list-inside text-sm text-foreground/80 font-['Inter'] mt-1 space-y-1">
              {(messaging.value_props || []).slice(0, 3).map((x: string, i: number) => (
                <li key={`vp-${i}`}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {campaigns?.length ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Campaign ideas</p>
            <div className="space-y-2 mt-2">
              {campaigns.slice(0, 3).map((c: any, i: number) => (
                <div key={`camp-${i}`} className="rounded-design border border-black/10 p-2 bg-accent-grey/10">
                  <p className="font-['Inter'] text-sm text-foreground/85 font-medium">
                    {c.name}
                  </p>
                  <p className="font-['Inter'] text-xs text-foreground/70 mt-1">
                    {c.hook}
                  </p>
                  <p className="font-['Inter'] text-xs text-foreground/60 mt-1">
                    Angle: {c.angle}
                  </p>
                  <p className="font-['Inter'] text-xs text-foreground/60 mt-1">
                    CTA: {c.cta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {offer ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Offer</p>
            <p className="font-['Inter'] text-sm text-foreground/80 mt-1">
              {offer.recommended_offer}
            </p>
          </div>
        ) : null}

        {channelPlan ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Channel plan</p>
            <p className="font-['Inter'] text-sm text-foreground/80 mt-1">
              Primary: {channelPlan.primary_channel}
            </p>
          </div>
        ) : null}

        {success ? (
          <div className="border border-black/10 rounded-design p-3 bg-white">
            <p className="font-['Inter'] text-xs text-foreground/60">Success metrics</p>
            <p className="font-['Inter'] text-xs text-foreground/70 mt-1">
              KPIs: {(success.kpis || []).slice(0, 5).join(", ")}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mt-6 bg-background border border-black rounded-design p-8 shadow-md animate-fade-in-up space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-['Fraunces'] text-2xl">Strategy (test playground)</h2>
          <p className="font-['Inter'] text-sm text-foreground/70">
            Generate a single strategy from {`1–3`} brand aims and {`1–5`} ICP targets.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            className="border-black rounded-design"
            disabled={generating}
            onClick={() => {
              setSelectedAimLineages([]);
              setSelectedIcpLineages([]);
              setTitle("");
              setChannel(null);
              setTone(null);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="font-['Inter'] text-xs text-foreground/60">Select aims (1–3)</p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {aimOptions.length ? (
              aimOptions.map((a) => (
                <label
                  key={a.lineage_id}
                  className="flex items-start gap-2 rounded-design border border-black/10 bg-accent-grey/10 px-3 py-2 cursor-pointer hover:bg-accent-grey/20"
                >
                  <input
                    type="checkbox"
                    checked={selectedAimLineages.includes(a.lineage_id)}
                    onChange={() => toggleAim(a.lineage_id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="font-['Inter'] text-sm text-foreground/85 block truncate">
                      {a.title}
                    </span>
                    <span className="font-['Inter'] text-xs text-foreground/55">
                      {a.aim_type} · v{a.version}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="font-['Inter'] text-xs text-foreground/50">No current aims yet.</p>
            )}
          </div>

          {aimError ? (
            <p className="text-xs font-['Inter'] text-red-700">{aimError}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="font-['Inter'] text-xs text-foreground/60">Select ICPs (1–5)</p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {icpOptions.length ? (
              icpOptions.map((icp) => (
                <label
                  key={icp.id}
                  className="flex items-start gap-2 rounded-design border border-black/10 bg-accent-grey/10 px-3 py-2 cursor-pointer hover:bg-accent-grey/20"
                >
                  <input
                    type="checkbox"
                    checked={icp.lineage_id ? selectedIcpLineages.includes(icp.lineage_id) : false}
                    onChange={() => {
                      if (!icp.lineage_id) return;
                      toggleIcp(icp.lineage_id);
                    }}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="font-['Inter'] text-sm text-foreground/85 block truncate">
                      {icp.name}
                    </span>
                    <span className="font-['Inter'] text-xs text-foreground/55">
                      {icp.industry || "Industry not set"}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <p className="font-['Inter'] text-xs text-foreground/50">No current ICPs found for this brand.</p>
            )}
          </div>

          {icpError ? (
            <p className="text-xs font-['Inter'] text-red-700">{icpError}</p>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="font-['Inter'] text-sm text-foreground/70">Strategy title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-black rounded-design"
                placeholder="e.g. Spiced Apple awareness campaign"
              />
            </div>
            <div className="space-y-2">
              <label className="font-['Inter'] text-sm text-foreground/70">Preferred channel (optional)</label>
              <Input
                value={channel ?? ""}
                onChange={(e) => setChannel(e.target.value || null)}
                className="border-black rounded-design"
                placeholder="e.g. Email, Search, Paid social"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-['Inter'] text-sm text-foreground/70">Tone (optional)</label>
            <Input
              value={tone ?? ""}
              onChange={(e) => setTone(e.target.value || null)}
              className="border-black rounded-design"
              placeholder="e.g. Friendly, Direct, Premium"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6 py-3"
            >
              {generating ? "Generating…" : "Generate strategy"}
            </Button>
            <p className="font-['Inter'] text-xs text-foreground/60">
              {selectedAimTitles.length ? `Aims: ${selectedAimTitles.join(", ")}` : "Select aims to continue."}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-['Inter'] text-xs text-foreground/60 mb-2">Current strategies</p>
          </div>
          {strategiesLoading ? (
            <p className="font-['Inter'] text-xs text-foreground/50">Loading…</p>
          ) : null}
        </div>

        {error ? <p className="font-['Inter'] text-xs text-red-700">{error}</p> : null}

        {strategies.length ? (
          <div className="space-y-3">
            {strategies.map((s) => {
              const isOpen = expandedLineageId === s.lineage_id;
              const aimCountForRegen = s.aims.length;
              return (
                <div key={s.id} className="rounded-design border border-black/15 bg-accent-grey/10 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="text-left w-full"
                        onClick={() =>
                          setExpandedLineageId((prev) => (prev === s.lineage_id ? null : s.lineage_id))
                        }
                      >
                        <p className="font-['Fraunces'] text-lg text-foreground truncate">
                          {s.title}
                        </p>
                        <p className="font-['Inter'] text-xs text-foreground/55 mt-0.5">
                          v{s.version} · updated {formatDate(s.updated_at)} · {strategySummary(s)}
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-black rounded-design"
                        disabled={aimCountForRegen < 1}
                        onClick={() =>
                          void regenerateStrategy({
                            strategyId: s.id,
                            aimLineageIds: s.aims.map((a) => a.lineage_id),
                            icpLineageIds: s.icps.map((i) => i.lineage_id || "").filter(Boolean) as string[],
                            title: s.title,
                            channel: s.channel?.[0] ?? null,
                            tone: null,
                          })
                        }
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-black rounded-design"
                        onClick={() => void archiveStrategy(s.lineage_id)}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" />
                        Archive
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-3">{renderStrategyContent(s.strategy)}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-['Inter'] text-sm text-foreground/60">No strategies yet for this brand.</p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setArchivedOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80 transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
            Archived
            {archivedStrategies.length ? ` (${archivedStrategies.length})` : ""}
            {archivedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {archivedOpen ? (
            archivedStrategies.length ? (
              <div className="mt-3 space-y-2">
                {archivedStrategies.map((s) => (
                  <div key={s.id} className="rounded-design border border-black/10 bg-white/70 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-['Inter'] text-sm text-foreground truncate">{s.title}</p>
                      <p className="font-['Inter'] text-xs text-foreground/55 mt-0.5">
                        archived · updated {formatDate(s.updated_at)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-black rounded-design"
                      disabled={restoringLineageId === s.lineage_id}
                      onClick={() => {
                        setRestoringLineageId(s.lineage_id);
                        void restoreStrategy(s.lineage_id).finally(() => setRestoringLineageId(null));
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {restoringLineageId === s.lineage_id ? "Restoring…" : "Restore"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-['Inter'] text-xs text-foreground/50">Nothing archived.</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

