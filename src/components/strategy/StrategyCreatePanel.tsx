import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { BrandAim } from "../../hooks/useBrandAims";
import type { ICP } from "../../hooks/useICPs";

const GENERATION_LOADING_ITEMS = [
  "Reading your brand aims",
  "Reviewing target personas",
  "Analysing brand context",
  "Structuring positioning and messaging",
  "Building campaign ideas and channel plan",
  "Writing your strategy…",
] as const;

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

type Props = {
  aims: BrandAim[];
  icps: ICP[];
  onGenerate: (input: {
    aimLineageIds: string[];
    icpLineageIds: string[];
    title?: string;
    channel?: string | null;
    tone?: string | null;
  }) => Promise<unknown>;
  onClose: () => void;
};

export function StrategyCreatePanel({ aims, icps, onGenerate, onClose }: Props) {
  const [selectedAimLineages, setSelectedAimLineages] = useState<string[]>([]);
  const [selectedIcpLineages, setSelectedIcpLineages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [tone, setTone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const aimCount = selectedAimLineages.length;
  const icpCount = selectedIcpLineages.length;

  const aimCapMessage =
    aimCount === 0
      ? "Select at least 1 aim."
      : aimCount > 3
      ? "Maximum 3 aims."
      : null;
  const icpCapMessage =
    icpCount === 0
      ? "Select at least 1 persona."
      : icpCount > 5
      ? "Maximum 5 personas."
      : null;

  const atAimCap = aimCount >= 3;
  const atIcpCap = icpCount >= 5;

  const canGenerate =
    aimCount >= 1 &&
    aimCount <= 3 &&
    icpCount >= 1 &&
    icpCount <= 5 &&
    !generating;

  const selectedAimTitles = useMemo(() => {
    const map = new Map(aims.map((a) => [a.lineage_id, a.title]));
    return selectedAimLineages.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [aims, selectedAimLineages]);

  const toggleAim = (lineageId: string) => {
    setSelectedAimLineages((prev) => {
      if (prev.includes(lineageId)) return prev.filter((x) => x !== lineageId);
      if (prev.length >= 3) return prev;
      return [...prev, lineageId];
    });
  };

  const toggleIcp = (lineageId: string) => {
    setSelectedIcpLineages((prev) => {
      if (prev.includes(lineageId)) return prev.filter((x) => x !== lineageId);
      if (prev.length >= 5) return prev;
      return [...prev, lineageId];
    });
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    setGenerating(true);
    setCompletedCount(0);

    const timers: number[] = [];
    const checklistPromise = new Promise<void>((resolve) => {
      for (let i = 1; i <= GENERATION_LOADING_ITEMS.length; i += 1) {
        timers.push(
          window.setTimeout(() => setCompletedCount(i), i * 3500)
        );
      }
      timers.push(
        window.setTimeout(() => resolve(), GENERATION_LOADING_ITEMS.length * 3500 + 500)
      );
    });

    try {
      await Promise.all([
        onGenerate({
          aimLineageIds: uniq(selectedAimLineages),
          icpLineageIds: uniq(selectedIcpLineages),
          title: title.trim() || undefined,
          channel: channel.trim() || null,
          tone: tone.trim() || null,
        }),
        checklistPromise,
      ]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate strategy.");
    } finally {
      timers.forEach((t) => window.clearTimeout(t));
      setGenerating(false);
      setCompletedCount(0);
    }
  };

  if (generating) {
    return (
      <div className="rounded-design border border-black bg-white p-6 lg:p-8 shadow-md">
        <h3 className="font-['Fraunces'] text-2xl text-[#0D1833]">Generating your strategy…</h3>
        <p className="font-['Inter'] text-sm text-foreground/65 mt-2">
          This usually takes about 30 seconds. You can refine the result after it&apos;s ready.
        </p>
        <div className="mt-6 space-y-3">
          {GENERATION_LOADING_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active = index === completedCount && completedCount < GENERATION_LOADING_ITEMS.length;
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

  return (
    <div className="rounded-design border border-black bg-accent-grey/15 p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-['Fraunces'] text-2xl text-[#0D1833]">New strategy</h3>
          <p className="font-['Inter'] text-sm text-foreground/70 mt-1">
            Select 1–3 aims and 1–5 personas. marktr generates a structured strategy you can
            refine through edits and versions — not endless regeneration.
          </p>
        </div>
        <Button type="button" variant="outline" className="border-black rounded-design" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-['Inter'] text-sm text-foreground">Aims (1–3)</p>
            <p className="font-['Inter'] text-xs text-foreground/50">{aimCount}/3 selected</p>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {aims.length ? (
              aims.map((a) => {
                const selected = selectedAimLineages.includes(a.lineage_id);
                const disabled = !selected && atAimCap;
                return (
                  <label
                    key={a.lineage_id}
                    className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                      disabled
                        ? "border-black/5 bg-accent-grey/5 opacity-50 cursor-not-allowed"
                        : selected
                        ? "border-primary bg-primary/5"
                        : "border-black/10 bg-white hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleAim(a.lineage_id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="font-['Inter'] text-sm text-foreground block truncate">
                        {a.title}
                      </span>
                      <span className="font-['Inter'] text-xs text-foreground/55">{a.aim_type}</span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="font-['Inter'] text-xs text-foreground/50">
                Add at least one aim above before generating a strategy.
              </p>
            )}
          </div>
          {aimCapMessage ? (
            <p className="font-['Inter'] text-xs text-red-700">{aimCapMessage}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-['Inter'] text-sm text-foreground">Personas (1–5)</p>
            <p className="font-['Inter'] text-xs text-foreground/50">{icpCount}/5 selected</p>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {icps.length ? (
              icps.map((icp) => {
                const lineageId = icp.lineage_id;
                if (!lineageId) return null;
                const selected = selectedIcpLineages.includes(lineageId);
                const disabled = !selected && atIcpCap;
                return (
                  <label
                    key={icp.id}
                    className={`flex items-start gap-2 rounded-design border px-3 py-2 cursor-pointer ${
                      disabled
                        ? "border-black/5 bg-accent-grey/5 opacity-50 cursor-not-allowed"
                        : selected
                        ? "border-primary bg-primary/5"
                        : "border-black/10 bg-white hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleIcp(lineageId)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="font-['Inter'] text-sm text-foreground block truncate">
                        {icp.name}
                      </span>
                      <span className="font-['Inter'] text-xs text-foreground/55">
                        {icp.industry || "Industry not set"}
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="font-['Inter'] text-xs text-foreground/50">
                No current personas for this brand. Create ICPs first.
              </p>
            )}
          </div>
          {icpCapMessage ? (
            <p className="font-['Inter'] text-xs text-red-700">{icpCapMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="font-['Inter'] text-sm text-foreground/70">Title (optional)</label>
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
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="border-black rounded-design"
            placeholder="e.g. Email, Search, Paid social"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-['Inter'] text-sm text-foreground/70">Tone (optional)</label>
        <Input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="border-black rounded-design"
          placeholder="e.g. Friendly, Direct, Premium"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design px-6"
        >
          Generate strategy
        </Button>
        {selectedAimTitles.length > 0 ? (
          <p className="font-['Inter'] text-xs text-foreground/60">
            Serving: {selectedAimTitles.join(", ")}
          </p>
        ) : null}
      </div>

      {error ? <p className="font-['Inter'] text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
