/** Location state set only when ICP onboarding has just finished. */
export const ONBOARDING_ICP_ARRIVAL_KEY = "fromOnboardingIcp";

const HIGHLIGHT_MS = 2000;

export function isOnboardingIcpArrival(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  return (state as Record<string, unknown>)[ONBOARDING_ICP_ARRIVAL_KEY] === true;
}

export function withOnboardingIcpArrival<T extends Record<string, unknown>>(
  state: T
): T & Record<typeof ONBOARDING_ICP_ARRIVAL_KEY, true> {
  return { ...state, [ONBOARDING_ICP_ARRIVAL_KEY]: true };
}

export function withoutOnboardingIcpArrival(state: unknown): unknown {
  if (!state || typeof state !== "object") return state ?? null;
  const next = { ...(state as Record<string, unknown>) };
  delete next[ONBOARDING_ICP_ARRIVAL_KEY];
  return Object.keys(next).length > 0 ? next : null;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scroll the ICP section into view and flash a lime outline. Returns a cleanup. */
export function revealIcpSection(el: HTMLElement): () => void {
  const reduce = prefersReducedMotion();
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.classList.add("icp-arrival-highlight");
  el.removeAttribute("data-armed");
  el.removeAttribute("data-fade");
  // Commit the lime outline before arming the fade, so it does not
  // animate in from the browser's default outline color.
  void el.offsetWidth;

  let fadeFrame = 0;
  if (!reduce) {
    el.setAttribute("data-armed", "true");
    fadeFrame = window.requestAnimationFrame(() => {
      el.setAttribute("data-fade", "true");
    });
  }

  const timer = window.setTimeout(() => {
    el.classList.remove("icp-arrival-highlight");
    el.removeAttribute("data-armed");
    el.removeAttribute("data-fade");
  }, HIGHLIGHT_MS);

  return () => {
    window.cancelAnimationFrame(fadeFrame);
    window.clearTimeout(timer);
    el.classList.remove("icp-arrival-highlight");
    el.removeAttribute("data-armed");
    el.removeAttribute("data-fade");
  };
}
