import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import CaseStudies from "@/components/home/CaseStudies";
import JourneyMap from "@/components/home/JourneyMap";
import Testimonials, { QuoteStrip } from "@/components/home/Testimonials";

const benefits = [
  {
    id: 0,
    label: "Start with your ideal customer",
    screenshot: "/images/graphics/start-with-your-ideal-customer.png",
  },
  {
    id: 1,
    label: "Generate content in your voice",
    screenshot: "/images/graphics/generate-content-in-your-voice.png",
  },
  {
    id: 2,
    label: "Publish and track performance",
    screenshot: "/images/graphics/publish-and-track-performance.png",
  },
  {
    id: 3,
    label: "Replace your agency",
    screenshot: "/images/graphics/replace-your-agency.png",
  },
] as const;

const WAYS_IN = [
  {
    step: "01",
    href: "/health-check",
    eyebrow: "See where you stand",
    title: "Check your digital health",
    description:
      "Score your digital presence across 5 dimensions — and see exactly where to focus.",
    image: "/images/graphics/replace-your-agency.png",
    imageAlt: "Digital health scores in marktr",
    recommended: true,
  },
  {
    step: "02",
    href: "/story",
    eyebrow: "Say what makes you different",
    title: "Find your brand story",
    description:
      "Discover the narrative that makes your business impossible to ignore — in minutes.",
    image: "/images/graphics/generate-content-in-your-voice.png",
    imageAlt: "Brand story questions in marktr",
    recommended: false,
  },
  {
    step: "03",
    href: "/onboarding-build",
    eyebrow: "Start with who you sell to",
    title: "Build your ideal customer profile",
    description:
      "Define your ideal customer profile once. Then create laser focused content that speaks directly to them.",
    image: "/images/graphics/start-with-your-ideal-customer.png",
    imageAlt: "Ideal customer profiles in marktr",
    recommended: false,
  },
] as const;

export default function Home() {
  const [activeBenefit, setActiveBenefit] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="overflow-x-hidden bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-[#101A26]">
      {/* SECTION 1 — Opening hero and three ways in */}
      <section id="ways-in" className="home-opening px-6 pb-12 pt-12 lg:pb-14">
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
            Start in any order. Most people begin by seeing where they stand.
          </p>

        <div className="relative mt-4">
          <div
            aria-hidden
            className="pointer-events-none absolute left-8 right-8 top-9 hidden border-t border-dashed border-[#101A26]/40 lg:block"
          />
          <div className="ways-in-grid grid gap-8 lg:grid-cols-3">
            {WAYS_IN.map((way) => (
              <Link
                key={way.step}
                to={way.href}
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

      <Testimonials />

      {/* SECTION 3 — Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: "url(/brand/Gradient-Background.jpg)",
            backgroundSize: "125% 125%",
            backgroundPosition: "center",
          }}
        />
        <img
          src="/brand/Bullfinch_Icons_04.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 w-64 opacity-80 sm:w-80"
        />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-5 lg:gap-12 lg:py-24">
          <div className="lg:col-span-3">
            <h2 className="font-['Fraunces'] text-4xl font-bold leading-tight text-[#101A26] sm:text-5xl">
              See it in action.
            </h2>

            <p className="mt-7 max-w-2xl font-['Plus_Jakarta_Sans'] text-lg leading-relaxed text-[#101A26]/80 sm:text-xl">
              Three ways in. One platform. Choose the starting point that speaks to you — each one is free and takes under 5 minutes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/onboarding-build"
                className="inline-flex items-center justify-center rounded-full bg-[#101A26] px-7 py-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-white hover:opacity-90"
              >
                Know your customer
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-[#101A26] bg-white/70 px-7 py-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26] hover:bg-white"
              >
                See how it works
              </a>
            </div>

            <p className="mt-6 font-['Plus_Jakarta_Sans'] text-xs text-muted-foreground">
              All three are free. No credit card required. 14-day trial unlocks the full platform.
            </p>

            <ul className="mt-9 flex flex-col gap-3 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                No credit card required
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                14-day free trial
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                Cancel anytime
              </li>
            </ul>
          </div>

          <div className="relative z-10 lg:col-span-2">
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(232,101,10,0.35) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />
            <div className="relative space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-['Plus_Jakarta_Sans'] text-lg font-bold text-primary-foreground">
                  M
                </div>
                <p className="font-['Fraunces'] text-xl font-bold leading-snug text-[#101A26] sm:text-2xl">
                  Generate a month of Instagram content for my coffee brand
                </p>
              </div>

              <div className="ml-0 rounded-xl bg-primary px-6 py-5 text-white shadow-lg sm:ml-8">
                <p className="font-['Fraunces'] text-4xl font-bold leading-none">+340%</p>
                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-medium text-white/90">
                  Engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Old way vs new way */}
      <section id="how-it-works" className="border-y border-border bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
          <div className="bg-[#F5F4F0] p-8 sm:p-10 lg:p-12">
            <p className="mb-4 inline-flex items-center rounded-full border border-[#101A26] bg-[#FBFAF0] px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]">
              The old way
            </p>
            <h2 className="max-w-lg font-['Fraunces'] text-3xl font-bold leading-tight text-[#101A26] sm:text-4xl">
              Paying for marketing that doesn't know your customer.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Agency fees of £3,000+ per month",
                "Generic content that sounds like everyone else",
                "No idea who your ideal customer is",
                "Tactics without a strategy or system",
                "Marketing that doesn't reflect the quality of your work",
              ].map((item) => (
                <li key={item} className="flex gap-3 font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/80">
                  <span className="mt-[2px] font-semibold text-muted-foreground">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary p-8 text-white sm:p-10 lg:p-12">
            <p className="mb-4 inline-flex items-center rounded-full border border-[#101A26] bg-[#E8F455] px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]">
              The marktr way
            </p>
            <h2 className="max-w-lg font-['Fraunces'] text-3xl font-bold leading-tight text-white sm:text-4xl">
              Marketing built on knowing exactly who you're talking to.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Start with your ideal customer profile — defined and stored",
                "Content generated in your voice, for your customer",
                "Brand story captured once, applied everywhere",
                "Full strategy before a single post is written",
                "Results measured against your real goals",
              ].map((item) => (
                <li key={item} className="flex gap-3 font-['Plus_Jakarta_Sans'] text-sm text-white/90">
                  <Check className="mt-[1px] h-4 w-4 shrink-0 text-white" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Accordion feature section */}
      <section className="border-t border-border bg-[#FBFAF0] px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="mb-10 font-['Fraunces'] text-4xl font-bold text-[#101A26] sm:text-5xl">
              Why founders choose marktr
            </h2>
            <ul className="space-y-1">
              {benefits.map((benefit) => {
                const isActive = activeBenefit === benefit.id;
                return (
                  <li key={benefit.id}>
                    <button
                      type="button"
                      onClick={() => setActiveBenefit(benefit.id)}
                      className={`w-full py-3 text-left transition-colors ${
                        isActive
                          ? "font-['Fraunces'] text-lg font-bold text-primary"
                          : "font-['Plus_Jakarta_Sans'] text-base text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {benefit.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={benefits[activeBenefit].screenshot}
                alt={`Product screenshot — ${benefits[activeBenefit].label}`}
                className="h-auto w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      <CaseStudies />

      {/* SECTION 7 — CTA band */}
      <section className="relative overflow-hidden bg-[#FBFAF0] px-6 py-20 text-center lg:py-28">
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
            className="mt-10 inline-flex items-center justify-center rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-10 py-4 font-['Plus_Jakarta_Sans'] text-lg font-medium text-[#0B0B0C] transition-opacity hover:bg-[#EBFD84]/90"
          >
            Get started - Free
          </Link>
        </div>
      </section>
    </main>
  );
}
