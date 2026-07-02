/** Pinned OpenAI model — record on every run for determinism scope (§6). */
export const HEALTH_CHECK_MODEL_VERSION = "gpt-4o-mini-2024-07-18";

/** Scorer rules version — bump when §4 point tables or calibration change. */
export const HEALTH_CHECK_SCORER_VERSION = "1.0.1";

/** Rubric table weights (§4): Website 30, Story 30, Content 25, Social 15. */
export const DIMENSION_WEIGHTS = {
  websiteClarity: 0.3,
  brandStory: 0.3,
  contentConsistency: 0.25,
  socialPresence: 0.15,
} as const;

/** Max automated overall — top points reserved for human-judgement qualities. */
export const OVERALL_CAP = 92;

/** Shown on the overall summary when the weighted score exceeds OVERALL_CAP. */
export const OVERALL_CAP_FRAMING_COPY =
  "Your scores are genuinely strong across the board — we cap the automated overall at 92 because the last few points are the kind of thing that benefits from a human eye, not a scraper.";
