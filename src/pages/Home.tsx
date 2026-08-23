import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Check, Users, Activity } from "lucide-react";

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

const GRID_TEXTURE_STYLE = {
  backgroundImage:
    "linear-gradient(to right, rgba(13,24,51,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,24,51,0.05) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
} as const;

const BRAND_STORY_TYPEWRITER =
  "For the homeowner who wants their property to last — MC Seamless Guttering is the specialist contractor that puts craft before cost.";

function HomeHealthBarsIllustration() {
  const [barsOn, setBarsOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarsOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const rows = [
    { label: "Website", pct: 68, delay: 0 },
    { label: "Content", pct: 45, delay: 150 },
    { label: "Audience", pct: 31, delay: 300 },
    { label: "Engagement", pct: 72, delay: 450 },
    { label: "Channels", pct: 55, delay: 600 },
  ] as const;
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-4 py-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="font-['DM_Sans'] text-[9px] text-[#0D1833]">{r.label}</div>
          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-[#0D1833]/60 transition-[width] duration-700 ease-out"
              style={{
                width: barsOn ? `${r.pct}%` : "0%",
                transitionDelay: `${r.delay}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HomeTypewriterStory() {
  const [text, setText] = useState("");
  useEffect(() => {
    let cancelled = false;
    const full = BRAND_STORY_TYPEWRITER;
    const charDelay = Math.max(10, Math.floor(4000 / full.length));
    const run = async () => {
      while (!cancelled) {
        for (let i = 0; i <= full.length; i++) {
          if (cancelled) return;
          setText(full.slice(0, i));
          await new Promise<void>((resolve) => setTimeout(resolve, charDelay));
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;
        setText("");
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="mx-4 mt-3 min-h-[80px] rounded-xl bg-white/60 p-4">
      <p className="font-['Fraunces'] text-sm italic leading-relaxed text-[#0D1833]">
        {text}
        <span className="home-typewriter-cursor font-['DM_Sans'] not-italic">|</span>
      </p>
    </div>
  );
}

export default function Home() {
  const [activeBenefit, setActiveBenefit] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="overflow-x-hidden">
      {/* SECTION 1 — Hero */}
      <section className="relative min-h-[100dvh] overflow-hidden bg-background">
        <div className="mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-5 lg:gap-12 lg:py-10">
          <div className="relative z-10 lg:col-span-3">
            <span className="mb-6 inline-flex items-center rounded-full border border-primary px-4 py-1.5 font-['DM_Sans'] text-xs font-medium uppercase tracking-[0.16em] text-primary">
              Your marketing team, built in
            </span>

            <h1 className="max-w-4xl font-['Fraunces'] text-5xl font-bold leading-[1.05] text-[#0D1833] sm:text-6xl lg:text-8xl">
              Marketing that knows your customer.
            </h1>

            <p className="mt-7 max-w-2xl font-['DM_Sans'] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Three ways in. One platform. Choose the starting point that speaks to you — each one is free and takes under 5 minutes.
            </p>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              <Link
                to="/onboarding-build"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--feature-amber)]">
                  <Users className="h-5 w-5 text-[#0D1833]" />
                </div>
                <div>
                  <p className="font-['Fraunces'] text-base font-bold leading-snug text-[#0D1833]">
                    Know your customer
                  </p>
                  <p className="mt-1 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
                    Generate your ideal customer profile — free
                  </p>
                </div>
                <span className="mt-auto font-['DM_Sans'] text-xs font-medium text-primary">
                  Start free →
                </span>
              </Link>

              <Link
                to="/health-check"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--feature-teal)]">
                  <Activity className="h-5 w-5 text-[#0D1833]" />
                </div>
                <div>
                  <p className="font-['Fraunces'] text-base font-bold leading-snug text-[#0D1833]">
                    Check your digital health
                  </p>
                  <p className="mt-1 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
                    Score your digital presence across 5 dimensions — free
                  </p>
                </div>
                <span className="mt-auto font-['DM_Sans'] text-xs font-medium text-primary">
                  Start free →
                </span>
              </Link>

              <Link
                to="/story"
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--feature-coral)]">
                  <BookOpen className="h-5 w-5 text-[#0D1833]" />
                </div>
                <div>
                  <p className="font-['Fraunces'] text-base font-bold leading-snug text-[#0D1833]">
                    Find your brand story
                  </p>
                  <p className="mt-1 font-['DM_Sans'] text-xs leading-relaxed text-muted-foreground">
                    Discover the story that makes your business impossible to ignore — free
                  </p>
                </div>
                <span className="mt-auto font-['DM_Sans'] text-xs font-medium text-primary">
                  Start free →
                </span>
              </Link>
            </div>

            <p className="mt-6 font-['DM_Sans'] text-xs text-muted-foreground">
              All three are free. No credit card required. 14-day trial unlocks the full platform.
            </p>

            <ul className="mt-9 flex flex-col gap-3 font-['DM_Sans'] text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-['DM_Sans'] text-lg font-bold text-primary-foreground">
                  M
                </div>
                <p className="font-['Fraunces'] text-xl font-bold leading-snug text-[#0D1833] sm:text-2xl">
                  Generate a month of Instagram content for my coffee brand
                </p>
              </div>

              <div className="ml-0 rounded-xl bg-primary px-6 py-5 text-white shadow-lg sm:ml-8">
                <p className="font-['Fraunces'] text-4xl font-bold leading-none">+340%</p>
                <p className="mt-1 font-['DM_Sans'] text-sm font-medium text-white/90">
                  Engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Social proof bar */}
      <section className="border-y border-border bg-white py-10">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="mb-6 font-['DM_Sans'] text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by ambitious founders
          </p>
          <p className="font-['DM_Sans'] text-sm uppercase tracking-widest text-muted-foreground">
            Apostle Coffee · British Log Cabins · The Green · McCartneys LLP · Continental Fireplaces
          </p>
        </div>
      </section>

      {/* SECTION 3 — Three module cards */}
      <section id="modules" className="bg-background px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mx-auto max-w-4xl font-['Fraunces'] text-4xl font-bold leading-tight text-[#0D1833] sm:text-5xl lg:text-6xl">
            Everything your marketing team does.
            <br className="hidden sm:block" />
            Built into one platform.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-3">
          {/* CARD 1 — Know your customer */}
          <Link
            to="/onboarding-build"
            className="group block cursor-pointer rounded-2xl bg-[var(--feature-amber)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className="relative h-[200px] overflow-hidden rounded-t-2xl bg-[#E8D4A0]/55"
              style={GRID_TEXTURE_STYLE}
            >
              <div className="flex h-full items-end justify-between gap-2 px-3 pb-5 pt-8 sm:px-5">
                <div
                  className="flex flex-col items-center"
                  style={{ animation: "float-1 3s ease-in-out infinite" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8650A] font-['DM_Sans'] text-xs font-bold text-white">
                    PR
                  </div>
                  <span className="mt-2 max-w-[92px] rounded-full bg-white px-2 py-0.5 text-center font-['DM_Sans'] text-[8px] font-medium leading-tight text-[#0D1833]">
                    Preventative Homeowner
                  </span>
                </div>
                <div
                  className="flex flex-col items-center pb-6"
                  style={{ animation: "float-2 4s ease-in-out infinite" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D7A5F] font-['DM_Sans'] text-xs font-bold text-white">
                    RE
                  </div>
                  <span className="mt-2 max-w-[92px] rounded-full bg-white px-2 py-0.5 text-center font-['DM_Sans'] text-[8px] font-medium leading-tight text-[#0D1833]">
                    Renovation Specialist
                  </span>
                </div>
                <div
                  className="flex flex-col items-center pt-4"
                  style={{ animation: "float-3 3.5s ease-in-out infinite" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D1833] font-['DM_Sans'] text-xs font-bold text-white">
                    LA
                  </div>
                  <span className="mt-2 max-w-[92px] rounded-full bg-white px-2 py-0.5 text-center font-['DM_Sans'] text-[8px] font-medium leading-tight text-[#0D1833]">
                    Landlord
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-['Fraunces'] text-xl font-bold text-[#0D1833]">Know your customer</h3>
              <p className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-[#0D1833]/85">
                Define your ideal customer profile once. Every piece of content is written for them, not everyone.
              </p>
              <ArrowRight className="mt-4 h-5 w-5 text-[#E8650A]" strokeWidth={2} />
            </div>
          </Link>

          {/* CARD 2 — Check your digital health */}
          <Link
            to="/health-check"
            className="group block cursor-pointer rounded-2xl bg-[var(--feature-teal)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className="relative h-[200px] overflow-hidden rounded-t-2xl bg-[#B8DDD4]/55"
              style={GRID_TEXTURE_STYLE}
            >
              <HomeHealthBarsIllustration />
            </div>
            <div className="p-6">
              <h3 className="font-['Fraunces'] text-xl font-bold text-[#0D1833]">Check your digital health</h3>
              <p className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-[#0D1833]/85">
                Score your digital presence across 5 dimensions — and see exactly where to focus.
              </p>
              <ArrowRight className="mt-4 h-5 w-5 text-[#E8650A]" strokeWidth={2} />
            </div>
          </Link>

          {/* CARD 3 — Find your brand story */}
          <Link
            to="/story"
            className="group block cursor-pointer rounded-2xl bg-[var(--feature-coral)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className="relative h-[200px] overflow-hidden rounded-t-2xl bg-[#E8D0C4]/55"
              style={GRID_TEXTURE_STYLE}
            >
              <div className="px-4 pt-4">
                <p className="font-['DM_Sans'] text-[9px] uppercase tracking-widest text-muted-foreground">
                  YOUR BRAND STORY
                </p>
                <HomeTypewriterStory />
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-['Fraunces'] text-xl font-bold text-[#0D1833]">Find your brand story</h3>
              <p className="mt-2 font-['DM_Sans'] text-sm leading-relaxed text-[#0D1833]/85">
                Discover the narrative that makes your business impossible to ignore — in minutes.
              </p>
              <ArrowRight className="mt-4 h-5 w-5 text-[#E8650A]" strokeWidth={2} />
            </div>
          </Link>
        </div>
      </section>

      {/* SECTION 4 — Old way vs new way */}
      <section className="border-y border-border bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-2">
          <div className="bg-[#F5F4F0] p-8 sm:p-10 lg:p-12">
            <p className="mb-4 font-['DM_Sans'] text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              The old way
            </p>
            <h2 className="max-w-lg font-['Fraunces'] text-3xl font-bold leading-tight text-[#0D1833] sm:text-4xl">
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
                <li key={item} className="flex gap-3 font-['DM_Sans'] text-sm text-[#0D1833]/80">
                  <span className="mt-[2px] font-semibold text-muted-foreground">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary p-8 text-white sm:p-10 lg:p-12">
            <p className="mb-4 font-['DM_Sans'] text-xs font-medium uppercase tracking-[0.18em] text-white/70">
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
                <li key={item} className="flex gap-3 font-['DM_Sans'] text-sm text-white/90">
                  <Check className="mt-[1px] h-4 w-4 shrink-0 text-white" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Accordion feature section */}
      <section className="border-t border-border bg-background px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="mb-10 font-['Fraunces'] text-4xl font-bold text-[#0D1833] sm:text-5xl">
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
                          : "font-['DM_Sans'] text-base text-muted-foreground hover:text-foreground"
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
            {benefits[activeBenefit].screenshot ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <img
                  src={benefits[activeBenefit].screenshot}
                  alt={`Product screenshot — ${benefits[activeBenefit].label}`}
                  className="h-auto w-full object-cover object-top"
                />
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-muted px-6 py-12 text-center">
                <p className="font-['DM_Sans'] text-lg text-muted-foreground">
                  Product screenshot — {benefits[activeBenefit].label}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Proof mosaic */}
      <section className="bg-background px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="font-['Fraunces'] text-4xl font-bold text-[#0D1833] sm:text-5xl">
            Proven results, real founders
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <div className="rounded-2xl bg-[#D4EDE8] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#0D1833]">17,000</p>
            <p className="mt-2 font-['DM_Sans'] text-sm text-[#0D1833]/80">
              Instagram views from the right audience
            </p>
            <p className="mt-6 font-['DM_Sans'] text-xs font-semibold uppercase tracking-widest text-[#0D1833]/60">
              British Log Cabins
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
            <p className="font-['Fraunces'] text-lg font-medium leading-relaxed text-[#0D1833]">
              &ldquo;marktr helped us tell the story we'd been struggling to articulate for years.&rdquo;
            </p>
            <p className="mt-6 font-['DM_Sans'] text-sm text-muted-foreground">— The Green Caravan Park</p>
          </div>

          <div className="rounded-2xl bg-[#FDF0CC] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#0D1833]">£10,000</p>
            <p className="mt-2 font-['DM_Sans'] text-sm text-[#0D1833]/80">
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
            <p className="font-['DM_Sans'] text-sm text-[#0D1833]">
              Apostle Coffee — built from zero to award-winning
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAE8E0] p-8 text-left">
            <p className="font-['Fraunces'] text-5xl font-bold text-[#0D1833]">6 months</p>
            <p className="mt-2 font-['DM_Sans'] text-sm text-[#0D1833]/80">
              from outdated brand to full digital presence
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
            <p className="font-['Fraunces'] text-lg font-medium leading-relaxed text-[#0D1833]">
              &ldquo;The strategy was there — we just needed someone to find it.&rdquo;
            </p>
            <p className="mt-6 font-['DM_Sans'] text-sm text-muted-foreground">— McCartneys LLP</p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — CTA band */}
      <section className="bg-[#0D1833] px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-['Fraunces'] text-4xl font-bold text-white sm:text-5xl">
            Your marketing team is ready.
          </h2>
          <p className="mt-4 font-['DM_Sans'] text-lg text-white/70">
            Know your customer. Shape your story. Check your digital health. All free. No agency required.
          </p>
          <Link
            to="/onboarding-build"
            className="mt-10 inline-flex items-center justify-center rounded-full bg-primary px-10 py-4 font-['DM_Sans'] text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </section>
    </main>
  );
}
