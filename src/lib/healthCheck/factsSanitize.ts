import type { HealthCheckFacts } from "./factsSchema";
import type { ApifySocialMetrics } from "./socialBands";

export function hasAnySocialProfile(metrics: ApifySocialMetrics): boolean {
  return metrics.instagramFound || metrics.facebookFound;
}

/**
 * v1.0.1 — When no social scrape exists, never trust LLM social-quality facts.
 * Applied in code before scoring (deterministic override).
 */
export function sanitizeFactsForScoring(
  facts: HealthCheckFacts,
  apifyMetrics: ApifySocialMetrics
): HealthCheckFacts {
  if (hasAnySocialProfile(apifyMetrics)) return facts;

  return {
    ...facts,
    socialReflectsStory: "disconnected",
    igProfileComplete: "absent",
    bioOnMessage: "absent",
  };
}
