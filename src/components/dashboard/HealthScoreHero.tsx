import { Link } from "react-router-dom";

export type HealthDimensionKey =
  | "websiteClarity"
  | "brandStory"
  | "contentConsistency"
  | "socialPresence";

export type HealthDimensionScore = number | "—";

export type HealthScoreHeroProps = {
  overall: HealthDimensionScore;
  dimensions: Array<{
    key: HealthDimensionKey;
    label: string;
    score: HealthDimensionScore;
    /** Re-run / re-scan link — omit for Brand Story (user-edited, not scanned). */
    rerunHref?: string;
  }>;
  reportHref?: string;
  reportLinkLabel?: string;
  empty?: boolean;
  onStartHealthCheck?: () => void;
};

function scoreColor(score: HealthDimensionScore): string {
  if (typeof score !== "number") return "text-muted-foreground";
  if (score >= 70) return "text-[#2D7A5F]";
  if (score >= 40) return "text-[#BA7517]";
  return "text-[#E24B4A]";
}

/** Overall score + 4-pillar breakdown shared by guest + authenticated dashboards. */
export function HealthScoreHero({
  overall,
  dimensions,
  reportHref = "/health-report",
  reportLinkLabel = "View full report →",
  empty = false,
  onStartHealthCheck,
}: HealthScoreHeroProps) {
  if (empty) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-border bg-white p-6 text-center">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
          Your digital health scores
        </h2>
        <p className="font-['DM_Sans'] text-sm text-muted-foreground">
          Run a health check to see Website, Brand Story, Content, and Social scores.
        </p>
        {onStartHealthCheck ? (
          <button
            type="button"
            onClick={onStartHealthCheck}
            className="font-['DM_Sans'] text-sm font-semibold text-primary hover:underline"
          >
            Run health check →
          </button>
        ) : (
          <Link
            to="/health-check"
            className="font-['DM_Sans'] text-sm font-semibold text-primary hover:underline"
          >
            Run health check →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-[#0D1833]">
          Your digital health scores
        </h2>
        <Link
          to={reportHref}
          className="font-['DM_Sans'] text-sm font-medium text-primary hover:underline"
        >
          {reportLinkLabel}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {dimensions.map(({ key, label, score, rerunHref }) => (
          <div key={key} className="rounded-xl border border-border bg-background p-4 text-center">
            <p className={`font-['Fraunces'] text-3xl font-bold leading-none ${scoreColor(score)}`}>
              {score}
            </p>
            <p className="mt-2 font-['DM_Sans'] text-[10px] leading-tight text-muted-foreground">
              {label}
            </p>
            {rerunHref ? (
              <Link
                to={rerunHref}
                className="mt-2 inline-block font-['DM_Sans'] text-[10px] font-medium text-primary hover:underline"
              >
                Re-run →
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="pt-2 text-center">
        <p className="font-['Fraunces'] text-4xl font-bold text-[#0D1833]">
          {overall}
          <span className="font-['DM_Sans'] text-lg font-normal text-muted-foreground">/100</span>
        </p>
        <p className="font-['DM_Sans'] text-sm text-muted-foreground">Overall digital health</p>
      </div>
    </div>
  );
}
