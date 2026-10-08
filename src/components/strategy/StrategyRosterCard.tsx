import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { StrategyWithLinks } from "../../hooks/useBrandStrategies";
import { StrategyCompositionBanner } from "./StrategyCompositionBanner";
import { StrategyContentView } from "./StrategyContentView";
import { Button } from "../ui/button";
import { ViewEditButton } from "../ui/ViewEditButton";
import { ArchiveActionTooltip } from "../ArchiveActionTooltip";
import { exportStrategyAsPDF } from "../../utils/exportStrategy";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function clickIsOnControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select"));
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
  const openStrategy = () => navigate(`/strategy/${strategy.id}`);

  const previewText = useMemo(() => {
    if (oneLiner) return oneLiner;
    return "Open to view the full strategy.";
  }, [oneLiner]);

  return (
    <article
      className="app-card app-card-hover cursor-pointer p-8 transition-transform duration-200 hover:-translate-y-0.5"
      onClick={(event) => {
        if (clickIsOnControl(event.target)) return;
        openStrategy();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="text-left min-w-0 flex-1 max-[480px]:basis-full"
          onClick={openStrategy}
        >
          <h3
            className="app-heading font-['Fraunces'] text-xl text-foreground line-clamp-2"
            title={strategy.title}
          >
            {strategy.title}
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/55 mt-1">
            v{strategy.version} · updated {formatDate(strategy.updated_at)}
          </p>
        </button>
        {!readOnly ? (
          <div className="roster-card-actions flex flex-wrap items-center gap-2">
            <ViewEditButton onClick={openStrategy} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design"
              onClick={() => exportStrategyAsPDF(strategy)}
            >
              Export
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
        ) : (
          <div className="roster-card-actions flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design"
              onClick={() => exportStrategyAsPDF(strategy)}
            >
              Export
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <StrategyCompositionBanner aims={strategy.aims} icps={strategy.icps} compact />
      </div>

      <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/75 mt-3 line-clamp-2">{previewText}</p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 font-['Plus_Jakarta_Sans'] text-xs text-foreground/55 hover:text-foreground/80"
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
