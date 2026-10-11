import { useState } from "react";
import { Button } from "../ui/button";
import { X, Check } from "lucide-react";
import {
  MARKTR_DEFAULT_CHECKOUT_PLAN,
  MARKTR_MONEY_BACK_GUARANTEE,
  MARKTR_PRO_BENEFITS,
  MARKTR_PRO_CARD_SUBTITLE,
  MARKTR_PRO_PLAN_NAME,
  MARKTR_PRO_PRICE_HEADLINE,
  MARKTR_TRIAL_CTA_SUBCOPY,
  PRICING_SALES,
} from "../../lib/marktrPricing";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: "annual", force?: boolean) => void;
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
  if (!isOpen) return null;

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleAttemptContinueFree = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmContinueFree = () => {
    setShowExitConfirm(false);
    onContinueFree();
  };

  const handleConfirmStartTrial = () => {
    setShowExitConfirm(false);
    onUpgrade(MARKTR_DEFAULT_CHECKOUT_PLAN);
  };

  return (
    <div className="fixed inset-0 bg-[rgb(16_26_38_/_0.55)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border-2 border-brand-stroke rounded-[28px] shadow-[var(--brand-shadow)] max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="sticky top-0 bg-background border-b border-warm-grey p-6 flex items-start justify-between">
          <h2 className="font-['Fraunces'] text-2xl sm:text-3xl leading-snug pr-4">{PRICING_SALES.h1}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/40 rounded-full transition-colors flex-shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-8">
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

          <div className="mb-8">
            <h3 className="font-['Fraunces'] text-xl mb-4">What full access includes</h3>
            <div className="bg-gradient-to-br from-brand-lime/15 to-brand-lavender/15 border-2 border-brand-stroke rounded-[24px] p-6">
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

          <div className="mb-6">
            <h3 className="font-['Fraunces'] text-xl mb-4">Your plan after the trial</h3>

            <div className="border-2 border-brand-stroke bg-brand-lime/20 shadow-md rounded-[24px] p-6">
              <div className="mb-2">
                <h4 className="font-['Fraunces'] text-lg mb-1">{MARKTR_PRO_PLAN_NAME}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Fraunces'] text-3xl">Only {MARKTR_PRO_PRICE_HEADLINE}</span>
                </div>
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-base text-foreground mt-2">{MARKTR_PRO_CARD_SUBTITLE}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              data-track-id="paywall_start_trial"
              data-track-location="pricing"
              data-track-destination="checkout"
              onClick={() => onUpgrade(MARKTR_DEFAULT_CHECKOUT_PLAN)}
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
            <p className="text-center text-xs text-foreground/60 font-['Plus_Jakarta_Sans']">
              {MARKTR_TRIAL_CTA_SUBCOPY}
            </p>
            <p className="text-center text-xs text-foreground/60 font-['Plus_Jakarta_Sans']">
              {MARKTR_MONEY_BACK_GUARANTEE}
            </p>

            <button
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
            </div>
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-[rgb(16_26_38_/_0.55)]" onClick={() => setShowExitConfirm(false)} />

          <div className="relative w-full max-w-md bg-background border-2 border-brand-stroke rounded-[28px] shadow-[var(--brand-shadow)] p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-['Fraunces'] text-2xl">Continue with limited free?</h3>
              <button
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
