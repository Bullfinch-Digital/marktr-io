import type { ReactNode } from "react";
import { Check } from "lucide-react";

type MarktrStepCardProps = {
  step: number;
  title: string;
  complete: boolean;
  summary?: ReactNode;
  onClick: () => void;
};

/** Shared 3-step pillar card used on guest + authenticated dashboards. */
export function MarktrStepCard({
  step,
  title,
  complete,
  summary,
  onClick,
}: MarktrStepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-card app-card-hover app-focus-ring w-full p-6 text-left transition-colors hover:-translate-y-px"
    >
      <div className="flex items-start gap-4">
        {complete ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy"
            aria-hidden
          >
            <Check className="h-5 w-5 stroke-[3] text-brand-lime" />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-stroke bg-muted/40 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-muted-foreground"
            aria-hidden
          >
            {step}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-['Fraunces'] text-lg font-bold text-foreground">
            Step {step} — {title}
          </h3>
          {summary}
          <p className="app-text-link mt-3 font-['Plus_Jakarta_Sans'] text-sm">
            {complete ? "View results →" : "Start →"}
          </p>
        </div>
      </div>
    </button>
  );
}
