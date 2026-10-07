import { Button } from "../ui/button";

export const GUEST_ALL_COMPLETE_TRIAL_HEADING = "Your full marketing picture is ready.";
export const GUEST_ALL_COMPLETE_TRIAL_SUBCOPY =
  "You've built the foundation. Start your free trial and marktr turns it into your content strategy, posts, and schedule — all built around your business.";
export const GUEST_ALL_COMPLETE_TRIAL_CTA = "Start your free trial →";

const GRADIENT =
  "bg-gradient-to-br from-brand-lime/50 via-brand-cream to-brand-lavender/40";

type GuestAllCompleteTrialBannerProps = {
  onStartTrial: () => void;
  /** Full-width strip below the temp-storage bar (default). */
  variant?: "fullBleed" | "contained";
};

function TrialBannerContent({ onStartTrial }: { onStartTrial: () => void }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <p className="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-widest text-foreground">
          All three complete
        </p>
        <h2 className="mt-2 font-['Fraunces'] text-3xl font-bold text-[#0D1833] sm:text-4xl">
          {GUEST_ALL_COMPLETE_TRIAL_HEADING}
        </h2>
        <p className="mt-3 font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-[#0D1833]/80">
          {GUEST_ALL_COMPLETE_TRIAL_SUBCOPY}
        </p>
      </div>
      <Button
        className="shrink-0 h-11 px-8"
        data-track-id="guest_trial_cta"
        data-track-location="pricing"
        data-track-destination="paywall"
        onClick={onStartTrial}
      >
        {GUEST_ALL_COMPLETE_TRIAL_CTA}
      </Button>
    </div>
  );
}

export function GuestAllCompleteTrialBanner({
  onStartTrial,
  variant = "fullBleed",
}: GuestAllCompleteTrialBannerProps) {
  if (variant === "contained") {
    return (
      <section
        className={`rounded-2xl border-2 border-brand-navy ${GRADIENT} p-8`}
        aria-label="Start your free trial"
      >
        <TrialBannerContent onStartTrial={onStartTrial} />
      </section>
    );
  }

  return (
    <section
      className={`border-b-2 border-brand-navy ${GRADIENT} px-6 py-10 lg:px-12`}
      aria-label="Start your free trial"
    >
      <div className="container mx-auto max-w-7xl">
        <TrialBannerContent onStartTrial={onStartTrial} />
      </div>
    </section>
  );
}
