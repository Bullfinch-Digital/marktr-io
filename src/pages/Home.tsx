import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import CaseStudies from "@/components/home/CaseStudies";
import JourneyMap from "@/components/home/JourneyMap";
import { QuoteStrip } from "@/components/home/Testimonials";

const WAYS_IN = [
  {
    step: "01",
    trackId: "hero_card_1",
    location: "card_1",
    href: "/health-check",
    eyebrow: "See where you stand",
    title: "Check your digital health",
    description:
      "Score your digital presence across 5 dimensions — and see exactly where to focus.",
    image: "/images/graphics/marktr-card1-health-simple.png",
    imageAlt: "Digital health scores in marktr",
    recommended: true,
  },
  {
    step: "02",
    trackId: "hero_card_2",
    location: "card_2",
    href: "/story",
    eyebrow: "Say what makes you different",
    title: "Find your brand story",
    description:
      "Discover the narrative that makes your business impossible to ignore — in minutes.",
    image: "/images/graphics/marktr-card2-brand-story-simple.png",
    imageAlt: "Brand story questions in marktr",
    recommended: false,
  },
  {
    step: "03",
    trackId: "hero_card_3",
    location: "card_3",
    href: "/onboarding-build",
    eyebrow: "Start with who you sell to",
    title: "Build your ideal customer profile",
    description:
      "Define your ideal customer profile once. Then create laser focused content that speaks directly to them.",
    image: "/images/graphics/marktr-card3-customer-profiles-simple.png",
    imageAlt: "Ideal customer profiles in marktr",
    recommended: false,
  },
] as const;

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="overflow-x-hidden bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-[#101A26]">
      {/* SECTION 1 — Opening hero and three ways in */}
      <section id="ways-in" data-track-section="hero" className="home-opening px-6 pb-12 pt-12 lg:pb-14">
        <div className="relative z-10 mx-auto max-w-6xl">
          <h1 className="max-w-6xl text-left">
            <span className="home-pill-line">
              <span className="home-pill">Your entire marketing team</span>
            </span>
            <span className="home-pill-line">
              <span className="home-pill">in one platform.</span>
            </span>
          </h1>
          <p className="mt-6 max-w-6xl font-['Plus_Jakarta_Sans'] text-lg leading-snug text-[#0B0B0C] lg:whitespace-nowrap lg:text-xl">
            Brand Foundations. Customer Insights. Strategy. Content.
          </p>
          <p className="mt-4 font-['Plus_Jakarta_Sans'] text-sm text-[#0B0B0C]/80">
            Start in any order. Most people begin with their Digital Health Check.
          </p>

        <div className="relative mt-4">
          <div
            aria-hidden
            className="pointer-events-none absolute left-8 right-8 top-9 hidden border-t border-dashed border-[#101A26]/40 lg:block"
          />
          <div data-track-section="cards" className="ways-in-grid grid gap-8 lg:grid-cols-3">
            {WAYS_IN.map((way) => (
              <Link
                key={way.step}
                to={way.href}
                data-track-id={way.trackId}
                data-track-location={way.location}
                className={
                  way.recommended
                    ? "ways-in-card relative z-10 flex flex-col overflow-hidden rounded-[24px] border-2 border-[#101A26] bg-white shadow-xl outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101A26]"
                    : "ways-in-card relative flex flex-col overflow-hidden rounded-[24px] border border-[#101A26]/10 bg-white shadow-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101A26] lg:self-start"
                }
              >
                <div className={`relative overflow-hidden bg-[#FBFAF0] ${way.recommended ? "h-64" : "h-52"}`}>
                  <img
                    src={way.image}
                    alt={way.imageAlt}
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#101A26] bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]">
                      {way.step}
                    </span>
                    {way.recommended ? (
                      <span className="rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[13px] font-medium leading-none text-[#0B0B0C]">
                        Recommended starting point
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 text-left">
                  <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
                    {way.eyebrow}
                  </p>
                  <h3 className="mt-1.5 font-['Fraunces'] text-2xl font-bold leading-tight text-[#101A26]">{way.title}</h3>
                  <p className="mt-1.5 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">
                    {way.description}
                  </p>
                  <span
                    className={
                      way.recommended
                        ? "ways-in-cta mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#101A26] px-7 py-3.5 font-['Plus_Jakarta_Sans'] text-base font-medium text-white"
                        : "ways-in-cta mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#101A26] bg-white px-7 py-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]"
                    }
                  >
                    Get started free →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        </div>
      </section>

      <QuoteStrip />

      <JourneyMap />

      <section data-track-section="comparison" className="bg-[#FBFAF0] px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="compare-card flex h-full flex-col rounded-[28px] border border-[#101A26]/12 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
            <p className="inline-flex w-fit items-center rounded-full border-2 border-[#0B0B0C] bg-[#FBFAF0] px-3 py-1 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#0B0B0C]">
              The old way
            </p>
            <h2 className="mt-5 max-w-lg font-['Fraunces'] text-[1.7rem] font-bold leading-[1.25] tracking-[-0.01em] text-[#101A26] sm:text-[1.95rem]">
              Paying for marketing that doesn't know your customer.
            </h2>
            <ul className="mt-8 divide-y divide-[#101A26]/10">
              {[
                "Agency fees of £3,000+ per month",
                "Generic content that sounds like everyone else",
                "No idea who your ideal customer is",
                "Tactics without a strategy or system",
                "Marketing that doesn't reflect the quality of your work",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 py-3.5 font-['Plus_Jakarta_Sans'] text-[16px] leading-relaxed text-[#101A26]/70">
                  <span className="mt-0.5 w-4 shrink-0 text-center font-semibold text-[#8B97AB]" aria-hidden>
                    ×
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="compare-card compare-marktr relative flex h-full flex-col overflow-hidden rounded-[28px] p-8 sm:p-10 lg:p-12">
            <div className="relative z-10">
              <p className="inline-flex w-fit items-center rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-3 py-1 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#0B0B0C]">
                The marktr way
              </p>
              <h2 className="mt-5 max-w-lg font-['Fraunces'] text-[1.7rem] font-bold leading-[1.25] tracking-[-0.01em] text-[#FBFAF0] sm:text-[1.95rem]">
                Marketing built on knowing exactly who you're talking to.
              </h2>
              <ul className="mt-8 divide-y divide-white/15">
                {[
                  "Start with your ideal customer profile — defined and stored",
                  "Content generated in your voice, for your customer",
                  "Brand story captured once, applied everywhere",
                  "Full strategy before a single post is written",
                  "Results measured against your real goals",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 py-3.5 font-['Plus_Jakarta_Sans'] text-[16px] leading-relaxed text-[#FBFAF0]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EBFD84]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <CaseStudies />

      {/* SECTION 7 — CTA band */}
      <section data-track-section="final_cta" className="relative overflow-hidden bg-[#FBFAF0] px-6 py-20 text-center lg:py-28">
        <img
          src="/brand/Bullfinch_Icons_21.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-8 top-8 hidden w-52 opacity-90 md:block lg:w-64"
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="font-['Fraunces'] text-4xl font-bold text-[#101A26] sm:text-5xl">
            Your marketing team is ready.
          </h2>
          <p className="mt-4 font-['Plus_Jakarta_Sans'] text-lg text-[#101A26]/70">
            Know your customer. Shape your story. Check your digital health. All free. No agency required.
          </p>
          <Link
            to="/health-check"
            data-track-id="final_cta_get_started"
            data-track-location="final_cta"
            className="mt-10 inline-flex items-center justify-center rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-10 py-4 font-['Plus_Jakarta_Sans'] text-lg font-medium text-[#0B0B0C] transition-opacity hover:bg-[#EBFD84]/90"
          >
            Get started - Free
          </Link>
        </div>
      </section>
    </main>
  );
}
