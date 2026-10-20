import { useEffect } from "react";
import { Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  MARKTR_PRO_BILLING_LINE,
  MARKTR_PRO_PRICE_HEADLINE,
  PRICING_PRO_CARD_ID,
  PRICING_SALES,
} from "@/lib/marktrPricing";
import { usePaywall } from "@/contexts/PaywallContext";
import { useAuth } from "@/contexts/AuthContext";
import useSubscription from "@/hooks/useSubscription";
import { isRealUser } from "@/utils/isRealUser";

export function PricingSalesSection() {
  const copy = PRICING_SALES;
  const { user } = useAuth();
  const { isPro, ready: subscriptionReady } = useSubscription();
  const { openPaywall, startCheckout, isStartingCheckout } = usePaywall();
  const hasAccess = isRealUser(user) && subscriptionReady && isPro;

  useEffect(() => {
    if (window.location.hash.replace(/^#/, "") !== PRICING_PRO_CARD_ID) return;
    document.getElementById(PRICING_PRO_CARD_ID)?.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  return (
    <section
      data-track-section="pricing_hero"
      className="overflow-x-hidden bg-background px-4 pb-16 pt-24 font-['Plus_Jakarta_Sans'] text-foreground sm:px-6 lg:px-8 lg:pb-20"
    >
      <div className="pricing-sales-reveal mx-auto w-full max-w-[1040px] text-center">
        <p className="inline-flex items-center rounded-full border-2 border-brand-stroke bg-brand-lime px-3 py-1 text-[13px] font-medium leading-none text-brand-navy">
          {copy.pill}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl font-['Fraunces'] text-4xl font-medium leading-[1.15] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.25rem]">
          {copy.h1}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
          {copy.subhead}
        </p>
      </div>

      <div className="pricing-sales-reveal mx-auto mt-16 w-full max-w-[1040px] delay-100 lg:mt-20">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/55">
          {copy.problemsLabel}
        </p>
        <div className="relative mt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute left-10 right-10 top-6 hidden border-t border-dashed border-foreground/30 lg:block"
          />
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
            {copy.problems.map((card) => (
              <article
                key={card.title}
                className="relative z-10 flex h-full flex-col overflow-hidden rounded-[24px] border-2 border-brand-stroke bg-card"
              >
                <div className="flex flex-1 flex-col p-6 text-left sm:p-7">
                  <h2 className="font-['Fraunces'] text-xl font-medium leading-snug text-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80">{card.problem}</p>
                </div>
                <div className="border-t-2 border-brand-stroke bg-brand-lime p-6 text-left text-brand-navy sm:p-7">
                  <p className="text-sm font-medium leading-relaxed">{card.withMarktr}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div
        id={PRICING_PRO_CARD_ID}
        className="pricing-sales-reveal mx-auto mt-16 max-w-[560px] scroll-mt-32 text-center delay-200 lg:mt-20"
      >
        <p className="font-['Fraunces'] text-5xl font-medium leading-none tracking-[-0.03em] text-foreground sm:text-6xl">
          {MARKTR_PRO_PRICE_HEADLINE}
        </p>
        <p className="mt-3 text-base text-foreground/70 sm:text-lg">{MARKTR_PRO_BILLING_LINE}</p>
        <p className="mt-4 text-sm font-medium text-foreground/80">{copy.everythingLine}</p>
        <button
          type="button"
          data-track-id="pricing_hero_cta"
          data-track-location="pricing_hero"
          data-track-destination="paywall"
          disabled={isStartingCheckout}
          onClick={() => {
            if (hasAccess) {
              void startCheckout("annual");
              return;
            }
            openPaywall("annual", "pricing_page");
          }}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-brand-stroke bg-brand-lime px-8 py-3.5 text-base font-medium text-brand-navy transition-opacity hover:bg-brand-lime/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[280px]"
        >
          {isStartingCheckout ? "Redirecting…" : hasAccess ? "Manage billing" : copy.cta}
        </button>
        <div className="mx-auto mt-8 max-w-md text-left">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/55">
            {copy.includedLabel}
          </p>
          <ul className="mt-4 space-y-3">
            {copy.included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-stroke bg-brand-lime text-brand-navy">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mx-auto mt-6 max-w-[34rem] text-xs leading-relaxed text-foreground/55">
          {copy.legalLine}{" "}
          <Link to="/terms-of-service" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>
          {" · "}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
            Privacy
          </Link>
        </p>
        <p className="mt-4 inline-flex items-center justify-center gap-2 text-xs text-foreground/55">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Secure checkout via Stripe
        </p>
      </div>
    </section>
  );
}
