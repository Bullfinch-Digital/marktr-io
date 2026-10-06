import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import JourneyMap from "@/components/home/JourneyMap";

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
    eyebrow: "Check your digital health",
    title: "See where you stand",
    description:
      "Score your digital presence across 5 dimensions — and see exactly where to focus.",
    image: "/images/graphics/replace-your-agency.png",
    imageAlt: "Digital health scores in marktr",
    tags: ["Five scores", "Free"],
    recommended: true,
    cta: "Check your digital health",
  },
  {
    step: "02",
    href: "/story",
    eyebrow: "Find your brand story",
    title: "Say what makes you different",
    description:
      "Discover the narrative that makes your business impossible to ignore — in minutes.",
    image: "/images/graphics/generate-content-in-your-voice.png",
    imageAlt: "Brand story questions in marktr",
    tags: ["Brand story", "Free"],
    recommended: false,
    cta: "Find your brand story",
  },
  {
    step: "03",
    href: "/onboarding-build",
    eyebrow: "Know your customer",
    title: "Start with who you sell to",
    description:
      "Define your ideal customer profile once. Every piece of content is written for them, not everyone.",
    image: "/images/graphics/start-with-your-ideal-customer.png",
    imageAlt: "Ideal customer profiles in marktr",
    tags: ["Ideal customer", "Free"],
    recommended: false,
    cta: "Build your ideal customer profile",
  },
] as const;

export default function Home() {
  const [activeBenefit, setActiveBenefit] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="overflow-x-hidden bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-[#101A26]">
      {/* SECTION 1 — Three ways in */}
      <section id="ways-in" className="bg-[#FBFAF0] px-6 pb-16 pt-8 lg:pb-20 lg:pt-12">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="mx-auto max-w-4xl font-['Fraunces'] text-4xl font-bold leading-tight text-[#101A26] sm:text-5xl">
            Everything your marketing team does.
            <br />
            Built into one platform.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-['Plus_Jakarta_Sans'] text-base text-[#101A26]/75">
            Start in any order. Most people begin by seeing where they stand.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-6xl">
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
                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#101A26] bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]">
                    {way.step}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6 text-left">
                  {way.recommended ? (
                    <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.14em] text-[#101A26]/70">
                      Recommended starting point
                    </p>
                  ) : null}
                  <p className="mt-2 font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
                    {way.eyebrow}
                  </p>
                  <h3 className="mt-2 font-['Fraunces'] text-2xl font-bold text-[#101A26]">{way.title}</h3>
                  <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">
                    {way.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {way.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#101A26] bg-[#E8F455] px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span
                    className={
                      way.recommended
                        ? "ways-in-cta mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#101A26] px-7 py-3.5 font-['Plus_Jakarta_Sans'] text-base font-medium text-white"
                        : "ways-in-cta mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#101A26] bg-white px-7 py-3 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]"
                    }
                  >
                    {way.cta} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Social proof bar */}
      <section className="border-y border-border bg-white py-10">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="mb-6 inline-flex items-center rounded-full border border-[#101A26] bg-[#FBFAF0] px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]">
            Trusted by ambitious founders
          </p>
          <p className="font-['Plus_Jakarta_Sans'] text-sm uppercase tracking-widest text-muted-foreground">
            Apostle Coffee · British Log Cabins · The Green · McCartneys LLP · Continental Fireplaces
          </p>
        </div>
      </section>

      <JourneyMap />

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
            <h2 className="flex max-w-4xl flex-col items-start gap-3">
              <span className="inline-block rounded-full bg-[#E8F455] px-5 py-2 font-['Fraunces'] text-4xl font-bold leading-none text-[#101A26] sm:px-7 sm:py-3 sm:text-5xl lg:text-6xl">
                Marketing that
              </span>
              <span className="inline-block rounded-full bg-[#E8F455] px-5 py-2 font-['Fraunces'] text-4xl font-bold leading-none text-[#101A26] sm:px-7 sm:py-3 sm:text-5xl lg:text-6xl">
                knows your customer.
              </span>
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

      {/* SECTION 6 — Proof mosaic */}
      <section className="bg-[#FBFAF0] px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="font-['Fraunces'] text-4xl font-bold text-[#101A26] sm:text-5xl">
            Proven results, real founders
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <div className="rounded-2xl bg-[#D4EDE8] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#101A26]">17,000</p>
            <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/80">
              Instagram views from the right audience
            </p>
            <p className="mt-6 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-widest text-[#101A26]/60">
              British Log Cabins
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
            <p className="font-['Fraunces'] text-lg font-medium leading-relaxed text-[#101A26]">
              &ldquo;marktr helped us tell the story we'd been struggling to articulate for years.&rdquo;
            </p>
            <p className="mt-6 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">— The Green Caravan Park</p>
          </div>

          <div className="rounded-2xl bg-[#FDF0CC] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#101A26]">£10,000</p>
            <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/80">
              online course sold from organic content
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
            <div className="mb-4 aspect-[3/4] max-h-40 w-full overflow-hidden rounded-lg bg-muted">
              <img
                src="/images/graphics/apostle-coffee-cups.png"
                alt="Apostle Coffee cups"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]">
              Apostle Coffee — built from zero to award-winning
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAE8E0] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#101A26]">6 months</p>
            <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/80">
              from outdated brand to full digital presence
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
            <p className="font-['Fraunces'] text-lg font-medium leading-relaxed text-[#101A26]">
              &ldquo;The strategy was there — we just needed someone to find it.&rdquo;
            </p>
            <p className="mt-6 font-['Plus_Jakarta_Sans'] text-sm text-muted-foreground">— McCartneys LLP</p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — CTA band */}
      <section className="relative overflow-hidden bg-[#101A26] px-6 py-20 text-center lg:py-28">
        <img
          src="/brand/Bullfinch_Icons_21.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-8 top-8 hidden w-52 opacity-90 md:block lg:w-64"
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <h2 className="font-['Fraunces'] text-4xl font-bold text-white sm:text-5xl">
            Your marketing team is ready.
          </h2>
          <p className="mt-4 font-['Plus_Jakarta_Sans'] text-lg text-white/70">
            Know your customer. Shape your story. Check your digital health. All free. No agency required.
          </p>
          <Link
            to="/onboarding-build"
            className="mt-10 inline-flex items-center justify-center rounded-full bg-primary px-10 py-4 font-['Plus_Jakarta_Sans'] text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </section>
    </main>
  );
}
