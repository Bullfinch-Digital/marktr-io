import { CalendarDays, ListChecks, Sparkles } from "lucide-react";

const UNLOCKS = [
  {
    icon: Sparkles,
    text: "A strategy built from your story and customers",
  },
  {
    icon: ListChecks,
    text: "A 14-day plan with the content to do each task",
  },
  {
    icon: CalendarDays,
    text: "A weekly rhythm so you know what to post and when",
  },
] as const;

const DEFAULT_HEADING = "What your free trial unlocks";

type Props = {
  onStartTrial: () => void;
  heading?: string;
};

export function DashboardTrialUnlocks({ onStartTrial, heading = DEFAULT_HEADING }: Props) {
  return (
    <section className="app-card p-5 sm:p-6" aria-labelledby="trial-unlocks-heading">
      <h2
        id="trial-unlocks-heading"
        className="font-['Fraunces'] text-xl leading-snug text-foreground sm:text-2xl"
      >
        {heading}
      </h2>
      <ul className="mt-4 space-y-3">
        {UNLOCKS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.text} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-navy">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="pt-2.5 font-['Plus_Jakarta_Sans'] text-sm leading-snug text-foreground sm:text-base">
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onStartTrial}
        data-track-id="dashboard_trial_panel_start"
        data-track-location="dashboard"
        data-track-destination="paywall"
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-brand-stroke bg-brand-lime px-5 font-['Plus_Jakarta_Sans'] text-base font-semibold text-brand-navy hover:bg-brand-lime-hover sm:w-auto"
      >
        Start your 14-day free trial
      </button>
    </section>
  );
}
