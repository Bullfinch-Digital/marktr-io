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
      <div className="app-card space-y-4 border-dashed p-6 text-center">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">
          Your digital health scores
        </h2>
        <p className="font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">
          Run a health check to see Website, Brand Story, Content, and Social scores.
        </p>
        {onStartHealthCheck ? (
          <button
            type="button"
            onClick={onStartHealthCheck}
            className="app-text-link font-['Plus_Jakarta_Sans'] text-sm"
          >
            Run health check →
          </button>
        ) : (
          <Link
            to="/health-check"
            className="app-text-link font-['Plus_Jakarta_Sans'] text-sm"
          >
            Run health check →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="app-card space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-['Fraunces'] text-2xl font-bold text-foreground">
          Your digital health scores
        </h2>
        <Link
          to={reportHref}
          className="app-text-link font-['Plus_Jakarta_Sans'] text-sm"
        >
          {reportLinkLabel}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {dimensions.map(({ key, label, score, rerunHref }) => (
          <div key={key} className="app-card p-4 text-center">
            <p className="font-['Fraunces'] text-3xl font-bold leading-none text-foreground">
              {score}
            </p>
            {typeof score === "number" ? (
              <div className="app-progress-track mx-auto mt-2 max-w-[4.5rem]">
                <div
                  className="app-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
            ) : (
              <div className="app-progress-track mx-auto mt-2 max-w-[4.5rem]" />
            )}
            <p className="mt-2 font-['Plus_Jakarta_Sans'] text-[10px] leading-tight text-muted-foreground">
              {label}
            </p>
            {rerunHref ? (
              <Link
                to={rerunHref}
                className="app-text-link mt-2 inline-block font-['Plus_Jakarta_Sans'] text-[10px]"
              >
                Re-run →
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="pt-2 text-center">
        <p className="font-['Fraunces'] text-5xl font-bold tracking-tight text-foreground">
          {overall}
          <span className="font-['Plus_Jakarta_Sans'] text-lg font-normal text-muted-foreground">/100</span>
        </p>
        <p className="app-status-pill mt-3 font-['Plus_Jakarta_Sans'] text-sm">
          Overall digital health
        </p>
      </div>
    </div>
  );
}
