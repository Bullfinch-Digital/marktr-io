import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { track } from "../../lib/analytics";
import { localISODate } from "../../lib/localCalendar";
import {
  generatePlan,
  listPlansForStrategy,
  type PlanLengthDays,
  type PlanWithDays,
} from "../../lib/plans";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

export type CreatePlanStrategyOption = {
  id: string;
  title: string;
};

type Props = {
  isOpen: boolean;
  userId: string;
  strategies: CreatePlanStrategyOption[];
  defaultStrategyId?: string;
  onClose: () => void;
  onCreated: (plan: PlanWithDays) => void;
};

const LENGTHS: Array<{ days: PlanLengthDays; label: string; detail: string }> = [
  { days: 7, label: "7 days", detail: "a focused week" },
  { days: 14, label: "14 days", detail: "recommended" },
  { days: 30, label: "30 days", detail: "a full campaign" },
];

const PROGRESS_STEPS = ["Reading your strategy", "Shaping your days", "Saving your plan"];

export function CreatePlanModal({
  isOpen,
  userId,
  strategies,
  defaultStrategyId,
  onClose,
  onCreated,
}: Props) {
  const fallbackStrategyId = strategies[0]?.id ?? "";
  const [strategyId, setStrategyId] = useState(defaultStrategyId || fallbackStrategyId);
  const [lengthDays, setLengthDays] = useState<PlanLengthDays>(14);
  const [startDate, setStartDate] = useState(localISODate());
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [building, setBuilding] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStrategyId(defaultStrategyId || fallbackStrategyId);
    setLengthDays(14);
    setStartDate(localISODate());
    setConfirmArchive(false);
    setBuilding(false);
    setProgressStep(0);
    setError(null);
  }, [isOpen, defaultStrategyId, fallbackStrategyId]);

  useEffect(() => {
    if (!isOpen || !userId || !strategyId) {
      setHasActivePlan(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const plans = await listPlansForStrategy(userId, strategyId);
        if (!cancelled) setHasActivePlan(plans.some((plan) => plan.status === "active"));
      } catch (err) {
        console.error("[CreatePlanModal] active plan check failed", err);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, strategyId]);

  useEffect(() => {
    if (!building) return;
    const timer = window.setInterval(() => {
      setProgressStep((current) => Math.min(current + 1, PROGRESS_STEPS.length - 1));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [building]);

  const selectedTitle = useMemo(
    () => strategies.find((item) => item.id === strategyId)?.title ?? "this strategy",
    [strategies, strategyId]
  );

  const build = async () => {
    if (!strategyId) return;
    if (hasActivePlan && !confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    setBuilding(true);
    setError(null);
    setProgressStep(0);
    try {
      const plan = await generatePlan(strategyId, lengthDays, { startDate });
      track("plan_created", { length_days: lengthDays });
      onCreated(plan);
    } catch (err) {
      console.error("[CreatePlanModal] generatePlan failed", err);
      setError("We couldn’t build your plan just now. Try again — nothing was lost.");
      setBuilding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={building ? () => undefined : onClose} title="Build my plan" size="lg">
      {building ? (
        <div className="space-y-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
            Turning {selectedTitle} into one clear task a day.
          </p>
          <div className="space-y-3">
            {PROGRESS_STEPS.map((step, index) => {
              const done = index < progressStep;
              const active = index === progressStep;
              return (
                <div key={step} className="flex min-h-11 items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-foreground" aria-hidden />
                  ) : (
                    <Loader2
                      className={`h-5 w-5 ${active ? "animate-spin text-foreground" : "text-foreground/30"}`}
                      aria-hidden
                    />
                  )}
                  <p
                    className={`font-['Plus_Jakarta_Sans'] text-sm ${
                      done || active ? "text-foreground" : "text-foreground/50"
                    }`}
                  >
                    {step}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void build()}>
              Try again
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : confirmArchive ? (
        <div className="space-y-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
            This strategy already has an active plan. Building a new one will archive the current
            plan so you keep the history, then open the new one.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void build()}>
              Archive it and build
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmArchive(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div className="space-y-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/80">
            A plan needs a strategy first. Write one, then come back and we’ll turn it into a
            day-by-day list.
          </p>
          <Button type="button" href="/strategy">
            Go to Strategy
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <label className="block space-y-1.5">
            <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
              Strategy
            </span>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="h-11 w-full rounded-full border-2 border-brand-stroke bg-card px-4 font-['Plus_Jakarta_Sans'] text-sm text-foreground"
            >
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
              Length
            </p>
            <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
              {LENGTHS.map((option) => {
                const selected = lengthDays === option.days;
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setLengthDays(option.days)}
                    className={`min-h-[88px] rounded-[20px] border-2 px-3 py-3 text-left ${
                      selected
                        ? "border-brand-stroke bg-brand-lime text-brand-navy"
                        : "border-brand-stroke bg-card text-foreground"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="block font-['Fraunces'] text-lg">{option.label}</span>
                    <span className="mt-1 block font-['Plus_Jakarta_Sans'] text-xs opacity-80">
                      {option.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="font-['Plus_Jakarta_Sans'] text-xs font-medium text-foreground/60">
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 w-full rounded-full border-2 border-brand-stroke bg-card px-4 font-['Plus_Jakarta_Sans'] text-sm text-foreground"
            />
          </label>

          <Button
            type="button"
            className="w-full"
            data-track-id="plan_create_submit"
            data-track-location="plan_page"
            onClick={() => void build()}
          >
            Build my plan
          </Button>
        </div>
      )}
    </Modal>
  );
}
