import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  contentCompositionHasArchivedLinks,
  contentCompositionHasDeletedLinks,
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

const chipBase =
  "composition-chip inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px]";
const chipLink =
  `${chipBase} cursor-pointer underline-offset-2 hover:underline hover:bg-brand-lime/50 hover:border-brand-navy hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-navy)] focus-visible:shadow-[var(--brand-focus-glow)]`;
const sentenceLink =
  "underline-offset-2 hover:underline hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-navy)] focus-visible:shadow-[var(--brand-focus-glow)] rounded-sm";

function stopCardClick(event: MouseEvent) {
  event.stopPropagation();
}

function strategyHref(strategy: ContentCompositionStrategy): string | null {
  if (!strategy.currentId || strategy.linkState === "deleted") return null;
  return `/strategy/${strategy.currentId}`;
}

function campaignHref(
  strategy: ContentCompositionStrategy,
  idea: ContentCompositionCampaignIdea
): string | null {
  const base = strategyHref(strategy);
  if (!base) return null;
  if (idea.linkState === "strategy_level" || !idea.id) return null;
  return `${base}#campaign-idea-${idea.id}`;
}

function personaHref(persona: ContentCompositionPersona): string | null {
  if (!persona.currentId || persona.linkState === "deleted") return null;
  return `/icp/${persona.currentId}`;
}

function StrategyChip({ strategy }: { strategy: ContentCompositionStrategy }) {
  const isDeleted = strategy.linkState === "deleted";
  const isArchived = strategy.linkState === "archived";
  const href = strategyHref(strategy);
  const tone = isDeleted
    ? "border-red-300 bg-red-50 text-red-900"
    : isArchived
      ? "border-brand-stroke bg-brand-coral/30 text-foreground"
      : "border-primary/30 bg-primary/5 text-primary";
  const inner = (
    <>
      <span className={isDeleted ? "line-through decoration-red-400" : undefined}>
        {strategy.title}
      </span>
      {isArchived ? <span className="text-foreground">(archived)</span> : null}
      {isDeleted ? <span className="text-red-700">(deleted)</span> : null}
      {href ? <span aria-hidden>→</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        onClick={stopCardClick}
        aria-label={`Open strategy: ${strategy.title}`}
        className={`${chipLink} ${tone}`}
      >
        {inner}
      </Link>
    );
  }

  return <span className={`${chipBase} ${tone}`}>{inner}</span>;
}

function CampaignIdeaChip({
  idea,
  strategy,
}: {
  idea: ContentCompositionCampaignIdea;
  strategy: ContentCompositionStrategy;
}) {
  const isRemoved = idea.linkState === "removed";
  const isStrategyLevel = idea.linkState === "strategy_level";
  const href = campaignHref(strategy, idea);
  const label = isStrategyLevel ? "strategy-level" : idea.name;
  const tone = isRemoved
    ? "border-brand-stroke bg-brand-coral/30 text-foreground"
    : "border-black/20 bg-accent-grey/30 text-foreground/80";
  const inner = (
    <>
      <span>{label}</span>
      {isRemoved ? <span className="text-foreground">(removed)</span> : null}
      {href ? <span aria-hidden>→</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        onClick={stopCardClick}
        aria-label={`Open campaign idea: ${label}`}
        className={`${chipLink} ${tone}`}
      >
        {inner}
      </Link>
    );
  }

  return <span className={`${chipBase} ${tone}`}>{inner}</span>;
}

function PersonaChip({ persona }: { persona: ContentCompositionPersona }) {
  const isDeleted = persona.linkState === "deleted";
  const isArchived = persona.linkState === "archived";
  const href = personaHref(persona);
  const tone = isDeleted
    ? "border-red-300 bg-red-50 text-red-900"
    : isArchived
      ? "border-brand-stroke bg-brand-coral/30 text-foreground"
      : "border-black/20 bg-accent-grey/30 text-foreground/80";
  const inner = (
    <>
      <span className={isDeleted ? "line-through decoration-red-400" : undefined}>
        {persona.name}
      </span>
      {isArchived ? <span className="ml-0.5 text-foreground">(archived)</span> : null}
      {isDeleted ? <span className="ml-0.5 text-red-700">(deleted)</span> : null}
      {href ? <span aria-hidden>→</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        onClick={stopCardClick}
        aria-label={`Open persona: ${persona.name}`}
        className={`${chipLink} ${tone}`}
      >
        {inner}
      </Link>
    );
  }

  return <span className={`${chipBase} ${tone}`}>{inner}</span>;
}

function SentenceLink({
  to,
  ariaLabel,
  children,
}: {
  to: string | null;
  ariaLabel: string;
  children: ReactNode;
}) {
  if (!to) return <span>{children}</span>;
  return (
    <Link to={to} onClick={stopCardClick} aria-label={ariaLabel} className={sentenceLink}>
      {children}
    </Link>
  );
}

function ChipGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
      <span
        className={`font-['Plus_Jakarta_Sans'] font-medium text-foreground/50 shrink-0 ${
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
  const ideaLabel =
    composition.campaignIdea.linkState === "strategy_level"
      ? "strategy-level"
      : composition.campaignIdea.name;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p
        className={`font-['Plus_Jakarta_Sans'] text-foreground/75 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        From{" "}
        <SentenceLink
          to={strategyHref(composition.strategy)}
          ariaLabel={`Open strategy: ${composition.strategy.title}`}
        >
          {composition.strategy.title}
        </SentenceLink>
        {" · "}
        <SentenceLink
          to={campaignHref(composition.strategy, composition.campaignIdea)}
          ariaLabel={`Open campaign idea: ${ideaLabel}`}
        >
          {ideaLabel}
        </SentenceLink>
        {" · for "}
        <SentenceLink
          to={personaHref(composition.persona)}
          ariaLabel={`Open persona: ${composition.persona.name}`}
        >
          {composition.persona.name}
        </SentenceLink>
      </p>

      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <ChipGroup label="Strategy" compact={compact}>
          <StrategyChip strategy={composition.strategy} />
        </ChipGroup>

        <ChipGroup label="Campaign idea" compact={compact}>
          <CampaignIdeaChip idea={composition.campaignIdea} strategy={composition.strategy} />
        </ChipGroup>

        <ChipGroup label="Persona" compact={compact}>
          <PersonaChip persona={composition.persona} />
        </ChipGroup>
      </div>

      {hasDeleted ? (
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-red-950 bg-red-100 border border-red-300 rounded-design px-3 py-2 max-w-2xl">
          This content targets a permanently deleted strategy or persona — it can&apos;t be
          recovered. Review this piece.
        </p>
      ) : null}

      {hasArchived ? (
        <p className="font-['Plus_Jakarta_Sans'] text-xs text-red-900 bg-red-50 border border-red-200 rounded-design px-3 py-2 max-w-2xl">
          This content targets an archived strategy or persona, or a campaign idea that was
          removed — review it before acting on it.
        </p>
      ) : null}
    </div>
  );
}

export { contentCompositionHasArchivedLinks, contentCompositionHasDeletedLinks };
