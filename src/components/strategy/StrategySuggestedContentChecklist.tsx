import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Circle } from "lucide-react";
import { Button } from "../ui/button";
import type { ICPStrategyPayload, SuggestedContentItem } from "../../types/icpStrategyPayload";
import type { CompositionIcp } from "../../lib/strategyComposition";
import {
  fetchCurrentContentItemBySuggestedId,
  fetchDoneSuggestedContentIds,
} from "../../lib/contentComposition";
import {
  buildContentLauncherIntent,
  CONTENT_LAUNCHER_STATE_KEY,
} from "../../lib/contentLauncherState";
import { CONTENT_TYPE_LABELS } from "../../lib/contentTypeLabels";
import { isContentItemType } from "../../lib/contentItemPayload";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  brandId: string;
  strategyLineageId: string;
  strategyTitle: string;
  strategy: ICPStrategyPayload;
  icps: CompositionIcp[];
};

type ChecklistRow = SuggestedContentItem & {
  ideaRemoved: boolean;
  ideaName: string;
};

export function StrategySuggestedContentChecklist({
  brandId,
  strategyLineageId,
  strategyTitle,
  strategy,
  icps,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [doneItemIds, setDoneItemIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const suggestions = Array.isArray(strategy.suggested_content)
    ? strategy.suggested_content
    : [];

  const campaignIdeas = Array.isArray(strategy.campaign_ideas) ? strategy.campaign_ideas : [];

  const rows: ChecklistRow[] = useMemo(() => {
    return suggestions.map((suggestion) => {
      if (!suggestion.campaign_idea_id) {
        return {
          ...suggestion,
          ideaRemoved: false,
          ideaName: "whole strategy",
        };
      }
      const match = campaignIdeas.find((idea) => idea.id === suggestion.campaign_idea_id);
      if (match) {
        return {
          ...suggestion,
          ideaRemoved: false,
          ideaName: match.name || suggestion.campaign_idea_name_snapshot || "Campaign idea",
        };
      }
      return {
        ...suggestion,
        ideaRemoved: true,
        ideaName:
          suggestion.campaign_idea_name_snapshot?.trim() || "Campaign idea",
      };
    });
  }, [suggestions, campaignIdeas]);

  const refreshDone = useCallback(async () => {
    if (!user?.id || !brandId || !strategyLineageId) {
      setDoneIds(new Set());
      setDoneItemIds({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ids = await fetchDoneSuggestedContentIds(user.id, brandId, strategyLineageId);
      setDoneIds(ids);
      const map: Record<string, string> = {};
      await Promise.all(
        Array.from(ids).map(async (suggestedId) => {
          const item = await fetchCurrentContentItemBySuggestedId(user.id, suggestedId);
          if (item?.id) map[suggestedId] = item.id;
        })
      );
      setDoneItemIds(map);
    } catch (err) {
      console.error("[StrategySuggestedContentChecklist] refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, brandId, strategyLineageId]);

  useEffect(() => {
    void refreshDone();
  }, [refreshDone]);

  useEffect(() => {
    const onChanged = () => void refreshDone();
    window.addEventListener("content-items:changed", onChanged);
    return () => window.removeEventListener("content-items:changed", onChanged);
  }, [refreshDone]);

  const defaultPersona = useMemo(() => {
    const live = icps.find((icp) => icp.linkState === "live");
    return live || icps[0] || null;
  }, [icps]);

  const handleCreate = (row: ChecklistRow) => {
    if (!isContentItemType(row.type)) return;
    // Orphaned idea → create as strategy-level so generate-content accepts it,
    // while still linking suggested_content_id so the checklist ticks off.
    const campaignIdeaId = row.ideaRemoved ? null : row.campaign_idea_id;
    const intent = buildContentLauncherIntent({
      brandId,
      strategyLineageId,
      strategyTitle,
      campaignIdeaId,
      campaignIdeaName: row.ideaRemoved
        ? null
        : row.campaign_idea_id
          ? row.ideaName
          : null,
      icpLineageId: defaultPersona?.lineage_id ?? null,
      icpName: defaultPersona?.name ?? null,
      type: row.type,
      suggestedContentId: row.id,
      rationale: row.rationale,
      campaignIdeaRemoved: row.ideaRemoved,
    });
    navigate("/content", {
      state: { [CONTENT_LAUNCHER_STATE_KEY]: intent },
    });
  };

  if (suggestions.length === 0) {
    return (
      <div className="rounded-design border border-black/10 bg-accent-grey/10 px-4 py-3">
        <p className="font-['Inter'] text-sm text-foreground/65">
          This strategy has no suggested content checklist.{" "}
          <Link to="/content" className="underline underline-offset-2">
            Create a piece freehand
          </Link>{" "}
          in Content.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-design border border-black/15 bg-white p-4 space-y-3">
      <div>
        <h2 className="font-['Fraunces'] text-lg text-[#0D1833]">Suggested content</h2>
        <p className="font-['Inter'] text-xs text-foreground/55 mt-1">
          Prioritised pieces from this strategy. Create them in Content — nothing generates here.
        </p>
      </div>

      {loading ? (
        <p className="font-['Inter'] text-xs text-foreground/50">Checking progress…</p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((row) => {
          const done = doneIds.has(row.id);
          const contentId = doneItemIds[row.id];
          const typeLabel = isContentItemType(row.type)
            ? CONTENT_TYPE_LABELS[row.type]
            : row.type;

          return (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-design border border-black/10 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1 flex gap-2">
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <Circle className="h-4 w-4 text-foreground/30" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-black/15 bg-accent-grey/30 px-2 py-0.5 font-['Inter'] text-[10px]">
                      {typeLabel}
                    </span>
                    <span className="font-['Inter'] text-xs text-foreground/60">
                      {row.ideaRemoved ? (
                        <>
                          (removed: {row.ideaName})
                        </>
                      ) : (
                        row.ideaName
                      )}
                    </span>
                  </div>
                  <p className="font-['Inter'] text-sm text-foreground/80 mt-1">{row.rationale}</p>
                  {row.ideaRemoved ? (
                    <p className="font-['Inter'] text-[11px] text-amber-800 mt-1">
                      Campaign idea no longer on this strategy — create as strategy-level.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0">
                {done && contentId ? (
                  <Link
                    to={`/content/${contentId}`}
                    className="inline-flex items-center h-8 px-3 rounded-design border border-black font-['Inter'] text-xs hover:bg-accent-grey/30"
                  >
                    Open
                  </Link>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design h-8"
                    onClick={() => handleCreate(row)}
                  >
                    Create this
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
