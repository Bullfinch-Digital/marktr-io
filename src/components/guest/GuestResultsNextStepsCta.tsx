import { Link } from "react-router-dom";
import { getGuestNextStepsCta, type GuestToolId } from "../../lib/guestNextStepsCta";

type GuestResultsNextStepsCtaProps = {
  currentTool: GuestToolId;
  className?: string;
};

export function GuestResultsNextStepsCta({ currentTool, className = "mt-8" }: GuestResultsNextStepsCtaProps) {
  const cta = getGuestNextStepsCta(currentTool);

  return (
    <div className={`rounded-2xl bg-[#0D1833] p-8 ${className}`}>
      <h2 className="font-['Fraunces'] text-3xl font-bold leading-tight text-white">{cta.heading}</h2>
      <p className="mt-4 max-w-2xl font-['DM_Sans'] text-base leading-relaxed text-white/70">{cta.body}</p>

      <Link
        to="/guest-dashboard"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 font-['DM_Sans'] text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {cta.buttonLabel}
      </Link>

      {cta.subline ? (
        <p className="mt-3 font-['DM_Sans'] text-xs text-white/50">{cta.subline}</p>
      ) : null}
    </div>
  );
}
