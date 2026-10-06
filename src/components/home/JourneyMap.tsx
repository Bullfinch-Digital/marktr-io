import { Link } from "react-router-dom";
import { MARKTR_TRIAL_DAYS } from "@/lib/marktrPricing";

/** Same phrase as the pricing table ("Marktr Pro — 14-day free trial") and the paywall ("Start your 14-day free trial now."). */
const TRIAL_LABEL = `${MARKTR_TRIAL_DAYS}-day free trial`;

/**
 * Every journey image is one entry here. The frame is always 4:3
 * (1600×1200). Swap `src` for the final file; `null` shows the placeholder panel.
 */
type JourneyImageSlot = {
  id: string;
  src: string | null;
  alt: string;
  width: number;
  height: number;
  tone: string;
};

const FRAME = { width: 1600, height: 1200 } as const;

const STEPS = [
  {
    step: "01",
    title: "Check your digital health",
    youDo: "Enter your website and socials. It takes about two minutes.",
    youGet: "A score across 5 dimensions, and a clear place to focus.",
    tags: ["~2 mins", "Free"],
    href: "/health-check",
    linkLabel: "Check your digital health",
    // TODO: replace with final screenshot
    image: {
      id: "health",
      src: "/images/graphics/replace-your-agency.png",
      alt: "Digital health scores in marktr",
      width: FRAME.width,
      height: FRAME.height,
      tone: "#EC9F95",
    } satisfies JourneyImageSlot,
  },
  {
    step: "02",
    title: "Find your brand story",
    youDo: "Answer a few questions about what you do and why it matters.",
    youGet: "A clear narrative you can reuse everywhere.",
    tags: ["A few minutes", "Free"],
    href: "/story",
    linkLabel: "Find your brand story",
    // TODO: replace with final screenshot
    image: {
      id: "story",
      src: "/images/graphics/generate-content-in-your-voice.png",
      alt: "Brand story questions in marktr",
      width: FRAME.width,
      height: FRAME.height,
      tone: "#E8F455",
    } satisfies JourneyImageSlot,
  },
  {
    step: "03",
    title: "Know your customer",
    youDo: "Describe who you sell to.",
    youGet: "Ideal customer profiles with enough detail that content isn't written for everyone.",
    tags: ["A few minutes", "Free"],
    href: "/onboarding-build",
    linkLabel: "Build your ideal customer profile",
    // TODO: replace with final screenshot
    image: {
      id: "customer",
      src: "/images/graphics/start-with-your-ideal-customer.png",
      alt: "Ideal customer profiles in marktr",
      width: FRAME.width,
      height: FRAME.height,
      tone: "#A9B7DC",
    } satisfies JourneyImageSlot,
  },
] as const;

/** Dashboard tiles. Frame is 16:10 (1280×800). Swap `src` for the final screenshot. */
const TILE_FRAME = { width: 1280, height: 800 } as const;

const DASHBOARD_TILES = [
  {
    title: "Know where you stand",
    body: "Your health score, tracked and improving.",
    badge: "Included",
    trial: false,
    chip: "See your score →",
    // TODO: replace with final screenshot
    image: {
      id: "dashboard-health",
      src: null,
      alt: "Placeholder for the health score on the marktr dashboard",
      width: TILE_FRAME.width,
      height: TILE_FRAME.height,
      tone: "#EC9F95",
    } satisfies JourneyImageSlot,
  },
  {
    title: "Speak to your audience",
    body: "Unlock a strategy built around who you sell to and the story you lead with.",
    badge: TRIAL_LABEL,
    trial: true,
    chip: `Start your ${TRIAL_LABEL} to unlock →`,
    // TODO: replace with final screenshot
    image: {
      id: "dashboard-strategy",
      src: null,
      alt: "Placeholder for strategy on the marktr dashboard",
      width: TILE_FRAME.width,
      height: TILE_FRAME.height,
      tone: "#A9B7DC",
    } satisfies JourneyImageSlot,
  },
  {
    title: "Create content that converts",
    body: "Turn that strategy into ready-to-use posts and campaign ideas, written for your customer, in your voice.",
    badge: TRIAL_LABEL,
    trial: true,
    chip: `Start your ${TRIAL_LABEL} to unlock →`,
    // TODO: replace with final screenshot
    image: {
      id: "dashboard-content",
      src: null,
      alt: "Placeholder for content on the marktr dashboard",
      width: TILE_FRAME.width,
      height: TILE_FRAME.height,
      tone: "#E8F455",
    } satisfies JourneyImageSlot,
  },
] as const;

function JourneyFigure({ image }: { image: JourneyImageSlot }) {
  return (
    <div className="overflow-hidden rounded-[24px] p-3" style={{ backgroundColor: image.tone }}>
      <div className="overflow-hidden rounded-[18px] bg-[#FBFAF0]" style={{ aspectRatio: "4 / 3" }}>
        {image.src ? (
          <img
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top"
          />
        ) : image.id === "dashboard-content" ? (
          <ContentPlaceholder alt={image.alt} />
        ) : image.id === "dashboard-health" ? (
          <HealthScorePlaceholder alt={image.alt} />
        ) : (
          <StrategyPlaceholder alt={image.alt} />
        )}
      </div>
    </div>
  );
}

function HealthScorePlaceholder({ alt }: { alt: string }) {
  const bars = [
    { label: "Website", width: "90%" },
    { label: "Story", width: "80%" },
    { label: "Content", width: "70%" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4 text-left" role="img" aria-label={alt}>
      <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
        Health score
      </p>
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="mb-1 flex justify-between font-['Plus_Jakarta_Sans'] text-[11px] text-[#101A26]/70">
            <span>{bar.label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#101A26]" style={{ width: bar.width }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StrategyPlaceholder({ alt }: { alt: string }) {
  const aims = ["Who you're talking to", "The story you lead with", "Where to show up"];
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4 text-left" role="img" aria-label={alt}>
      <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
        Strategy
      </p>
      <ul className="space-y-1.5">
        {aims.map((aim) => (
          <li key={aim} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#E8F455]" />
            <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#101A26]">{aim}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentPlaceholder({ alt }: { alt: string }) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 p-4 text-left sm:p-6" role="img" aria-label={alt}>
      {["Post", "Campaign"].map((label) => (
        <div key={label} className="flex flex-col justify-between rounded-2xl bg-white p-4">
          <div>
            <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
              {label}
            </p>
            <div className="mt-3 space-y-2">
              <div className="h-2.5 w-4/5 rounded-full bg-[#101A26]/15" />
              <div className="h-2.5 w-full rounded-full bg-[#101A26]/10" />
              <div className="h-2.5 w-2/3 rounded-full bg-[#101A26]/10" />
            </div>
          </div>
          <span className="mt-4 inline-flex w-fit rounded-full bg-[#E8F455] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#101A26]">
            In your voice
          </span>
        </div>
      ))}
    </div>
  );
}

function StepBadge({ step }: { step: string }) {
  return (
    <span className="absolute -left-14 top-8 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#101A26] bg-[#FBFAF0] font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26] lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
      {step}
    </span>
  );
}

export default function JourneyMap() {
  return (
    <section id="journey" className="bg-[#FBFAF0] px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <p className="inline-flex items-center rounded-full border border-[#101A26] bg-[#E8F455] px-4 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]">
          How it works
        </p>
        <h2 className="mx-auto mt-5 max-w-3xl font-['Fraunces'] text-4xl font-bold leading-tight text-[#101A26] sm:text-5xl">
          From first question to a month of content.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-['Plus_Jakarta_Sans'] text-base text-[#101A26]/75">
          Three starting points. One strategy. Content that sounds like you.
        </p>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl pl-14 lg:pl-0">
        <div className="journey-rail" aria-hidden />

        <div className="space-y-6 lg:space-y-4">
          {STEPS.map((step, index) => (
            <article key={step.step} className="journey-step relative grid items-center gap-6 py-6 lg:grid-cols-2 lg:gap-20 lg:py-12">
              <StepBadge step={step.step} />
              <Link
                to={step.href}
                aria-label={step.linkLabel}
                className="block rounded-[24px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101A26]"
              >
                <JourneyFigure image={step.image} />
              </Link>
              <div className={index % 2 === 1 ? "text-left lg:order-first" : "text-left"}>
                <h3 className="font-['Fraunces'] text-3xl font-bold text-[#101A26]">{step.title}</h3>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
                      You do
                    </dt>
                    <dd className="mt-1 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">{step.youDo}</dd>
                  </div>
                  <div>
                    <dt className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
                      You get
                    </dt>
                    <dd className="mt-1 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">{step.youGet}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  {step.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#101A26] bg-[#E8F455] px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium text-[#101A26]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  to={step.href}
                  className="mt-5 inline-flex items-center font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26] underline-offset-4 hover:underline"
                >
                  {step.linkLabel} →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="journey-step relative z-10 mt-2 max-w-md font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70 lg:mx-auto lg:mt-4 lg:text-center">
          These three can be done in any order.
        </p>

        <div className="journey-step relative z-10 mx-auto my-12 max-w-5xl">
          <span
            aria-hidden
            className="absolute -left-[42px] top-8 z-10 h-3 w-3 rounded-full border border-[#101A26] bg-[#E8F455] lg:left-1/2 lg:top-0 lg:-translate-x-1/2 lg:-translate-y-1/2"
          />
          <div className="overflow-hidden rounded-[28px] border border-[#101A26]/15 bg-white shadow-[0_24px_60px_rgb(16_26_38_/_0.12)]">
            <div className="flex items-center gap-2 border-b border-[#101A26]/10 bg-[#FBFAF0] px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EC9F95]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E8F455]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#A9B7DC]" />
              <span className="ml-2 font-['Plus_Jakarta_Sans'] text-xs text-[#101A26]/55">Your dashboard</span>
            </div>
            <div
              className="px-5 py-8 sm:px-8 sm:py-10"
              style={{
                background:
                  "radial-gradient(50% 80% at 100% 0%, rgba(230, 240, 62, 0.55), transparent 70%), radial-gradient(60% 80% at 0% 100%, rgba(227, 156, 149, 0.45), transparent 70%), linear-gradient(160deg, rgb(167, 180, 223), rgb(251, 250, 240))",
              }}
            >
              <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/70">
                Unlock your dashboard
              </p>
              <h3 className="mt-2 max-w-xl font-['Fraunces'] text-3xl font-bold text-[#101A26] sm:text-4xl">
                Your marketing hub, unlocked.
              </h3>
              <p className="mt-3 max-w-2xl font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80 sm:text-base">
                Finish your steps and your dashboard opens: your customers, your story and your health score, all in one place.
              </p>

              <div className="relative mt-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-6 right-6 top-5 hidden border-t border-dashed border-[#101A26]/40 lg:block"
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  {DASHBOARD_TILES.map((tile) => (
                    <article key={tile.title} className="journey-step relative flex flex-col overflow-hidden rounded-[20px] border border-[#101A26]/10 bg-white shadow-sm">
                      <div className="overflow-hidden" style={{ backgroundColor: tile.image.tone, aspectRatio: "16 / 10" }}>
                        {tile.image.src ? (
                          <img
                            src={tile.image.src}
                            alt={tile.image.alt}
                            width={tile.image.width}
                            height={tile.image.height}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-top"
                          />
                        ) : tile.image.id === "dashboard-content" ? (
                          <ContentPlaceholder alt={tile.image.alt} />
                        ) : tile.image.id === "dashboard-health" ? (
                          <HealthScorePlaceholder alt={tile.image.alt} />
                        ) : (
                          <StrategyPlaceholder alt={tile.image.alt} />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5 text-left">
                        <span
                          className={
                            tile.trial
                              ? "inline-flex w-fit rounded-full bg-[#E8F455] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#101A26]"
                              : "inline-flex w-fit rounded-full border border-[#101A26]/20 bg-[#FBFAF0] px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#101A26]"
                          }
                        >
                          {tile.badge}
                        </span>
                        <h4 className="mt-3 font-['Fraunces'] text-xl font-bold text-[#101A26]">{tile.title}</h4>
                        <p className="mt-2 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">{tile.body}</p>
                        <span className="mt-4 inline-flex w-fit max-w-full rounded-full bg-[#E8F455] px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium leading-snug text-[#101A26]">
                          {tile.chip}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <p className="mt-6 text-center font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/75">
                Your dashboard is free. Start a {TRIAL_LABEL} to unlock strategy and content.
              </p>
            </div>
          </div>
        </div>

        <div className="journey-step relative z-10 mx-auto mt-4 flex max-w-md flex-col items-center gap-4 bg-[#FBFAF0] py-6 text-center">
          <Link
            to="/health-check"
            className="inline-flex items-center justify-center rounded-full bg-[#101A26] px-8 py-3.5 font-['Plus_Jakarta_Sans'] text-base font-medium text-white hover:opacity-90"
          >
            Start with your digital health check — free
          </Link>
          <Link
            to="/pricing"
            className="font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26] underline-offset-4 hover:underline"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
