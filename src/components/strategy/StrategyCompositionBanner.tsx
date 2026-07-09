import {
  compositionHasArchivedLinks,
  formatCompositionSentence,
  type CompositionAim,
  type CompositionIcp,
} from "../../lib/strategyComposition";
import type { BrandAimType } from "../../lib/brandAimVersioning";

export const AIM_TYPE_LABELS: Record<BrandAimType, string> = {
  awareness: "Awareness",
  leads: "Leads",
  enquiries: "Enquiries",
  sales: "Sales",
  retention: "Retention",
};

type Props = {
  aims: CompositionAim[];
  icps: CompositionIcp[];
  showGentleFlag?: boolean;
  compact?: boolean;
};

export function StrategyCompositionBanner({
  aims,
  icps,
  showGentleFlag = true,
  compact = false,
}: Props) {
  const hasArchived = showGentleFlag && compositionHasArchivedLinks(aims, icps);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className="font-['Inter'] text-sm text-foreground/75">
        {formatCompositionSentence(aims, icps)}
      </p>

      <div className="flex flex-wrap gap-2">
        {aims.map((aim) => (
          <span
            key={aim.lineage_id}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
              aim.isArchived
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-primary/30 bg-primary/5 text-primary"
            }`}
          >
            {AIM_TYPE_LABELS[aim.aim_type]}
            <span className="text-foreground/50">·</span>
            {aim.title}
            {aim.isArchived ? <span className="text-amber-700">(archived)</span> : null}
          </span>
        ))}
        {icps.map((icp) => (
          <span
            key={icp.lineage_id}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
              icp.isArchived
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-black/20 bg-accent-grey/30 text-foreground/80"
            }`}
          >
            {icp.name}
            {icp.isArchived ? <span className="ml-1 text-amber-700">(archived)</span> : null}
          </span>
        ))}
      </div>

      {hasArchived ? (
        <p className="font-['Inter'] text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-design px-3 py-2 max-w-2xl">
          This strategy targets an archived aim or persona — review it before acting on it.
        </p>
      ) : null}
    </div>
  );
}
