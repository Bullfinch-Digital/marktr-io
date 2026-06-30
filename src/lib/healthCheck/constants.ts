/** Pinned OpenAI model — record on every run for determinism scope (§6). */
export const HEALTH_CHECK_MODEL_VERSION = "gpt-4o-mini-2024-07-18";

/** Scorer rules version — bump when §4 point tables change. */
export const HEALTH_CHECK_SCORER_VERSION = "1.0.0";

/** Rubric table weights (§4): Website 30, Story 30, Content 25, Social 15. */
export const DIMENSION_WEIGHTS = {
  websiteClarity: 0.3,
  brandStory: 0.3,
  contentConsistency: 0.25,
  socialPresence: 0.15,
} as const;
