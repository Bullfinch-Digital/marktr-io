import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getGuestNextStepsCta, type GuestToolId } from "../../lib/guestNextStepsCta";
import { trackOnceLoad } from "../../lib/analytics";

type GuestResultsNextStepsCtaProps = {
  currentTool: GuestToolId;
  className?: string;
};

export function GuestResultsNextStepsCta({ currentTool, className = "mt-8" }: GuestResultsNextStepsCtaProps) {
  const cta = getGuestNextStepsCta(currentTool);
  const trigger =
    currentTool === "health"
      ? "after_health_check"
      : currentTool === "story"
        ? "after_brand_story"
        : "after_icp";

  useEffect(() => {
    trackOnceLoad(`signup_prompt:${trigger}`, "signup_prompt_shown", { trigger });
  }, [trigger]);

  return (
    <div className={`rounded-2xl bg-[#0D1833] p-8 ${className}`}>
      <h2 className="font-display text-3xl font-bold leading-tight text-white">{cta.heading}</h2>
      <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-white/70">{cta.body}</p>

      <Link
        to="/guest-dashboard"
        data-track-id={`next_steps_${currentTool}`}
        data-track-location={currentTool === "health" ? "hero" : currentTool === "story" ? "journey" : "card_3"}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-body text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {cta.buttonLabel}
      </Link>

      {cta.subline ? (
        <p className="mt-3 font-body text-xs text-white/50">{cta.subline}</p>
      ) : null}
    </div>
  );
}
