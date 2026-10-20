import { Check } from "lucide-react";

const STEPS = [
  { n: 1, label: "Add an aim" },
  { n: 2, label: "Build a strategy" },
  { n: 3, label: "Follow your plan" },
] as const;

export type StrategyGuidanceStep = 1 | 2 | 3;

type Props = {
  currentStep: StrategyGuidanceStep;
};

export function StrategyProgressStrip({ currentStep }: Props) {
  return (
    <ol
      className="grid grid-cols-3 gap-1.5 sm:gap-2"
      aria-label="Strategy setup progress"
    >
      {STEPS.map((step) => {
        const state =
          step.n < currentStep ? "done" : step.n === currentStep ? "current" : "upcoming";
        return (
          <li
            key={step.n}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border-2 px-2 py-1.5 sm:gap-2 sm:px-3 ${
              state === "current"
                ? "border-brand-stroke bg-brand-lime text-brand-navy"
                : state === "done"
                  ? "border-brand-stroke bg-card text-foreground"
                  : "border-transparent bg-muted/50 text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-['Plus_Jakarta_Sans'] text-[11px] font-semibold ${
                state === "current"
                  ? "bg-brand-navy text-brand-lime"
                  : state === "done"
                    ? "bg-brand-navy text-brand-lime"
                    : "border border-current/30 bg-background/40"
              }`}
              aria-hidden
            >
              {state === "done" ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.n}
            </span>
            <span className="min-w-0 truncate font-['Plus_Jakarta_Sans'] text-[11px] font-semibold leading-tight sm:text-xs">
              {step.n} {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
