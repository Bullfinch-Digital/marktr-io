/** Pinned OpenAI model — record on every run for determinism scope (§6). */
export const HEALTH_CHECK_MODEL_VERSION = "gpt-4o-mini-2024-07-18";

/** Scorer rules version — bump when §4 point tables, calibration, or extraction behaviour change. */
export const HEALTH_CHECK_SCORER_VERSION = "1.0.6";

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

/** Content was checked and no post dates or rate were found. Score is 0 and counts in the overall. */
export const NO_RECENT_POSTS_COPY =
  "We couldn't find any recent posts, so there's nothing to score yet.";

export const NO_RECENT_POSTS_NEXT_STEP =
  "Plan three posts for this week and publish them to start building a rhythm.";

/** Content was not checked (nothing to read, or the fetch failed). Excluded from the overall. */
export const CONTENT_NOT_ASSESSED_LABEL = "Not assessed";

export const CONTENT_NOT_ASSESSED_COPY =
  "Add a social profile to score your content consistency.";

/** Finding / observation when Instagram was provided but Apify could not be read. */
export const SOCIAL_INCOMPLETE_COPY =
  "Couldn't read your social this time — this score covers Website Clarity and Brand Story only.";