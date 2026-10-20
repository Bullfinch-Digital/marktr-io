import { Button } from "../ui/button";
import type { StrategyGuidanceStep } from "./StrategyProgressStrip";

const COPY: Record<
  StrategyGuidanceStep,
  { title: string; text: string; cta: string }
> = {
  1: {
    title: "Start with an aim",
    text: "An aim is what you want to achieve, for example 'get more enquiries'. marktr builds your strategy around it.",
    cta: "Add your first aim",
  },
  2: {
    title: "Now build your strategy",
    text: "Your strategy turns your aim and customers into a plan: where to post, what to post and when.",
    cta: "Build a strategy from this aim",
  },
  3: {
    title: "Your plan is ready",
    text: "Open your strategy to see what to post and when, then follow the first 14 days.",
    cta: "Open my strategy",
  },
};

type Props = {
  currentStep: StrategyGuidanceStep;
  onAction: () => void;
};

export function StrategyGuidanceCard({ currentStep, onAction }: Props) {
  const copy = COPY[currentStep];

  return (
    <section
      className="app-card overflow-hidden p-0"
      aria-label="What to do next"
    >
      <span className="block h-1.5 w-full bg-brand-lime" aria-hidden />
      <div className="space-y-3 p-5 sm:p-6">
        <h2 className="app-heading font-['Fraunces'] text-xl text-foreground sm:text-2xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/75">
          {copy.text}
        </p>
        <Button
          type="button"
          onClick={onAction}
          data-track-id="strategy_guidance_cta"
          data-track-location="strategy_page"
          className="min-h-11 w-full sm:w-auto"
        >
          {copy.cta}
        </Button>
      </div>
    </section>
  );
}
