import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { StrategyWithLinks } from "../../hooks/useBrandStrategies";
import { StrategyCompositionBanner } from "./StrategyCompositionBanner";
import { StrategyContentView } from "./StrategyContentView";
import { Button } from "../ui/button";
import { ArchiveActionTooltip } from "../ArchiveActionTooltip";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  strategy: StrategyWithLinks;
  onArchive?: () => void;
  readOnly?: boolean;
};

export function StrategyRosterCard({ strategy, onArchive, readOnly = false }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const oneLiner = strategy.strategy?.positioning?.one_liner;

  const previewText = useMemo(() => {
    if (oneLiner) return oneLiner;
    return "Open to view the full strategy.";
  }, [oneLiner]);

  return (
    <article className="rounded-design border border-black/15 bg-white p-5 shadow-sm hover:border-black/25 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="text-left min-w-0 flex-1"
          onClick={() => navigate(`/strategy/${strategy.id}`)}
        >
          <h3 className="font-['Fraunces'] text-xl text-[#0D1833] truncate">{strategy.title}</h3>
          <p className="font-['Inter'] text-xs text-foreground/55 mt-1">
            v{strategy.version} · updated {formatDate(strategy.updated_at)}
          </p>
        </button>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design gap-1.5"
              onClick={() => navigate(`/strategy/${strategy.id}`)}
            >
              <Plus className="h-3.5 w-3.5" />
              Edit
            </Button>
            {onArchive ? (
              <ArchiveActionTooltip>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-black rounded-design"
                  onClick={onArchive}
                >
                  Archive
                </Button>
              </ArchiveActionTooltip>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <StrategyCompositionBanner aims={strategy.aims} icps={strategy.icps} compact />
      </div>

      <p className="font-['Inter'] text-sm text-foreground/75 mt-3 line-clamp-2">{previewText}</p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 font-['Inter'] text-xs text-foreground/55 hover:text-foreground/80"
      >
        {expanded ? "Hide preview" : "Expand preview"}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded ? (
        <div className="mt-3 border-t border-black/10 pt-3">
          <StrategyContentView strategy={strategy.strategy} compact />
        </div>
      ) : null}
    </article>
  );
}
