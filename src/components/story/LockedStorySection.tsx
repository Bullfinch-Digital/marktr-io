import { Lock } from "lucide-react";
import { track } from "../../lib/analytics";
import { Button } from "../ui/button";
import { STORY_UNLOCK_LABEL } from "../../lib/brandStoryAccess";

const GENERIC_BAR_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

function BlurShape({ className }: { className: string }) {
  return (
    <div className={`overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div className="h-full w-full scale-110 bg-foreground/25 blur-[3px]" />
    </div>
  );
}

/** Title and generic bars only. This component does not accept story copy. */
export function LockedStorySection({ title }: { title: string }) {
  return (
    <article className="rounded-[24px] border-2 border-brand-stroke bg-card p-6" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-['Plus_Jakarta_Sans'] text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-stroke bg-background text-foreground">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 space-y-2" aria-hidden="true">
        {GENERIC_BAR_WIDTHS.map((width) => (
          <BlurShape key={width} className={`h-3 ${width}`} />
        ))}
      </div>
    </article>
  );
}

export function StoryUnlockButton({ onUnlock }: { onUnlock: () => void }) {
  return (
    <Button
      type="button"
      onClick={() => {
        track("locked_story_unlock", { location: "story_results" });
        onUnlock();
      }}
      className="h-auto min-h-11 w-full whitespace-normal px-4 py-3 text-center text-sm leading-snug"
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      {STORY_UNLOCK_LABEL}
    </Button>
  );
}
