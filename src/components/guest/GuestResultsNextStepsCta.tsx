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
        data-track-id={currentTool === "story" ? "story_next_icp" : `next_steps_${currentTool}`}
        data-track-location={
          currentTool === "story" ? "story_result" : currentTool === "health" ? "hero" : "card_3"
        }
        className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#101A26] bg-[#EBFD84] px-7 py-3 font-body text-sm font-semibold text-[#101A26] hover:bg-[#E4F356]"
      >
        {cta.buttonLabel}
      </Link>

      {cta.subline ? (
        <p className="mt-3 font-body text-xs text-white/50">{cta.subline}</p>
      ) : null}
    </div>
  );
}
