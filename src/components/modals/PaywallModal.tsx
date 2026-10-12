import { useState } from "react";
import { Button } from "../ui/button";
import { X, Check, Shield } from "lucide-react";
import { track } from "../../lib/analytics";
import type { CheckoutPlan } from "../../lib/checkoutPlans";
import {
  MARKTR_MONEY_BACK_GUARANTEE,
  MARKTR_PAYWALL_ANNUAL_PRICE_LINE,
  MARKTR_PAYWALL_ANNUAL_SAVINGS_BADGE,
  MARKTR_PAYWALL_MONTHLY_PRICE_LINE,
  MARKTR_PRO_BENEFITS,
  MARKTR_PRO_PLAN_NAME,
  MARKTR_TRIAL_DAYS,
  PRICING_SALES,
  formatPaywallDay,
  paywallFirstChargeAmount,
  paywallFirstChargeDate,
  paywallOfferPriceLine,
  paywallReminderDate,
} from "../../lib/marktrPricing";

function PaywallTrialJourney({ plan }: { plan: CheckoutPlan }) {
  const today = new Date();
  const steps = [
    {
      label: "Today",
      body: "Start your free trial. Full access, nothing to pay now.",
    },
    {
      label: formatPaywallDay(paywallReminderDate(today)),
      body: "We'll email you a reminder before your trial ends.",
    },
    {
      label: formatPaywallDay(paywallFirstChargeDate(today)),
      body: `Your first payment of ${paywallFirstChargeAmount(plan)} is taken, unless you cancel before then.`,
    },
  ];

  return (
    <div>
      <h3 className="font-['Fraunces'] text-lg sm:text-xl mb-3">We'll remind you before your trial ends</h3>
      <ol>
        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.label} className="flex gap-3">
              <div className="flex w-3.5 flex-col items-center" aria-hidden="true">
                <span
                  className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-navy dark:border-foreground ${
                    isFirst ? "bg-brand-lime" : "bg-brand-navy dark:bg-foreground"
                  }`}
                />
                {!isLast && <span className="w-0.5 flex-1 bg-brand-navy dark:bg-foreground/70" />}
              </div>
              <div className={isLast ? "min-w-0" : "min-w-0 pb-3"}>
                <p className="font-['Fraunces'] text-sm leading-snug">{step.label}</p>
                <p className="font-['Plus_Jakarta_Sans'] text-xs leading-relaxed text-foreground/75">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: CheckoutPlan, force?: boolean) => void;
  onContinueFree: () => void;
  isStartingCheckout?: boolean;
}

export function PaywallModal({
  isOpen,
  onClose,
  onUpgrade,
  onContinueFree,
  isStartingCheckout = false,
}: PaywallModalProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>("annual");

  if (!isOpen) return null;

  const handleAttemptContinueFree = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmContinueFree = () => {
    setShowExitConfirm(false);
    onContinueFree();
  };

  const handleConfirmStartTrial = () => {
    setShowExitConfirm(false);
    onUpgrade(selectedPlan);
  };

  const selectPlan = (plan: CheckoutPlan) => {
    setSelectedPlan(plan);
    track(plan === "monthly" ? "paywall_plan_monthly" : "paywall_plan_annual");
  };

  const firstChargeLabel = formatPaywallDay(paywallFirstChargeDate());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[rgb(16_26_38_/_0.55)] backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:py-8">
      <div className="bg-background border-2 border-brand-stroke rounded-[28px] shadow-[var(--brand-shadow)] max-w-4xl w-full my-auto animate-fade-in-up">
        <div className="sticky top-0 z-10 bg-background border-b border-warm-grey p-4 sm:p-6 flex items-start justify-between rounded-t-[26px]">
          <h2 className="font-['Fraunces'] text-2xl sm:text-3xl leading-snug pr-4">{PRICING_SALES.h1}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted/40 rounded-full transition-colors flex-shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5">
            <p className="mb-3 font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/55">
              {PRICING_SALES.costsLabel}
            </p>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
              {PRICING_SALES.costs.map((cost) => (
                <li key={cost.title}>
                  <p className="font-['Fraunces'] text-sm leading-snug">{cost.title}</p>
                  <p className="mt-1 font-['Plus_Jakarta_Sans'] text-xs leading-relaxed text-foreground/70">
                    {cost.usualCost}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-['Plus_Jakarta_Sans'] text-xs leading-relaxed text-foreground/50">
              {PRICING_SALES.footnoteBefore}
              {PRICING_SALES.sources.map((source, index) => (
                <span key={source.id}>
                  {index > 0 ? " · " : null}
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {source.label}
                  </a>
                </span>
              ))}
            </p>
          </div>

          <div className="mb-5">
            <h3 className="font-['Fraunces'] text-lg sm:text-xl mb-3">What full access includes</h3>
            <div className="bg-gradient-to-br from-brand-lime/15 to-brand-lavender/15 border-2 border-brand-stroke rounded-[24px] p-4 sm:p-6">
              <ul className="grid sm:grid-cols-2 gap-3">
                {MARKTR_PRO_BENEFITS.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-brand-navy rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-brand-lime" />
                    </div>
                    <span className="font-['Plus_Jakarta_Sans'] text-sm">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-5">
            <PaywallTrialJourney plan={selectedPlan} />
          </div>

          <div className="mb-5">
            <h3 className="font-['Fraunces'] text-lg sm:text-xl mb-3">Your plan after the trial</h3>

            {showAllPlans && (
              <div className="mb-4 space-y-3" role="radiogroup" aria-label="Plans">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === "annual"}
                  data-track-id="paywall_plan_annual"
                  data-track-location="paywall"
                  onClick={() => selectPlan("annual")}
                  className={`w-full min-h-11 rounded-[20px] border-2 border-brand-stroke px-4 py-3 text-left transition-colors ${
                    selectedPlan === "annual" ? "bg-brand-lime/25" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-['Plus_Jakarta_Sans'] text-sm text-foreground">
                      {MARKTR_PAYWALL_ANNUAL_PRICE_LINE}
                    </span>
                    <span className="shrink-0 rounded-full border-2 border-brand-stroke bg-brand-lime px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[11px] font-semibold text-brand-navy">
                      {MARKTR_PAYWALL_ANNUAL_SAVINGS_BADGE}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === "monthly"}
                  data-track-id="paywall_plan_monthly"
                  data-track-location="paywall"
                  onClick={() => selectPlan("monthly")}
                  className={`w-full min-h-11 rounded-[20px] border-2 border-brand-stroke px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-sm text-foreground transition-colors ${
                    selectedPlan === "monthly" ? "bg-brand-lime/25" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  {MARKTR_PAYWALL_MONTHLY_PRICE_LINE}
                </button>
              </div>
            )}

            <div className="border-2 border-brand-stroke bg-brand-lime/20 shadow-md rounded-[24px] p-4 sm:p-5">
              <h4 className="font-['Fraunces'] text-base mb-1">{MARKTR_PRO_PLAN_NAME}</h4>
              <p className="font-['Fraunces'] text-lg sm:text-xl leading-snug">{paywallOfferPriceLine(selectedPlan)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-[16px] border-2 border-brand-stroke bg-background px-3 py-2.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy dark:text-brand-lime" aria-hidden="true" />
              <p className="font-['Plus_Jakarta_Sans'] text-xs leading-snug">{MARKTR_MONEY_BACK_GUARANTEE}</p>
            </div>
            <Button
              data-track-id="paywall_start_trial"
              data-track-location="pricing"
              data-track-destination="checkout"
              onClick={() => onUpgrade(selectedPlan)}
              disabled={isStartingCheckout}
              className="w-full h-12 text-lg"
            >
              {isStartingCheckout ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Redirecting to checkout…
                </span>
              ) : (
                "Get full access"
              )}
            </Button>
            <p className="text-center text-xs text-foreground/70 font-['Plus_Jakarta_Sans']">
              No payment due today. Cancel any time before {firstChargeLabel}.
            </p>

            <button
              type="button"
              onClick={handleAttemptContinueFree}
              disabled={isStartingCheckout}
              className="w-full font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 min-h-11 text-center"
            >
              Continue with limited free version
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-warm-grey">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="/terms-of-service"
                className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <span className="text-foreground/30">•</span>
              <a
                href="/privacy-policy"
                className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-foreground/30">•</span>
              <a
                href="#"
                className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Cancellation Policy
              </a>
              {!showAllPlans && (
                <>
                  <span className="text-foreground/30">•</span>
                  <button
                    type="button"
                    data-track-id="paywall_see_all_plans"
                    data-track-location="paywall"
                    onClick={() => {
                      setShowAllPlans(true);
                      track("paywall_see_all_plans");
                    }}
                    className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60 hover:text-foreground underline underline-offset-2 min-h-11"
                  >
                    See all plans
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-[rgb(16_26_38_/_0.55)]" onClick={() => setShowExitConfirm(false)} />

          <div className="relative w-full max-w-md bg-background border-2 border-brand-stroke rounded-[28px] shadow-[var(--brand-shadow)] p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-['Fraunces'] text-2xl">Continue with limited free?</h3>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="p-2 hover:bg-muted/40 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
              You’ll keep your free health check results and brand story, but deeper analysis,
              content strategy and social connections stay locked.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConfirmStartTrial}
                disabled={isStartingCheckout}
                className="w-full h-11"
              >
                Start free trial
              </Button>
              <button
                type="button"
                onClick={handleConfirmContinueFree}
                className="w-full font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 min-h-11 text-center"
              >
                Continue with Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaywallAbandonOffer({
  isOpen,
  onStartMonthly,
  onDismiss,
  isStartingCheckout = false,
}: {
  isOpen: boolean;
  onStartMonthly: () => void;
  onDismiss: () => void;
  isStartingCheckout?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[rgb(16_26_38_/_0.55)] backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:py-8">
        <div
          className="w-full max-w-md my-auto bg-background border-2 border-brand-stroke rounded-[28px] shadow-[var(--brand-shadow)] p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-abandon-title"
        >
          <h3 id="paywall-abandon-title" className="font-['Fraunces'] text-2xl leading-snug mb-3">
            Prefer to go month by month?
          </h3>
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 mb-4">
            Same {MARKTR_TRIAL_DAYS}-day free trial, then {MARKTR_PAYWALL_MONTHLY_PRICE_LINE}. Cancel any time.
          </p>
          <div className="mb-5">
            <PaywallTrialJourney plan="monthly" />
          </div>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              data-track-id="paywall_abandon_start_monthly"
              data-track-location="paywall"
              data-track-destination="checkout"
              onClick={() => {
                track("paywall_abandon_start_monthly");
                onStartMonthly();
              }}
              disabled={isStartingCheckout}
              className="w-full h-12"
            >
              {isStartingCheckout ? "Redirecting to checkout…" : "Start my free trial"}
            </Button>
            <button
              type="button"
              data-track-id="paywall_abandon_dismiss"
              data-track-location="paywall"
              onClick={() => {
                track("paywall_abandon_dismiss");
                onDismiss();
              }}
              disabled={isStartingCheckout}
              className="w-full font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 min-h-11 text-center"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
