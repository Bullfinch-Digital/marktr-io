import { PRICING_PRO_CARD_ID, PRICING_SALES } from "@/lib/marktrPricing";

function scrollToProCard() {
  const target = document.getElementById(PRICING_PRO_CARD_ID);
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function PricingSalesSection() {
  const copy = PRICING_SALES;

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
          {copy.costsLabel}
        </p>
        <div className="relative mt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute left-10 right-10 top-6 hidden border-t border-dashed border-foreground/30 lg:block"
          />
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
            {copy.costs.map((card) => (
              <article
                key={card.title}
                className="relative z-10 flex h-full flex-col overflow-hidden rounded-[24px] border-2 border-brand-stroke bg-card"
              >
                <div className="flex flex-1 flex-col p-6 text-left sm:p-7">
                  <h2 className="font-['Fraunces'] text-xl font-medium leading-snug text-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/50">
                    {copy.usualCostLabel}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">{card.usualCost}</p>
                </div>
                <div className="border-t-2 border-brand-stroke bg-brand-lime p-6 text-left text-brand-navy sm:p-7">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em]">{copy.withMarktrLabel}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed">{card.withMarktr}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="pricing-sales-reveal mx-auto mt-16 max-w-[1040px] text-center delay-200 lg:mt-20">
        <p className="mx-auto max-w-3xl font-['Fraunces'] text-2xl font-medium leading-snug text-foreground sm:text-3xl lg:text-[2.15rem]">
          {copy.bridgeBefore}
          <span className="inline rounded-full border-2 border-brand-stroke bg-brand-lime px-[0.35em] py-[0.05em] text-brand-navy [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            {copy.bridgeHighlight}
          </span>
          {copy.bridgeAfter}
        </p>
        <p className="mx-auto mt-5 max-w-xl text-sm text-foreground/55">{copy.honest}</p>
        <a
          href={`#${PRICING_PRO_CARD_ID}`}
          data-track-id="pricing_hero_cta"
          data-track-location="pricing_hero"
          data-track-destination={`#${PRICING_PRO_CARD_ID}`}
          onClick={(event) => {
            event.preventDefault();
            scrollToProCard();
          }}
          className="mt-10 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-brand-stroke bg-brand-lime px-8 py-3.5 text-base font-medium text-brand-navy transition-opacity hover:bg-brand-lime/90 sm:w-auto sm:min-w-[280px]"
        >
          {copy.cta}
        </a>
        <p className="mt-3 text-sm text-foreground/55">{copy.ctaFinePrint}</p>
        <p className="mx-auto mt-16 max-w-2xl text-xs leading-relaxed text-foreground/50 lg:mt-20">
          {copy.footnoteBefore}
          {copy.sources.map((source, index) => (
            <span key={source.id}>
              {index > 0 ? " · " : null}
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                data-track-id={source.id}
                data-track-location="pricing_hero"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {source.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
