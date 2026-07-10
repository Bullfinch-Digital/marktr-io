import { useNavigate } from "react-router-dom";
import type { ContentItemWithComposition } from "../../hooks/useContentItems";
import { CONTENT_TYPE_LABELS } from "../../lib/contentTypeLabels";
import { Button } from "../ui/button";
import { ArchiveActionTooltip } from "../ArchiveActionTooltip";
import { ContentCompositionBanner } from "./ContentCompositionBanner";

type Props = {
  item: ContentItemWithComposition;
  onArchive?: () => void;
  readOnly?: boolean;
};

export function ContentRosterCard({ item, onArchive, readOnly = false }: Props) {
  const navigate = useNavigate();
  const typeLabel = CONTENT_TYPE_LABELS[item.type] ?? item.type;
  const statusLabel = item.status === "approved" ? "Approved" : "Draft";

  return (
    <article className="rounded-design border border-black/15 bg-white p-5 shadow-sm hover:border-black/25 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="text-left min-w-0 flex-1"
          onClick={() => navigate(`/content/${item.id}`)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-['Fraunces'] text-xl text-[#0D1833] truncate">{item.title}</h3>
            <span className="inline-flex items-center rounded-full border border-black/15 bg-accent-grey/30 px-2 py-0.5 font-['Inter'] text-[11px] text-foreground/70">
              {typeLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-['Inter'] text-[11px] ${
                item.status === "approved"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="font-['Inter'] text-xs text-foreground/55 mt-1">
            v{item.version}
          </p>
        </button>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black rounded-design"
              onClick={() => navigate(`/content/${item.id}`)}
            >
              View & edit
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
        <ContentCompositionBanner composition={item.composition} compact />
      </div>
    </article>
  );
}
