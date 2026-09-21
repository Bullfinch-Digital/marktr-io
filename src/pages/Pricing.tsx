import { Check, Lock, RotateCcw, Heart } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { usePaywall } from "../contexts/PaywallContext";
import {
  MARKTR_MONEY_BACK_DAYS,
  MARKTR_MONEY_BACK_GUARANTEE,
  MARKTR_PRO_ANNUAL_TOTAL_GBP,
  MARKTR_PRO_BENEFITS,
  MARKTR_PRO_BILLING_LINE,
  MARKTR_PRO_CARD_SUBTITLE,
  MARKTR_PRO_MONTHLY_EQUIVALENT_GBP,
  MARKTR_PRO_PLAN_NAME,
  MARKTR_PRO_PRICE_HEADLINE,
  MARKTR_TRIAL_DAYS,
  MARKTR_TRIAL_FINE_PRINT,
  MARKTR_TRIAL_LEGAL_STRIP,
} from "../lib/marktrPricing";

function CompareCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <Check className="w-5 h-5 mx-auto" strokeWidth={3} style={{ color: "#4A9D3C" }} />
    );
  }
  if (value === false) {
    return <span>—</span>;
  }
  return <>{value}</>;
}

export default function Pricing() {
  const { openPaywall, isStartingCheckout } = usePaywall();

  const faqs = [
    {
      question: "What happens if I cancel?",
      answer:
        "You keep full access until the end of your billing period. After that, your data isn't deleted, but the dashboard is locked behind an upgrade prompt until you resubscribe — you can still get to your account and billing at any time.",
    },
    {
      question: "Do unused ICPs roll over?",
      answer:
        "Pro includes unlimited ICPs, so there's nothing to roll over. Generate as many as you need!",
    },
    {
      question: "Can I cancel during the free trial?",
      answer: `Yes. Cancel anytime before day ${MARKTR_TRIAL_DAYS} and you won't be charged. After your first payment, our ${MARKTR_MONEY_BACK_DAYS}-day money-back guarantee still applies.`,
    },
    {
      question: "Do you offer refunds?",
      answer: MARKTR_MONEY_BACK_GUARANTEE,
    },
    {
      question: "How does billing through Stripe work?",
      answer:
        "Stripe is our secure payment partner. They handle all billing and provide you with receipts. You can manage your subscription directly through your account settings.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-['Fraunces'] text-4xl sm:text-5xl lg:text-6xl mb-6">
            Plans built to help you target smarter & grow faster
          </h1>
          <p className="font-['Inter'] text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto">
            Start free. Upgrade for the full Brand Story System, unlimited ICPs, your complete
            health report, content strategy, and exportable ICPs, brand stories, strategies, and
            content.
          </p>
        </div>
      </section>

      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-xl">
          <div className="relative bg-background rounded-design p-8 flex flex-col border-2 border-black shadow-lg">
            <div className="mb-6">
              <h3 className="font-['Fraunces'] text-2xl mb-2">{MARKTR_PRO_PLAN_NAME}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-['Fraunces'] text-4xl">{MARKTR_PRO_PRICE_HEADLINE}</span>
              </div>
              <p className="font-['Inter'] text-xs text-foreground/60 mb-1">{MARKTR_PRO_BILLING_LINE}</p>
              <p className="font-['Inter'] text-xs text-foreground/60 mb-2">VAT may apply</p>
              <p className="font-['Inter'] text-sm text-foreground/70">{MARKTR_PRO_CARD_SUBTITLE}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {MARKTR_PRO_BENEFITS.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-button-green shrink-0 mt-0.5" />
                  <span className="font-['Inter'] text-sm">{feature.label}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              disabled={isStartingCheckout}
              onClick={() => openPaywall("annual")}
              className="w-full font-['Fraunces'] bg-button-green text-text-dark hover:bg-button-green/90 transition-all hover:scale-105 active:scale-95"
            >
              {isStartingCheckout ? "Redirecting…" : "Start free trial"}
            </Button>
            <p className="mt-3 text-center font-['Inter'] text-xs text-foreground/60">
              {MARKTR_TRIAL_FINE_PRINT}
            </p>
            <p className="mt-2 text-center font-['Inter'] text-xs text-foreground/60">
              {MARKTR_MONEY_BACK_GUARANTEE}
            </p>
          </div>

          <p className="mt-6 text-center font-['Inter'] text-xs text-foreground/60">
            {MARKTR_TRIAL_LEGAL_STRIP}
          </p>
        </div>
      </section>

      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-2">
            <p className="font-['Inter'] text-xs text-foreground/60">
              Prices shown in GBP (£). Plan renews automatically. Cancel anytime in your account
              settings.
            </p>
            <p className="font-['Inter'] text-xs text-foreground/60">
              <Link to="/terms-of-service" className="underline hover:text-foreground transition-colors">
                Full Terms
              </Link>{" "}
              &{" "}
              <Link to="/privacy-policy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-accent-grey/20">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-['Fraunces'] text-3xl sm:text-4xl text-center mb-12">Compare Plans</h2>

          <div className="bg-background rounded-design border border-black overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-grey">
                  <th className="text-left p-4 sm:p-6 font-['Fraunces'] text-lg">Features</th>
                  <th className="text-center p-4 sm:p-6 font-['Fraunces'] text-lg">Before you sign up</th>
                  <th className="text-center p-4 sm:p-6 font-['Fraunces'] text-lg bg-button-green/10">
                    Marktr Pro — {MARKTR_TRIAL_DAYS}-day free trial
                  </th>
                </tr>
              </thead>
              <tbody className="font-['Inter'] text-sm">
                {MARKTR_PRO_BENEFITS.map((feature) => (
                  <tr key={feature.id} className="border-b border-warm-grey">
                    <td className="p-4 sm:p-6">{feature.compareLabel}</td>
                    <td className="text-center p-4 sm:p-6 text-foreground/60">
                      <CompareCell value={feature.free} />
                    </td>
                    <td className="text-center p-4 sm:p-6 bg-button-green/5">
                      <CompareCell value={feature.pro} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="p-4 sm:p-6">{MARKTR_MONEY_BACK_DAYS}-day money-back guarantee</td>
                  <td className="text-center p-4 sm:p-6 text-foreground/60">—</td>
                  <td className="text-center p-4 sm:p-6 bg-button-green/5">
                    <CompareCell value={true} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-accent-grey/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <p className="font-['Inter'] text-sm">Secure checkout via Stripe</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <p className="font-['Inter'] text-sm">
                {MARKTR_MONEY_BACK_DAYS}-day money-back guarantee
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <p className="font-['Inter'] text-sm">Loved by founders, marketers & SMEs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-['Fraunces'] text-3xl sm:text-4xl text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="bg-background rounded-design border border-black p-6 transition-all hover:shadow-lg"
              >
                <h3 className="font-['Fraunces'] text-lg mb-3">{faq.question}</h3>
                <p className="font-['Inter'] text-sm text-foreground/70 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center font-['Inter'] text-xs text-foreground/50">
            Effective rate £{MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/mo · £{MARKTR_PRO_ANNUAL_TOTAL_GBP}
            /year billed annually
          </p>
        </div>
      </section>
    </div>
  );
}
