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
      <div className="app-card space-y-4 border-dashed p-8 text-center">
        <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">
          Your digital health scores
        </h2>
        <p className="font-['Plus_Jakarta_Sans'] text-base text-muted-foreground">
          Run a health check to see Website, Brand Story, Content, and Social scores.
        </p>
        {onStartHealthCheck ? (
          <button
            type="button"
            onClick={onStartHealthCheck}
            className="app-text-link font-['Plus_Jakarta_Sans']"
          >
            Run health check →
          </button>
        ) : (
          <Link to="/health-check" className="app-text-link font-['Plus_Jakarta_Sans']">
            Run health check →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="app-card p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="app-heading font-['Fraunces'] text-2xl text-foreground">
          Your digital health scores
        </h2>
        <Link to={reportHref} className="app-text-link font-['Plus_Jakarta_Sans']">
          {reportLinkLabel}
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="shrink-0 lg:min-w-[11rem]">
          <p className="app-score-lg text-foreground">
            {overall}
            <span className="ml-1 font-['Plus_Jakarta_Sans'] text-lg font-medium text-muted-foreground">
              /100
            </span>
          </p>
          <p className="app-status-pill mt-4 font-['Plus_Jakarta_Sans'] text-sm">
            Overall digital health
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
          {dimensions.map(({ key, label, score, rerunHref }) => (
            <div key={key} className="app-card-nested min-w-0 p-3 text-center sm:p-4">
              <p className="app-score text-[2.5rem] text-foreground">{score}</p>
              {typeof score === "number" ? (
                <div className="app-progress-track mx-auto mt-3">
                  <div
                    className="app-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
              ) : (
                <div className="app-progress-track mx-auto mt-3" />
              )}
              <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm leading-snug text-muted-foreground">
                {label}
              </p>
              {rerunHref ? (
                <Link
                  to={rerunHref}
                  className="app-text-link mt-1 inline-flex justify-center font-['Plus_Jakarta_Sans']"
                >
                  Re-run →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
