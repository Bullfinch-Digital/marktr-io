import { PricingSalesSection } from "../components/pricing/PricingSalesSection";
import {
  MARKTR_MONEY_BACK_DAYS,
  MARKTR_MONEY_BACK_GUARANTEE,
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

      <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-['Fraunces'] text-3xl sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-design border border-black bg-background p-6 transition-all hover:shadow-lg"
              >
                <h3 className="mb-3 font-['Fraunces'] text-lg">{faq.question}</h3>
                <p className="font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-foreground/70">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
