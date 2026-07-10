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
      className={`w-full rounded-2xl border p-6 text-left transition-colors hover:border-primary/40 ${
        complete
          ? "border-[#2D7A5F]/40 bg-[#D4EDE8]/50 hover:bg-[#D4EDE8]"
          : "border-border bg-white hover:bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-4">
        {complete ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D7A5F] text-white"
            aria-hidden
          >
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/20 bg-muted/30 font-['DM_Sans'] text-sm font-semibold text-muted-foreground"
            aria-hidden
          >
            {step}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-['Fraunces'] text-lg font-bold text-[#0D1833]">
            Step {step} — {title}
          </h3>
          {summary}
          <p className="mt-3 font-['DM_Sans'] text-sm font-semibold text-primary">
            {complete ? "View results →" : "Start →"}
          </p>
        </div>
      </div>
    </button>
  );
}
