import { Link } from "react-router-dom";
import type { ContentPlanOrigin } from "../../lib/plans";

type Props = {
  origin: ContentPlanOrigin;
};

export function PlanOriginTag({ origin }: Props) {
  return (
    <Link
      to={`/plan/${origin.planId}/day/${origin.dayNumber}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center rounded-full border-2 border-brand-stroke bg-brand-lime/40 px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[10px] font-medium text-brand-navy hover:bg-brand-lime/70 dark:text-foreground"
    >
      From your plan: Day {origin.dayNumber}
    </Link>
  );
}
