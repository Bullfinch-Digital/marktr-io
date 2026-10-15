import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { useWeeklyProgress } from "../../hooks/useWeeklyProgress";
import type { StrategyChannel } from "../../types/icpStrategyPayload";

export type WeeklyProgressLocation = "dashboard" | "strategy_page";

type Props = {
  userId: string | undefined;
  strategyId: string | undefined;
  channels: StrategyChannel[] | undefined;
  location: WeeklyProgressLocation;
  variant?: "full" | "slim";
  nextHref?: string;
};

const RING = { size: 96, slimSize: 64, stroke: 8 };

function ProgressRing({
  ratio,
  label,
  slim,
}: {
  ratio: number;
  label: string;
  slim: boolean;
}) {
  const titleId = useId();
  const size = slim ? RING.slimSize : RING.size;
  const radius = (size - RING.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const emptyOffset = circumference;
  const filledOffset = circumference * (1 - Math.min(1, Math.max(0, ratio)));
  const [offset, setOffset] = useState(emptyOffset);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOffset(filledOffset);
      return;
    }
    setOffset(emptyOffset);
    const frame = window.requestAnimationFrame(() => setOffset(filledOffset));
    return () => window.cancelAnimationFrame(frame);
  }, [emptyOffset, filledOffset]);

  return (
    <svg
      className="shrink-0"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{label}</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-[color:var(--brand-progress-track)] dark:stroke-white/15"
        strokeWidth={RING.stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="progress-ring-fill stroke-[color:var(--brand-navy)] dark:stroke-[color:var(--brand-lime)]"
        strokeWidth={RING.stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          ["--progress-ring-offset" as string]: `${offset}px`,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      />
    </svg>
  );
}

export function WeeklyProgressCard({
  userId,
  strategyId,
  channels,
  location,
  variant = "full",
  nextHref,
}: Props) {
  const { loaded, snapshot } = useWeeklyProgress(userId, strategyId, channels);
  if (!loaded || !snapshot.visible) return null;

  const slim = variant === "slim";
  const countLabel = `${snapshot.postsThisWeek} of ${snapshot.target} posts this week`;
  const nextLabel = snapshot.nextStep
    ? `Next up: ${snapshot.nextStep.channelName}, ${snapshot.nextStep.weekday}`
    : null;
  const resolvedNextHref = nextHref ?? (strategyId ? `/strategy/${strategyId}#when-to-post` : undefined);

  return (
    <section
      className={`app-card ${slim ? "p-4 sm:p-5" : "p-6 sm:p-8"}`}
      data-track-id="progress_card_view"
      data-track-location={location}
    >
      <div className={`flex ${slim ? "items-center gap-4" : "flex-col gap-5 sm:flex-row sm:items-center sm:gap-6"}`}>
        <ProgressRing ratio={snapshot.ratio} label={countLabel} slim={slim} />
        <div className="min-w-0 flex-1">
          <p
            className={`font-['Fraunces'] text-foreground ${
              slim ? "text-lg leading-snug" : "text-2xl leading-tight"
            }`}
          >
            {countLabel}
          </p>
          {snapshot.streak > 0 ? (
            <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-foreground">
              {snapshot.streak}-week streak
              {snapshot.restWeekUsed ? (
                <span className="ml-2 text-muted-foreground">rest week used</span>
              ) : null}
            </p>
          ) : null}
          <p className={`font-['Plus_Jakarta_Sans'] text-muted-foreground ${slim ? "mt-1 text-sm" : "mt-2 text-base"}`}>
            {snapshot.copy}
          </p>
          {nextLabel && resolvedNextHref ? (
            <Link
              to={resolvedNextHref}
              data-track-id="progress_card_next_step_click"
              data-track-location={location}
              className="app-text-link mt-2 inline-flex min-h-11 items-center font-['Plus_Jakarta_Sans'] text-sm"
            >
              {nextLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
