import { MarktrStepCard } from "./MarktrStepCard";

type Props = {
  hasHealth: boolean;
  hasStory: boolean;
  hasCustomers: boolean;
  overallScore: number | "—";
  customerCount: number;
  onHealth: () => void;
  onStory: () => void;
  onCustomers: () => void;
};

function NotStarted() {
  return <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">Not started</p>;
}

export function DashboardFoundationSteps({
  hasHealth,
  hasStory,
  hasCustomers,
  overallScore,
  customerCount,
  onHealth,
  onStory,
  onCustomers,
}: Props) {
  return (
    <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-3">
      <MarktrStepCard
        step={1}
        title="Digital health check"
        complete={hasHealth}
        onClick={onHealth}
        status={
          hasHealth ? (
            <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">
              Overall score{" "}
              <span className="font-['Fraunces'] text-xl font-medium">{overallScore}</span>
              /100
            </p>
          ) : (
            <NotStarted />
          )
        }
      />
      <MarktrStepCard
        step={2}
        title="Brand story"
        complete={hasStory}
        onClick={onStory}
        status={
          hasStory ? (
            <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">Brand story ready</p>
          ) : (
            <NotStarted />
          )
        }
      />
      <MarktrStepCard
        step={3}
        title="Know your customer"
        complete={hasCustomers}
        onClick={onCustomers}
        status={
          hasCustomers ? (
            <p className="app-status-pill font-['Plus_Jakarta_Sans'] text-sm">
              {`${customerCount} profiles`}
            </p>
          ) : (
            <NotStarted />
          )
        }
      />
    </div>
  );
}
