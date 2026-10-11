import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import CaseStudies from "@/components/home/CaseStudies";
import JourneyMap from "@/components/home/JourneyMap";
import { QuoteStrip } from "@/components/home/Testimonials";

const FAMILIAR = [
  "Where do I even start?",
  "I can't afford an agency.",
  "I keep posting, and nothing seems to land.",
] as const;

const MONDAY = [
  "who your customers are and what keeps them up at night",
  "what to say, in words that sound like you",
  "which channels to focus on, and why",
  "exactly what to post this week, with the briefs ready to go",
] as const;

const THREE_STEPS = [
  {
    step: "1",
    eyebrow: "See where you stand",
    title: "Your Digital Health Score",
    description:
      "Score your digital presence across 5 dimensions — and see exactly where to focus.",
    image: "/images/graphics/marktr-card1-health-simple.png",
    imageAlt: "Digital health scores in marktr",
    href: "/health-check",
    linkLabel: "Check your score ->",
    trackId: "home_foundation_health",
  },
  {
    step: "2",
    eyebrow: "Say what makes you different",
    title: "Build Your Brand Story",
    description:
      "Discover the narrative that makes your business impossible to ignore — in minutes.",
    image: "/images/graphics/marktr-card2-brand-story-simple.png",
    imageAlt: "Brand story questions in marktr",
    href: "/story",
    linkLabel: "Build your story ->",
    trackId: "home_foundation_story",
  },
  {
    step: "3",
    eyebrow: "Start with who you sell to",
    title: "Discover Your ICPs",
    description:
      "Define your ideal customer profile once. Then create laser focused content that speaks directly to them.",
    image: "/images/graphics/marktr-card3-customer-profiles-simple.png",
    imageAlt: "Ideal customer profiles in marktr",
    href: "/onboarding-build",
    linkLabel: "Find your customers ->",
    trackId: "home_foundation_icp",
  },
] as const;

const ctaClassName =
  "mt-6 flex w-full items-center justify-center rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-10 py-6 font-['Plus_Jakarta_Sans'] text-2xl font-medium text-[#0B0B0C] transition-opacity hover:bg-[#EBFD84]/90 sm:inline-flex sm:w-auto sm:px-14 sm:py-7";

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="overflow-x-hidden bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-[#101A26]">
      {/* SECTION 1 — Opening hero */}
      <section id="ways-in" data-track-section="hero" className="home-opening px-6 pb-14 pt-12 lg:pb-20 lg:pt-16">
        <div className="relative z-10 mx-auto max-w-6xl">
          <p className="inline-flex max-w-full items-center rounded-full border-2 border-[#0B0B0C] bg-[#FBFAF0] px-3 py-1 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#0B0B0C]">
            Marketing your business on your own?
          </p>
          <h1 className="mt-5 max-w-6xl text-left">
            <span className="home-pill-line">
              <span className="home-pill">Your entire marketing team</span>
            </span>
            <span className="home-pill-line">
              <span className="home-pill">in one platform.</span>
            </span>
          </h1>
          <p className="mt-8 max-w-3xl font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-[#0B0B0C] sm:text-lg">
            You know your business inside out. What you don't have is a marketing team, or an agency budget. marktr gives you the thinking agencies charge hundreds, often thousands, for: who your customers are, what to say to them and what to post. In minutes, in one tool.
          </p>
          <Link
            to="/health-check"
            data-track-id="hero_primary_cta"
            data-track-location="hero"
            className={ctaClassName}
          >
            Get started - Free
          </Link>
          <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm text-[#0B0B0C]/70">
            Free to start. No account needed to begin.
          </p>
        </div>
      </section>

      <section className="bg-[#FBFAF0] px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-['Fraunces'] text-3xl font-bold text-[#101A26] sm:text-4xl">Sound familiar?</h2>
          <div className="mt-8 grid items-stretch gap-4 md:grid-cols-3 md:gap-6">
            {FAMILIAR.map((line) => (
              <blockquote
                key={line}
                className="flex h-full min-w-0 flex-col justify-center rounded-[24px] border border-[#101A26]/10 bg-white p-6 shadow-sm sm:p-8"
              >
                <p className="font-['Fraunces'] text-2xl font-medium italic leading-snug text-[#101A26] sm:text-[1.65rem]">
                  <span aria-hidden="true">“</span>
                  {line}
                  <span aria-hidden="true">”</span>
                </p>
              </blockquote>
            ))}
          </div>
          <p className="mt-8 font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-[#101A26] sm:text-lg">
            marktr gives you the starting point, the strategy and the content.
          </p>
        </div>
      </section>

      <section className="bg-[#FBFAF0] px-6 pb-16 lg:pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-3xl font-['Fraunces'] text-3xl font-bold leading-tight text-[#101A26] sm:text-4xl">
            Imagine opening your laptop on Monday and already knowing:
          </h2>
          <ul className="mt-8 max-w-3xl space-y-4">
            {MONDAY.map((item) => (
              <li key={item} className="flex min-w-0 items-start gap-3 font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-[#101A26] sm:text-lg">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#0B0B0C] bg-[#EBFD84]">
                  <Check className="h-4 w-4 text-[#0B0B0C]" aria-hidden />
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#FBFAF0] px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-['Fraunces'] text-3xl font-bold text-[#101A26] sm:text-4xl">One tool. Three foundations.</h2>
          <div className="relative mt-8">
            <div
              aria-hidden
              className="pointer-events-none absolute left-8 right-8 top-9 hidden border-t border-dashed border-[#101A26]/40 lg:block"
            />
            <div className="grid items-stretch gap-8 lg:grid-cols-3">
              {THREE_STEPS.map((way) => (
                <Link
                  key={way.step}
                  to={way.href}
                  data-track-id={way.trackId}
                  data-track-location="home_foundations"
                  className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#101A26]/10 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B0C]"
                >
                  <div className="relative h-52 overflow-hidden bg-[#FBFAF0]">
                    <img
                      src={way.image}
                      alt={way.imageAlt}
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute left-4 top-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#101A26] bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]">
                        {way.step}
                      </span>
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
                    <span className="mt-4 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26] underline underline-offset-4">
                      {way.linkLabel}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#FBFAF0] px-6 pb-16 text-center lg:pb-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-['Plus_Jakarta_Sans'] text-base leading-relaxed text-[#101A26]/60 sm:text-lg">
            marktr isn't an agency. It gives you the strategy and the content, and you stay in control of your brand.
          </p>
          <Link
            to="/health-check"
            data-track-id="home_bottom_cta"
            data-track-location="home_bottom"
            className={ctaClassName}
          >
            Get started - Free
          </Link>
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
