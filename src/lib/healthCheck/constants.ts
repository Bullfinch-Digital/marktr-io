/** Pinned OpenAI model — record on every run for determinism scope (§6). */
export const HEALTH_CHECK_MODEL_VERSION = "gpt-4o-mini-2024-07-18";

/** Scorer rules version — bump when §4 point tables or calibration change. */
export const HEALTH_CHECK_SCORER_VERSION = "1.0.2";

/** Rubric table weights (§4): Website 30, Story 30, Content 25, Social 15. */
export const DIMENSION_WEIGHTS = {
  websiteClarity: 0.3,
  brandStory: 0.3,
  contentConsistency: 0.25,
  socialPresence: 0.15,
} as const;

/**
 * On social-incomplete runs, Content + Social are unmeasured.
 * Website (0.30) + Brand Story (0.30) = 0.60 → renormalise to 0.50 / 0.50.
 */
export const SOCIAL_INCOMPLETE_WEIGHTS = {
  websiteClarity: 0.5,
  brandStory: 0.5,
} as const;

/** Max automated overall — top points reserved for human-judgement qualities. */
export const OVERALL_CAP = 92;

/** Max displayed dimension score — raw points still feed overallRaw uncapped. */
export const DIMENSION_DISPLAY_CAP = 95;

/** Theoretical max points for a fully measured dimension (all checks at top band). */
export const DIMENSION_RAW_MAX = 100;

/** Shown on the overall summary when the weighted score exceeds OVERALL_CAP. */
export const OVERALL_CAP_FRAMING_COPY =
  "Your scores are genuinely strong across the board — we cap the automated overall at 92 because the last few points are the kind of thing that benefits from a human eye, not a scraper.";

/** Shown on a dimension card when display-capped or at raw max — replaces Key gaps. */
export const DIMENSION_CAP_FRAMING_COPY =
  "Your score here is excellent — we hold the top back because there's always an edge to sharpen.";

/** Finding / observation when Instagram was provided but Apify could not be read. */
export const SOCIAL_INCOMPLETE_COPY =
  "Couldn't read your social this time — this score covers Website Clarity and Brand Story only.";