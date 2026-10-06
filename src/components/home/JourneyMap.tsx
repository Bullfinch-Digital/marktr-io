import { Link } from "react-router-dom";

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

const OUTPUTS = [
  {
    title: "Your strategy",
    body: "The platform turns that foundation into a plan: who you're talking to, the story you lead with, and where to show up.",
    // TODO: replace with final screenshot
    image: {
      id: "strategy",
      src: null,
      alt: "Placeholder for a marktr strategy",
      width: FRAME.width,
      height: FRAME.height,
      tone: "#A9B7DC",
    } satisfies JourneyImageSlot,
  },
  {
    title: "Your content",
    body: "Campaign ideas and ready-to-use posts, written for your customer in your voice.",
    // TODO: replace with final screenshot
    image: {
      id: "content",
      src: null,
      alt: "Placeholder for marktr content",
      width: FRAME.width,
      height: FRAME.height,
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
        ) : image.id === "content" ? (
          <ContentPlaceholder alt={image.alt} />
        ) : (
          <StrategyPlaceholder alt={image.alt} />
        )}
      </div>
    </div>
  );
}

function StrategyPlaceholder({ alt }: { alt: string }) {
  const aims = ["Who you're talking to", "The story you lead with", "Where to show up"];
  return (
    <div className="flex h-full flex-col p-6 text-left sm:p-8" role="img" aria-label={alt}>
      <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
        Strategy
      </p>
      <p className="mt-2 font-['Fraunces'] text-2xl font-bold text-[#101A26]">This quarter</p>
      <ul className="mt-6 space-y-3">
        {aims.map((aim) => (
          <li key={aim} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#E8F455]" />
            <span className="font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]">{aim}</span>
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
              <JourneyFigure image={step.image} />
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

        <div className="journey-step relative z-10 mx-auto my-10 max-w-md rounded-[24px] border-2 border-[#101A26] bg-white px-8 py-7 text-center shadow-lg">
          <p className="font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase tracking-[0.16em] text-[#101A26]/55">
            The three come together
          </p>
          <h3 className="mt-2 font-['Fraunces'] text-3xl font-bold text-[#101A26]">Your marketing foundation</h3>
          <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">
            Customer, story, and health score in one place.
          </p>
        </div>

        <div className="space-y-6 lg:space-y-4">
          {OUTPUTS.map((output, index) => (
            <article key={output.title} className="journey-step relative grid items-center gap-6 py-6 lg:grid-cols-2 lg:gap-20 lg:py-12">
              <span
                aria-hidden
                className="absolute -left-[42px] top-10 z-10 h-3 w-3 rounded-full border border-[#101A26] bg-[#E8F455] lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
              />
              <JourneyFigure image={output.image} />
              <div className={index % 2 === 1 ? "text-left lg:order-first" : "text-left"}>
                <h3 className="font-['Fraunces'] text-3xl font-bold text-[#101A26]">{output.title}</h3>
                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-sm leading-relaxed text-[#101A26]/80">{output.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="journey-step relative z-10 mx-auto mt-8 flex max-w-md flex-col items-center gap-4 bg-[#FBFAF0] py-6 text-center">
          <Link
            to="/health-check"
            className="inline-flex items-center justify-center rounded-full bg-[#101A26] px-8 py-3.5 font-['Plus_Jakarta_Sans'] text-base font-medium text-white hover:opacity-90"
          >
            Check your digital health — free
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
