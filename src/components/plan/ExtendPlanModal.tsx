import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { track } from "../../lib/analytics";
import { generatePlan, type PlanLengthDays, type PlanWithDays } from "../../lib/plans";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

const LENGTHS: Array<{ days: PlanLengthDays; label: string; detail: string }> = [
  { days: 7, label: "7 days", detail: "a focused week" },
  { days: 14, label: "14 days", detail: "recommended" },
  { days: 30, label: "30 days", detail: "a full campaign" },
];

const PROGRESS_STEPS = ["Reading your notes", "Shaping the next days", "Saving your plan"];

type Props = {
  isOpen: boolean;
  strategyId: string;
  planId: string;
  onClose: () => void;
  onExtended: (plan: PlanWithDays) => void;
};

export function ExtendPlanModal({ isOpen, strategyId, planId, onClose, onExtended }: Props) {
  const [lengthDays, setLengthDays] = useState<PlanLengthDays>(14);
  const [building, setBuilding] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLengthDays(14);
    setBuilding(false);
    setProgressStep(0);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!building) return;
    const timer = window.setInterval(() => {
      setProgressStep((current) => Math.min(current + 1, PROGRESS_STEPS.length - 1));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [building]);

  const extend = async () => {
    if (!strategyId || !planId) return;
    setBuilding(true);
    setError(null);
    setProgressStep(0);
    try {
      const plan = await generatePlan(strategyId, lengthDays, { extendFromPlanId: planId });
      track("plan_extended", { length_days: lengthDays });
      onExtended(plan);
    } catch (err) {
      console.error("[ExtendPlanModal] generatePlan failed", err);
      setError("We couldn’t extend your plan just now. Try again — nothing was lost.");
      setBuilding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={building ? () => undefined : onClose} title="Extend my plan" size="lg">
      {building ? (
        <div className="space-y-4">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70">
            We’ll use your notes and results to shape the next round.
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
            <Button type="button" onClick={() => void extend()}>
              Try again
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/75">
            We’ll use your notes and results to shape the next round.
          </p>
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
          <Button
            type="button"
            className="w-full"
            data-track-id="plan_extend"
            data-track-location="plan_page"
            onClick={() => void extend()}
          >
            Extend my plan
          </Button>
        </div>
      )}
    </Modal>
  );
}
