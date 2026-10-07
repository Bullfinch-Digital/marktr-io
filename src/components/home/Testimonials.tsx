import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  TESTIMONIALS,
  isQuoteTestimonial,
  isVideoTestimonial,
  type QuoteTestimonial,
  type VideoTestimonial,
} from "@/data/testimonials";
import { track } from "@/lib/analytics";

const TEMPLATE_POSTERS: Record<string, string> = {
  "charlotte-sla-school": "/images/testimonials/charlotte.svg",
  "martyn-british-log-cabins": "/images/testimonials/martyn.svg",
  "rachel-the-green": "/images/testimonials/rachel.svg",
};

const POSTER_WIDTH = 540;
const POSTER_HEIGHT = 960;

function trackTestimonialPlay(testimonial: VideoTestimonial): void {
  track("testimonial_video_play", {
    testimonial_id: testimonial.id,
    business: testimonial.business,
  });
}

function posterSource(testimonial: VideoTestimonial): string | undefined {
  return testimonial.posterSrc ?? TEMPLATE_POSTERS[testimonial.id];
}

function PlayIcon() {
  return (
    <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84]">
      <svg viewBox="0 0 12 14" className="ml-0.5 h-4 w-4" aria-hidden>
        <path d="M1 1.2v11.6L11 7 1 1.2z" fill="#101A26" />
      </svg>
    </span>
  );
}

function TestimonialModal({
  testimonial,
  videoHolder,
  onClose,
}: {
  testimonial: VideoTestimonial;
  videoHolder: { el: HTMLVideoElement | null };
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button, video, a[href]")].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#101A26]/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-[min(calc(90vh*9/16),90vw)] flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="sr-only">
          {testimonial.name} testimonial
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-0 rounded-full bg-[#FBFAF0] px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#101A26]"
        >
          Close
        </button>
        <div className="overflow-hidden rounded-[24px] bg-black" style={{ aspectRatio: "9 / 16" }}>
          {/* TODO: if videoSrc ends in .m3u8, lazy-load hls.js and attach it instead of setting src. */}
          <video
            ref={(node) => {
              videoHolder.el = node;
            }}
            src={testimonial.videoSrc}
            className="h-full w-full bg-black object-contain"
            playsInline
            controls
            controlsList="nodownload"
            preload="metadata"
            autoPlay
          >
            {testimonial.videoCaptionsSrc ? (
              <track kind="captions" src={testimonial.videoCaptionsSrc} srcLang="en" label="English" default />
            ) : null}
          </video>
        </div>
      </div>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <p className="mb-3 font-['Plus_Jakarta_Sans'] text-sm tracking-widest text-[#101A26]" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden>
          {index < rating ? "★" : "☆"}
        </span>
      ))}
    </p>
  );
}

function QuoteCard({ quote, tabbable = false }: { quote: QuoteTestimonial; tabbable?: boolean }) {
  return (
    <li className="quote-card w-[min(78vw,320px)] shrink-0 rounded-[24px] border border-[#101A26]/10 bg-white text-left shadow-sm">
      <div
        tabIndex={tabbable ? 0 : undefined}
        className="h-full px-5 py-5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101A26]"
      >
      <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#101A26]">
        {quote.name} | {quote.business}
      </p>
      {typeof quote.rating === "number" ? <div className="mt-3"><StarRow rating={quote.rating} /></div> : null}
      <p
        className={`mt-3 font-['Plus_Jakarta_Sans'] text-lg leading-relaxed sm:text-base ${
          quote.isPlaceholder ? "text-[#101A26]/55" : "text-[#101A26]/80"
        }`}
      >{`“${quote.quote}”`}</p>
      </div>
    </li>
  );
}

export function QuoteStrip() {
  const quotes = TESTIMONIALS.filter(isQuoteTestimonial);
  const [paused, setPaused] = useState(false);

  return (
    <section data-track-section="quotes" className="quote-strip overflow-hidden bg-[#FBFAF0] pb-4 pt-16 lg:pt-20" data-paused={paused ? "true" : "false"}>
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-6">
        <div>
          <h2 className="font-['Fraunces'] text-3xl font-bold leading-tight text-[#101A26] sm:text-4xl">
            Don&apos;t just take our word for it.
          </h2>
          <p className="mt-3 font-['Plus_Jakarta_Sans'] text-base text-[#101A26]/75">
            What founders say after their first week.
          </p>
        </div>
        <button
          type="button"
          className="quote-marquee-pause shrink-0 rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-[#0B0B0C]"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? "Play" : "Pause"}
        </button>
      </div>
      <div className="quote-marquee mt-8">
        <div className="quote-marquee-track">
          <ul className="list-none">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} tabbable />
            ))}
          </ul>
          <ul
            className="quote-marquee-clone list-none"
            aria-hidden="true"
            ref={(node) => {
              if (node) node.inert = true;
            }}
          >
            {quotes.map((quote) => (
              <QuoteCard key={`${quote.id}-clone`} quote={quote} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Testimonials() {
  const videos = TESTIMONIALS.filter(isVideoTestimonial);
  const [active, setActive] = useState<VideoTestimonial | null>(null);
  const videoHolder = useRef({ el: null as HTMLVideoElement | null }).current;
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    const video = videoHolder.el;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    const trigger = triggerRef.current;
    setActive(null);
    trigger?.focus();
  };

  const open = (testimonial: VideoTestimonial, trigger: HTMLButtonElement) => {
    if (!testimonial.videoSrc) return;
    triggerRef.current = trigger;
    flushSync(() => setActive(testimonial));
    void videoHolder.el?.play()?.catch(() => {});
    trackTestimonialPlay(testimonial);
  };

  return (
    <section id="testimonials" data-track-section="testimonials" className="bg-[#FBFAF0] pt-4 pb-16 lg:pt-6 lg:pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="inline-flex rounded-full border-2 border-[#0B0B0C] bg-[#EBFD84] px-3 py-1 font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#0B0B0C]">
          In their words
        </p>
        <h2 className="mt-4 max-w-2xl font-['Fraunces'] text-4xl font-bold leading-tight text-[#101A26] sm:text-5xl">
          Hear it from the business owners we support.
        </h2>
        <p className="mt-4 max-w-2xl font-['Plus_Jakarta_Sans'] text-base text-[#101A26]/75">
          Meet the founders and teams behind some of the brands we support — tap to watch.
        </p>

        <div className="testimonial-row mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {/* Stat cards (kind: "stat") stay out of this grid until a confirmed figure exists. */}
          {videos.map((testimonial) => {
            const still = posterSource(testimonial);
            return (
              <article key={testimonial.id} className="testimonial-card w-[80%] shrink-0 snap-start lg:w-auto">
                <div
                  className={`flex h-full flex-col overflow-hidden rounded-[24px] border-2 bg-white shadow-sm ${
                    testimonial.featured ? "border-[#101A26]" : "border-[#101A26]/10"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Play ${testimonial.name} testimonial`}
                    onClick={(event) => open(testimonial, event.currentTarget)}
                    className={`relative block w-full overflow-hidden bg-[#A9B7DC] text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101A26] ${
                      testimonial.videoSrc ? "cursor-pointer" : "cursor-default"
                    }`}
                    style={{ aspectRatio: "9 / 16" }}
                  >
                    {still ? (
                      <img
                        src={still}
                        alt=""
                        width={POSTER_WIDTH}
                        height={POSTER_HEIGHT}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    {!testimonial.posterSrc ? (
                      <span className="absolute left-3 top-3 rounded-full bg-[#FBFAF0]/90 px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#101A26]">
                        Video placeholder · 9:16
                      </span>
                    ) : null}
                    <PlayIcon />
                  </button>
                  <div className="flex flex-1 flex-col p-5 text-left">
                    {testimonial.outcome ? (
                      <p className="font-['Fraunces'] text-base font-bold text-[#101A26]">{testimonial.outcome}</p>
                    ) : null}
                    <blockquote
                      className={`font-['Fraunces'] text-lg leading-snug sm:text-xl ${
                        testimonial.isPlaceholder ? "text-[#101A26]/45" : "text-[#101A26]"
                      } ${testimonial.outcome ? "mt-3" : ""}`}
                    >
                      {testimonial.quote}
                    </blockquote>
                    <p className="mt-4 font-['Plus_Jakarta_Sans'] text-sm text-[#101A26]/70">
                      <span className="font-['Fraunces'] text-base font-bold text-[#101A26]">{testimonial.name}</span>
                      <span aria-hidden> · </span>
                      {testimonial.businessUrl ? (
                        <a
                          href={testimonial.businessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-4 hover:underline"
                        >
                          {testimonial.business}
                        </a>
                      ) : (
                        <span>{testimonial.business}</span>
                      )}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {active?.videoSrc ? (
        <TestimonialModal testimonial={active} videoHolder={videoHolder} onClose={close} />
      ) : null}
    </section>
  );
}
