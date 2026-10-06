import type { ReactNode } from "react";
import { Check } from "lucide-react";

type MarktrStepCardProps = {
  step: number;
  title: string;
  complete: boolean;
  status?: ReactNode;
  summary?: ReactNode;
  onClick: () => void;
};

/** Shared 3-step pillar card used on guest + authenticated dashboards. */
export function MarktrStepCard({
  step,
  title,
  complete,
  status,
  summary,
  onClick,
}: MarktrStepCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-card app-card-hover app-focus-ring flex h-full min-h-[11.5rem] w-full flex-col p-8 text-left transition-colors hover:-translate-y-px"
    >
      <div className="flex items-start gap-4">
        {complete ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy"
            aria-hidden
          >
            <Check className="h-5 w-5 stroke-[3] text-brand-lime" />
          </div>
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-stroke bg-muted/40 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-muted-foreground"
            aria-hidden
          >
            {step}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-muted-foreground">
            Step {step}
          </p>
          <h3 className="app-heading mt-1 min-h-[3.25rem] font-['Fraunces'] text-lg leading-snug text-foreground">
            {title}
          </h3>
          {status ? <div className="mt-2 min-h-[2rem]">{status}</div> : null}
          {summary}
          <p className="app-text-link mt-4 font-['Plus_Jakarta_Sans']">
            {complete ? "View results →" : "Start →"}
          </p>
        </div>
      </div>
    </button>
  );
}
