import { useNavigate } from "react-router-dom";
import type { ContentItemWithComposition } from "../../hooks/useContentItems";
import { CONTENT_TYPE_LABELS } from "../../lib/contentTypeLabels";
import { Button } from "../ui/button";
import { ViewEditButton } from "../ui/ViewEditButton";
import { ArchiveActionTooltip } from "../ArchiveActionTooltip";
import { ContentCompositionBanner } from "./ContentCompositionBanner";
import { exportContentAsPDF } from "../../utils/exportContent";

function clickIsOnControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select"));
}

type Props = {
  item: ContentItemWithComposition;
  onArchive?: () => void;
  onDuplicate?: () => void;
  duplicating?: boolean;
  readOnly?: boolean;
};

export function ContentRosterCard({
  item,
  onArchive,
  onDuplicate,
  duplicating = false,
  readOnly = false,
}: Props) {
  const navigate = useNavigate();
  const typeLabel = CONTENT_TYPE_LABELS[item.type] ?? item.type;
  const statusLabel = item.status === "approved" ? "Approved" : "Draft";
  const openItem = () => navigate(`/content/${item.id}`);

  return (
    <article
      className="app-card app-card-hover cursor-pointer p-8 transition-transform duration-200 hover:-translate-y-0.5"
      onClick={(event) => {
        if (clickIsOnControl(event.target)) return;
        openItem();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="text-left min-w-0 flex-1 max-[480px]:basis-full"
          onClick={openItem}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="app-heading font-['Fraunces'] text-xl text-foreground line-clamp-2"
              title={item.title}
            >
              {item.title}
            </h3>
            <span className="inline-flex items-center rounded-full border border-black/15 bg-accent-grey/30 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] text-foreground/70">
              {typeLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] ${
                item.status === "approved"
                  ? "border-brand-stroke bg-brand-lime/40 text-brand-navy"
                  : "border-brand-stroke bg-brand-coral/30 text-foreground"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/55 mt-1">
            v{item.version}
          </p>
        </button>
        {!readOnly ? (
          <div className="roster-card-actions flex flex-wrap items-center gap-2">
            <ViewEditButton onClick={openItem} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design"
              onClick={() => exportContentAsPDF(item)}
            >
              Export
            </Button>
            {onDuplicate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={duplicating}
                className="border-black rounded-design"
                onClick={onDuplicate}
              >
                {duplicating ? "Duplicating…" : "Duplicate"}
              </Button>
            ) : null}
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
              onClick={() => exportContentAsPDF(item)}
            >
              Export
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <ContentCompositionBanner composition={item.composition} compact />
      </div>
    </article>
  );
}
