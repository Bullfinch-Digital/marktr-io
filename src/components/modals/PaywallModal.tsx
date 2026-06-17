import { useState } from "react";
import { Button } from "../ui/button";
import { X, Check } from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: "monthly" | "annual", force?: boolean) => void;
  onContinueFree: () => void;
  selectedPlan: "monthly" | "annual";
  onSelectPlan: (plan: "monthly" | "annual") => void;
  isStartingCheckout?: boolean;
}

export function PaywallModal({
  isOpen,
  onClose,
  onUpgrade,
  onContinueFree,
  selectedPlan,
  onSelectPlan,
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
    onUpgrade(selectedPlan);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-black rounded-design shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-warm-grey p-6 flex items-start justify-between">
          <div>
            <h2 className="font-['Fraunces'] text-3xl mb-2">
              Get full access in 60 seconds
            </h2>
            <p className="font-['Inter'] text-foreground/70 max-w-xl">
              Start your 14-day free trial now. £0 today, then billed on day 15.
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

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Pricing Section */}
          <div className="mb-6">
            <h3 className="font-['Fraunces'] text-xl mb-4">
              Choose how you’ll continue after your trial
            </h3>
            <div className="mb-4">
              <div className="flex justify-center">
                <div className="relative grid w-full max-w-md grid-cols-2 rounded-full border border-black bg-background p-1">
                  <span
                    className={`absolute inset-y-1 w-1/2 rounded-full border border-black bg-button-green/30 transition-transform ${
                      selectedPlan === "annual" ? "translate-x-full" : "translate-x-0"
                    }`}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => onSelectPlan("monthly")}
                    aria-pressed={selectedPlan === "monthly"}
                    className={`relative z-10 rounded-full px-4 py-2 text-xs sm:text-sm font-['Inter'] transition-colors ${
                      selectedPlan === "monthly"
                        ? "text-foreground"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPlan("annual")}
                    aria-pressed={selectedPlan === "annual"}
                    className={`relative z-10 rounded-full px-4 py-2 text-xs sm:text-sm font-['Inter'] transition-colors ${
                      selectedPlan === "annual"
                        ? "text-foreground"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    Yearly (2 months free)
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`border-2 rounded-design p-6 transition-all ${
                selectedPlan === "annual"
                  ? "border-black bg-button-green/20 shadow-md"
                  : "border-warm-grey bg-background"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-['Fraunces'] text-lg mb-1">
                    {selectedPlan === "annual" ? "Pro — Yearly" : "Pro — Monthly"}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="font-['Fraunces'] text-3xl">
                      {selectedPlan === "annual" ? "£25" : "£30"}
                    </span>
                    <span className="font-['Inter'] text-sm text-foreground/70">/month</span>
                  </div>
                </div>
                {selectedPlan === "annual" && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-[#FFD336] border border-black rounded-full px-3 py-1">
                      <span className="font-['Inter'] text-xs">2 months free</span>
                    </div>
                    <div className="bg-button-green border border-black rounded-full px-3 py-1">
                      <span className="font-['Inter'] text-xs uppercase tracking-wide">Recommended</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="font-['Inter'] text-sm text-foreground/70">
                {selectedPlan === "annual"
                  ? "Billed £300 yearly (2 months free)"
                  : "Billed monthly (£360/year)"}
              </p>
              {selectedPlan === "annual" && (
                <p className="font-['Inter'] text-xs text-foreground/60 mt-2">
                  Save £60 vs monthly
                </p>
              )}
            </div>

            {/* Legal Disclosure */}
            <div className="bg-accent-grey/20 border border-warm-grey rounded-design p-4 mb-6">
              <p className="font-['Inter'] text-xs text-foreground/70 text-center">
                £0 today • Cancel anytime before day 14 • Then {selectedPlan === "annual" ? "£300/year" : "£30/month"}
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

          {/* CTAs */}
          <div className="space-y-4">
            <Button
              onClick={() => onUpgrade(selectedPlan)}
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
              £0 today • Cancel anytime before day 14
            </p>

            <button
              onClick={handleAttemptContinueFree}
              disabled={isStartingCheckout}
              className="w-full font-['Inter'] text-sm text-foreground/70 hover:text-foreground transition-colors py-2 text-center"
            >
              Continue with limited free version
            </button>
          </div>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-warm-grey">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href="/terms-of-service" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <span className="text-foreground/30">•</span>
              <a href="/privacy-policy" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <span className="text-foreground/30">•</span>
              <a href="#" className="font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors">
                Cancellation Policy
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Exit Confirm */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowExitConfirm(false)}
          />

          <div className="relative w-full max-w-md bg-background border border-black rounded-design shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-['Fraunces'] text-2xl">
                Continue with limited free?
              </h3>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="p-2 hover:bg-accent-grey/20 rounded-design transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-['Inter'] text-sm text-foreground/70 mb-4">
              You’ll keep your free health check results and brand story, but deeper analysis, content strategy and social connections stay locked.
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
