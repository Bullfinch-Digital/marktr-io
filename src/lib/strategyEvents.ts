/** Fired when brand aims are created, edited, archived, restored, or permanently deleted. */
export function dispatchAimsChanged(): void {
  try {
    window.dispatchEvent(new Event("brand-aims:changed"));
    window.dispatchEvent(new Event("aims:changed"));
  } catch {
    // ignore
  }
}

const STRATEGY_COMPOSITION_STALE_EVENTS = [
  "brand-aims:changed",
  "aims:changed",
  "icps:changed",
] as const;

/** Subscribe when linked aim/ICP labels or archived state may have changed. */
export function subscribeStrategyCompositionStale(handler: () => void): () => void {
  for (const event of STRATEGY_COMPOSITION_STALE_EVENTS) {
    window.addEventListener(event, handler);
  }
  return () => {
    for (const event of STRATEGY_COMPOSITION_STALE_EVENTS) {
      window.removeEventListener(event, handler);
    }
  };
}
