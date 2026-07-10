import {
  contentCompositionHasArchivedLinks,
  contentCompositionHasDeletedLinks,
  formatContentCompositionSentence,
  type ContentComposition,
  type ContentCompositionCampaignIdea,
  type ContentCompositionPersona,
  type ContentCompositionStrategy,
} from "../../lib/contentComposition";

type Props = {
  composition: ContentComposition;
  showGentleFlag?: boolean;
  compact?: boolean;
};

function StrategyChip({ strategy }: { strategy: ContentCompositionStrategy }) {
  const isDeleted = strategy.linkState === "deleted";
  const isArchived = strategy.linkState === "archived";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
        isDeleted
          ? "border-red-300 bg-red-50 text-red-900"
          : isArchived
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-primary/30 bg-primary/5 text-primary"
      }`}
    >
      <span className={isDeleted ? "line-through decoration-red-400" : undefined}>
        {strategy.title}
      </span>
      {isArchived ? <span className="text-amber-700">(archived)</span> : null}
      {isDeleted ? <span className="text-red-700">(deleted)</span> : null}
    </span>
  );
}

function CampaignIdeaChip({ idea }: { idea: ContentCompositionCampaignIdea }) {
  const isRemoved = idea.linkState === "removed";
  const isStrategyLevel = idea.linkState === "strategy_level";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
        isRemoved
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-black/20 bg-accent-grey/30 text-foreground/80"
      }`}
    >
      <span>{isStrategyLevel ? "strategy-level" : idea.name}</span>
      {isRemoved ? <span className="text-amber-700">(removed)</span> : null}
    </span>
  );
}

function PersonaChip({ persona }: { persona: ContentCompositionPersona }) {
  const isDeleted = persona.linkState === "deleted";
  const isArchived = persona.linkState === "archived";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-['Inter'] text-[11px] ${
        isDeleted
          ? "border-red-300 bg-red-50 text-red-900"
          : isArchived
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-black/20 bg-accent-grey/30 text-foreground/80"
      }`}
    >
      <span className={isDeleted ? "line-through decoration-red-400" : undefined}>
        {persona.name}
      </span>
      {isArchived ? <span className="ml-1 text-amber-700">(archived)</span> : null}
      {isDeleted ? <span className="ml-1 text-red-700">(deleted)</span> : null}
    </span>
  );
}

function ChipGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
      <span
        className={`font-['Inter'] font-medium text-foreground/50 shrink-0 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function ContentCompositionBanner({
  composition,
  showGentleFlag = true,
  compact = false,
}: Props) {
  const hasArchived = showGentleFlag && contentCompositionHasArchivedLinks(composition);
  const hasDeleted = showGentleFlag && contentCompositionHasDeletedLinks(composition);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p
        className={`font-['Inter'] text-foreground/75 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {formatContentCompositionSentence(composition)}
      </p>

      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <ChipGroup label="Strategy" compact={compact}>
          <StrategyChip strategy={composition.strategy} />
        </ChipGroup>

        <ChipGroup label="Campaign idea" compact={compact}>
          <CampaignIdeaChip idea={composition.campaignIdea} />
        </ChipGroup>

        <ChipGroup label="Persona" compact={compact}>
          <PersonaChip persona={composition.persona} />
        </ChipGroup>
      </div>

      {hasDeleted ? (
        <p className="font-['Inter'] text-xs text-red-950 bg-red-100 border border-red-300 rounded-design px-3 py-2 max-w-2xl">
          This content targets a permanently deleted strategy or persona — it can&apos;t be
          recovered. Review this piece.
        </p>
      ) : null}

      {hasArchived ? (
        <p className="font-['Inter'] text-xs text-red-900 bg-red-50 border border-red-200 rounded-design px-3 py-2 max-w-2xl">
          This content targets an archived strategy or persona, or a campaign idea that was
          removed — review it before acting on it.
        </p>
      ) : null}
    </div>
  );
}

export { contentCompositionHasArchivedLinks, contentCompositionHasDeletedLinks };
