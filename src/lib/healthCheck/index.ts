export {
  HEALTH_CHECK_MODEL_VERSION,
  HEALTH_CHECK_SCORER_VERSION,
  DIMENSION_WEIGHTS,
  SOCIAL_INCOMPLETE_WEIGHTS,
  OVERALL_CAP,
  DIMENSION_DISPLAY_CAP,
  DIMENSION_RAW_MAX,
  OVERALL_CAP_FRAMING_COPY,
  DIMENSION_CAP_FRAMING_COPY,
  NO_RECENT_POSTS_COPY,
  NO_RECENT_POSTS_NEXT_STEP,
  CONTENT_NOT_ASSESSED_LABEL,
  CONTENT_NOT_ASSESSED_COPY,
  SOCIAL_INCOMPLETE_COPY,
} from "./constants";

export {
  type HealthCheckFacts,
  type ValuePropBand,
  absentHealthCheckFacts,
  normalizeHealthCheckFacts,
} from "./factsSchema";

export {
  type EngagementSource,
  type EngagementInput,
  type EngagementBand,
  type InstagramFetchStatus,
  type ApifySocialMetrics,
  type BandedSocialSignals,
  absentApifyMetrics,
  normalizeApifyMetrics,
  bandEngagementForSize,
  bandSocialSignals,
  computeEngagementRatePercent,
  computePostsPerWeek,
  computeLatestPostDaysAgo,
  parsePostTimestamp,
} from "./socialBands";

export {
  type HealthCheckPointBreakdown,
  type DimensionScoreFields,
  type DeterministicHealthCheckRun,
  scorePointsFromFacts,
  scoreFromFacts,
  buildHealthCheckRun,
  buildAbsentHealthCheckRun,
  weightedOverallScore,
  applyDimensionDisplayCap,
  unmeasuredDimension,
  shouldSuppressDimensionGaps,
  showsDimensionCapFraming,
  isSocialIncomplete,
  hasNoPostMetrics,
} from "./scoreEngine";

export {
  type ScoreWebsiteApiResponse,
  parseScoreWebsiteResponse,
} from "./parseApiResponse";

export { sanitizeFactsForScoring, hasAnySocialProfile } from "./factsSanitize";
