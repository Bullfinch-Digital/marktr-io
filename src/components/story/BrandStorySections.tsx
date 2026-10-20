import type { BrandStoryOutput } from "../../lib/brandStory";
import {
  BRAND_STORY_CORE_SECTIONS,
  BRAND_STORY_FINDINGS_TITLE,
  type BrandStorySectionKey,
} from "../../lib/brandStoryAccess";
import { BrandStoryFindingsSection } from "./BrandStoryFindingsSection";
import { LockedStorySection, StoryUnlockButton } from "./LockedStorySection";
import { Textarea } from "../ui/textarea";

type Props = {
  story: BrandStoryOutput;
  hasAccess: boolean;
  onUnlock: () => void;
  findingsVariant?: "guest" | "authenticated";
  /** When access is locked, whether to draw the findings title. Does not carry finding copy. */
  showFindingsLock?: boolean;
  editing?: boolean;
  onSectionChange?: (key: BrandStorySectionKey, value: string) => void;
  className?: string;
};

export function BrandStorySections({
  story,
  hasAccess,
  onUnlock,
  findingsVariant = "guest",
  showFindingsLock = false,
  editing = false,
  onSectionChange,
  className = "mt-8 space-y-4",
}: Props) {
  const showEditor = hasAccess && editing;

  return (
    <div className={className}>
      {BRAND_STORY_CORE_SECTIONS.map((section, index) => {
        const open = hasAccess || index === 0;
        if (!open) return <LockedStorySection key={section.key} title={section.label} />;

        return (
          <article key={section.key} className="rounded-[24px] border-2 border-brand-stroke bg-card p-6">
            <p className="font-['Plus_Jakarta_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {section.label}
            </p>
            {showEditor ? (
              <Textarea
                value={story[section.key]}
                onChange={(event) => onSectionChange?.(section.key, event.target.value)}
                className="mt-3 min-h-[120px] resize-y border border-black font-['Fraunces'] text-lg leading-relaxed"
              />
            ) : (
              <p className="mt-3 font-['Fraunces'] text-lg leading-relaxed text-foreground">
                {story[section.key]}
              </p>
            )}
          </article>
        );
      })}

      {hasAccess ? (
        <BrandStoryFindingsSection findings={story.findings ?? []} variant={findingsVariant} />
      ) : showFindingsLock ? (
        <LockedStorySection title={BRAND_STORY_FINDINGS_TITLE} />
      ) : null}

      {hasAccess ? null : <StoryUnlockButton onUnlock={onUnlock} />}
    </div>
  );
}
