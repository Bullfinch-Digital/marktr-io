import { useEffect, type RefObject } from "react";

const TIP_RATIO = 0.65;
const WELL_PAST_PX = 80;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function lineTipY(viewportHeight: number) {
  return window.scrollY + viewportHeight * TIP_RATIO;
}

/**
 * Draws the journey rail from the top as the visitor scrolls, and reveals
 * marked items once (when the line tip reaches them). Content stays visible
 * until this hook confirms it can animate.
 */
export function useJourneyScroll(
  sectionRef: RefObject<HTMLElement | null>,
  railRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!section || !rail) return;
    if (prefersReducedMotion()) return;

    const items = Array.from(section.querySelectorAll<HTMLElement>("[data-journey-reveal]"));
    const revealed = new Set<HTMLElement>();
    const itemTops = new Map<HTMLElement, number>();
    let railTop = 0;
    let railHeight = 1;
    let viewportHeight = window.innerHeight;
    let ticking = false;

    const triggerTop = (el: HTMLElement) => {
      const grouped =
        el.dataset.journeyReveal === "badge" ||
        el.dataset.journeyReveal === "copy" ||
        el.dataset.journeyReveal === "figure"
          ? el.closest("article")
          : null;
      const box = (grouped ?? el).getBoundingClientRect();
      return box.top + window.scrollY;
    };

    const measure = () => {
      viewportHeight = window.innerHeight;
      const railBox = rail.getBoundingClientRect();
      railTop = railBox.top + window.scrollY;
      railHeight = Math.max(rail.offsetHeight, 1);
      items.forEach((el) => {
        itemTops.set(el, triggerTop(el));
      });
    };

    const applyLine = (tip: number) => {
      const drawn = Math.min(Math.max(tip - railTop, 0), railHeight);
      rail.style.setProperty("--journey-draw", String(drawn / railHeight));
    };

    const tiles = items.filter((el) => el.dataset.journeyReveal === "tile");

    const reveal = (el: HTMLElement, instant: boolean) => {
      if (revealed.has(el)) return;
      revealed.add(el);
      el.setAttribute("data-in", instant ? "instant" : "");
      if (el.dataset.journeyReveal === "hub") {
        tiles.forEach((tile) => reveal(tile, instant));
      }
    };

    const revealPassed = (tip: number, firstPass: boolean) => {
      items.forEach((el) => {
        if (el.dataset.journeyReveal === "tile") return;
        const top = itemTops.get(el);
        if (top === undefined || top > tip) return;
        reveal(el, firstPass || top < tip - WELL_PAST_PX);
      });
    };

    const frame = (firstPass: boolean) => {
      const tip = lineTipY(viewportHeight);
      applyLine(tip);
      revealPassed(tip, firstPass);
    };

    measure();
    frame(true);
    section.setAttribute("data-journey-ready", "");

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        frame(false);
        ticking = false;
      });
    };

    const onResize = () => {
      measure();
      frame(false);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const tip = lineTipY(viewportHeight);
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          if (el.dataset.journeyReveal === "tile") return;
          const top = itemTops.get(el);
          if (top === undefined) return;
          if (top <= tip) reveal(el, false);
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -30% 0px" }
    );

    items.forEach((el) => observer.observe(el));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      section.removeAttribute("data-journey-ready");
      rail.style.removeProperty("--journey-draw");
    };
  }, [sectionRef, railRef]);
}
