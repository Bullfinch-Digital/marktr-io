import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { GenerationErrorNotice } from "../GenerationErrorNotice";
import { ContentItemView } from "../content/ContentItemView";
import { useContentItems } from "../../hooks/useContentItems";
import { track } from "../../lib/analytics";
import { CONTENT_TYPE_LABELS } from "../../lib/contentTypeLabels";
import { CONTENT_ITEM_TYPES, type ContentItemRow, type ContentItemType } from "../../types/contentItemPayload";
import { contentItemPlainText } from "../../utils/exportContent";
import { linkContentToDay } from "../../lib/plans";
import type { PlanStrategyContext } from "../../lib/planStrategy";

const GENERATION_LOADING_ITEMS = [
  "Reading your strategy",
  "Focusing on today’s brief",
  "Matching the customer profile",
  "Shaping channel-native copy",
  "Writing your content…",
] as const;

type Props = {
  planDayId: string;
  brandId: string;
  strategy: PlanStrategyContext;
  brief: string;
  onBriefChange: (value: string) => void;
  channel: string | null;
  format: string | null;
  contentType: ContentItemType;
  onContentTypeChange: (type: ContentItemType) => void;
  learnedSoFar: string;
  versions: ContentItemRow[];
  onVersionsChange: (items: ContentItemRow[]) => void;
};

async function copyDraft(item: ContentItemRow) {
  const text = contentItemPlainText(item.type, item.title, item.content);
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard.");
}

export function PlanDayContentGenerator({
  planDayId,
  brandId,
  strategy,
  brief,
  onBriefChange,
  channel,
  format,
  contentType,
  onContentTypeChange,
  learnedSoFar,
  versions,
  onVersionsChange,
}: Props) {
  const { createContent } = useContentItems(brandId);
  const [icpLineageId, setIcpLineageId] = useState(strategy.icps[0]?.lineageId ?? "");
  const [generating, setGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [generationFailures, setGenerationFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedIcp = useMemo(
    () => strategy.icps.find((icp) => icp.lineageId === icpLineageId) ?? strategy.icps[0] ?? null,
    [icpLineageId, strategy.icps]
  );
  const latest = versions[0] ?? null;

  const canGenerate = Boolean(brandId && strategy.lineageId && selectedIcp && contentType && !generating);

  const generate = async (variation: boolean) => {
    if (!canGenerate || !selectedIcp) return;
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
        createContent({
          strategyLineageId: strategy.lineageId,
          campaignIdeaId: null,
          icpLineageId: selectedIcp.lineageId,
          type: contentType,
          brief: brief.trim() || null,
          channel,
          format,
          learnedSoFar: learnedSoFar || null,
          ...(variation && latest
            ? {
                previousDraft: { title: latest.title, content: latest.content },
                variationInstruction: "Try a different angle.",
              }
            : {}),
        }),
        checklistPromise,
      ]);
      if (!record) {
        throw new Error("Generation returned no content");
      }
      try {
        await linkContentToDay(planDayId, record.id);
      } catch (linkError) {
        console.error("[PlanDayContentGenerator] linkContentToDay failed", linkError);
        toast.error("Saved to Content, but we couldn’t link it to this day.");
      }
      onVersionsChange([record, ...versions.filter((item) => item.id !== record.id)]);
      setGenerationFailures(0);
      track(variation ? "plan_content_another_version" : "plan_content_generated", {
        location: "plan_day_page",
        content_type: contentType,
      });
    } catch (err) {
      console.error("[PlanDayContentGenerator] generate failed", err);
      setGenerationFailures((count) => count + 1);
      setError("We couldn’t generate that. Try again in a moment.");
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      setGenerating(false);
      setCompletedCount(0);
    }
  };

  if (generating) {
    return (
      <div className="rounded-[24px] border-2 border-brand-stroke bg-card p-5">
        <h3 className="font-['Fraunces'] text-2xl text-foreground">Writing today’s piece…</h3>
        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-foreground/65">
          This usually takes about 30 seconds.
        </p>
        <div className="mt-6 space-y-3">
          {GENERATION_LOADING_ITEMS.map((item, index) => {
            const done = index < completedCount;
            const active =
              index === completedCount && completedCount < GENERATION_LOADING_ITEMS.length;
            return (
              <div key={item} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                ) : (
                  <Loader2
                    className={`h-5 w-5 ${active ? "animate-spin text-foreground/70" : "text-foreground/30"}`}
                  />
                )}
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">{item}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border-2 border-brand-stroke bg-card p-5 space-y-4">
        <div>
          <h2 className="font-['Fraunces'] text-xl text-foreground">Your content for today</h2>
          <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/65">
            Edit the brief, then generate. We save the draft to your Content library.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
            Brief
          </span>
          <Textarea
            value={brief}
            onChange={(event) => onBriefChange(event.target.value)}
            rows={5}
            placeholder="What should today’s piece say, and who is it for?"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {channel ? (
            <span className="rounded-full border-2 border-brand-stroke px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px]">
              {channel}
            </span>
          ) : null}
          {format ? (
            <span className="rounded-full border-2 border-brand-stroke px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px]">
              {format}
            </span>
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
            Format
          </span>
          <select
            value={contentType}
            onChange={(event) => onContentTypeChange(event.target.value as ContentItemType)}
            className="h-11 w-full rounded-[15px] border-2 border-brand-stroke bg-card px-3 font-['Plus_Jakarta_Sans'] text-sm text-foreground"
          >
            {CONTENT_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {CONTENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[16px] border-2 border-brand-stroke/70 bg-muted/20 px-3 py-3 space-y-2">
          <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
            Customer profile
          </p>
          {strategy.icps.length === 0 ? (
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
              This strategy has no live customer profile. Add one on the strategy to generate.
            </p>
          ) : strategy.icps.length === 1 ? (
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">{selectedIcp?.name}</p>
              {selectedIcp?.description ? (
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs text-foreground/65">
                  {selectedIcp.description}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {strategy.icps.map((icp) => (
                <label
                  key={icp.lineageId}
                  className="flex items-start gap-2 rounded-[12px] border-2 border-brand-stroke bg-card px-3 py-2"
                >
                  <input
                    type="radio"
                    name="plan-day-icp"
                    checked={icpLineageId === icp.lineageId}
                    onChange={() => setIcpLineageId(icp.lineageId)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-['Plus_Jakarta_Sans'] text-sm text-foreground">
                      {icp.name}
                    </span>
                    {icp.description ? (
                      <span className="mt-0.5 block font-['Plus_Jakarta_Sans'] text-xs text-foreground/65">
                        {icp.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}
          {strategy.aims.length > 0 ? (
            <div className="pt-1">
              <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Aims
              </p>
              <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
                {strategy.aims.map((aim) => aim.title).join(" · ")}
              </p>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          disabled={!canGenerate || strategy.icps.length === 0}
          data-track-id="plan_generate_content"
          data-track-location="plan_day_page"
          onClick={() => void generate(false)}
        >
          Generate
        </Button>
        {error ? (
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : null}
        <GenerationErrorNotice
          failures={generationFailures}
          onRetry={() => void generate(Boolean(latest))}
          retrying={generating}
        />
      </section>

      {latest ? (
        <section className="rounded-[24px] border-2 border-brand-stroke bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Draft
              </p>
              <h3 className="mt-1 font-['Fraunces'] text-2xl text-foreground">{latest.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyDraft(latest)}>
                Copy
              </Button>
              <Button type="button" variant="outline" size="sm" href={`/content/${latest.id}`}>
                Edit
              </Button>
            </div>
          </div>
          <ContentItemView type={latest.type} content={latest.content} compact />
          <Button
            type="button"
            variant="outline"
            disabled={!canGenerate}
            data-track-id="plan_another_version"
            data-track-location="plan_day_page"
            onClick={() => void generate(true)}
          >
            Make another version
          </Button>
        </section>
      ) : null}

      {versions.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-['Fraunces'] text-lg text-foreground">Versions</h3>
          {versions.map((item) => (
            <article
              key={item.id}
              className="rounded-[20px] border-2 border-brand-stroke bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/55">
                    {CONTENT_TYPE_LABELS[item.type]}
                    {item.id === latest?.id ? " · latest" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void copyDraft(item)}>
                    Copy
                  </Button>
                  <Link
                    to={`/content/${item.id}`}
                    className="inline-flex h-9 items-center rounded-full border-2 border-brand-stroke px-3 font-['Plus_Jakarta_Sans'] text-xs font-semibold"
                  >
                    Open in Content library
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
