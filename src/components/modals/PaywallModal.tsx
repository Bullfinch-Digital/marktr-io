import { useState } from "react";
import { Button } from "../ui/button";
import { X, Check } from "lucide-react";
import {
  MARKTR_DEFAULT_CHECKOUT_PLAN,
  MARKTR_MONEY_BACK_GUARANTEE,
  MARKTR_PRO_BILLING_LINE,
  MARKTR_PRO_CARD_SUBTITLE,
  MARKTR_PRO_PLAN_NAME,
  MARKTR_PRO_PRICE_HEADLINE,
  MARKTR_TRIAL_CTA_SUBCOPY,
  MARKTR_TRIAL_DAYS,
  MARKTR_TRIAL_LEGAL_STRIP,
} from "../../lib/marktrPricing";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: "monthly" | "annual", force?: boolean) => void;
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

  const trialFeatures = [
    "Know Your Customer — full ICP profile unlocked",
    "Digital Health Check — complete score breakdown",
    "Brand Story System — your story, fully built",
    "Content strategy and campaign ideas",
    "Connect Instagram and Facebook for real engagement data",
    "Save and manage multiple brands",
    "Export and share your results",
    "Step-by-step plan to improve every score",
  ];

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="sticky top-0 bg-background border-b border-warm-grey p-6 flex items-start justify-between">
          <div>
            <h2 className="font-['Fraunces'] text-3xl mb-2">Get full access in 60 seconds</h2>
            <p className="font-['Inter'] text-foreground/70 max-w-xl">
              Start your {MARKTR_TRIAL_DAYS}-day free trial now. £0 today, then billed on day{" "}
              {MARKTR_TRIAL_DAYS + 1}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <h3 className="font-['Fraunces'] text-xl mb-4">Your plan after the trial</h3>

            <div className="border-2 border-black bg-button-green/20 shadow-md rounded-design p-6">
              <div className="mb-2">
                <h4 className="font-['Fraunces'] text-lg mb-1">{MARKTR_PRO_PLAN_NAME}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Fraunces'] text-3xl">{MARKTR_PRO_PRICE_HEADLINE}</span>
                </div>
              </div>
              <p className="font-['Inter'] text-sm text-foreground/70">
                {MARKTR_PRO_BILLING_LINE}
              </p>
              <p className="font-['Inter'] text-xs text-foreground/60 mt-2">{MARKTR_PRO_CARD_SUBTITLE}</p>
            </div>

            <div className="bg-accent-grey/20 border border-warm-grey rounded-design p-4 mt-4 space-y-2">
              <p className="font-['Inter'] text-xs text-foreground/70 text-center">
                {MARKTR_TRIAL_LEGAL_STRIP}
              </p>
              <p className="font-['Inter'] text-xs text-foreground/70 text-center">
                {MARKTR_MONEY_BACK_GUARANTEE}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-['Fraunces'] text-xl mb-4">What full access includes</h3>
            <div className="bg-gradient-to-br from-button-green/10 to-[#BBA0E5]/10 border border-black rounded-design p-6">
              <ul className="grid sm:grid-cols-2 gap-3">
                {trialFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-button-green rounded-full border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="font-['Inter'] text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => onUpgrade(MARKTR_DEFAULT_CHECKOUT_PLAN)}
              disabled={isStartingCheckout}
              className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design py-6 text-lg transition-all hover:scale-[1.02] hover:shadow-lg font-['Inter']"
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
            <p className="text-center text-xs text-foreground/60 font-['Inter']">
              {MARKTR_TRIAL_CTA_SUBCOPY}
            </p>

            <button
              onClick={handleAttemptContinueFree}
              disabled={isStartingCheckout}
              className="w-full font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 text-center"
            >
              Continue with limited free version
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-warm-grey">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="/terms-of-service"
                className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <span className="text-foreground/30">•</span>
              <a
                href="/privacy-policy"
                className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-foreground/30">•</span>
              <a
                href="#"
                className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors"
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExitConfirm(false)} />

          <div className="relative w-full max-w-md bg-background border border-black rounded-design shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-['Fraunces'] text-2xl">Continue with limited free?</h3>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-['Inter'] text-sm text-foreground/70 mb-4">
              You’ll keep your free health check results and brand story, but deeper analysis,
              content strategy and social connections stay locked.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConfirmStartTrial}
                disabled={isStartingCheckout}
                className="w-full bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design font-['Inter']"
              >
                Start free trial
              </Button>
              <button
                onClick={handleConfirmContinueFree}
                className="w-full font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 text-center"
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
