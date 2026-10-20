import { Lock, RotateCcw, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { PricingSalesSection } from "../components/pricing/PricingSalesSection";
import {
  MARKTR_MONEY_BACK_DAYS,
  MARKTR_MONEY_BACK_GUARANTEE,
  MARKTR_PRO_ANNUAL_TOTAL_GBP,
  MARKTR_PRO_MONTHLY_EQUIVALENT_GBP,
  MARKTR_TRIAL_DAYS,
} from "../lib/marktrPricing";

export default function Pricing() {

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
      <PricingSalesSection />

      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-2">
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60">
              Prices shown in GBP (£). Plan renews automatically. Cancel anytime in your account
              settings.
            </p>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-foreground/60">
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

      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-accent-grey/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">Secure checkout via Stripe</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">
                {MARKTR_MONEY_BACK_DAYS}-day money-back guarantee
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-black flex items-center justify-center">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-sm">Loved by founders, marketers & SMEs</p>
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
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-foreground/70 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center font-['Plus_Jakarta_Sans'] text-xs text-foreground/50">
            Effective rate £{MARKTR_PRO_MONTHLY_EQUIVALENT_GBP}/mo · £{MARKTR_PRO_ANNUAL_TOTAL_GBP}
            /year billed annually
          </p>
        </div>
      </section>
    </div>
  );
}
