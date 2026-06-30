export {
  HEALTH_CHECK_MODEL_VERSION,
  HEALTH_CHECK_SCORER_VERSION,
  DIMENSION_WEIGHTS,
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
  type DeterministicHealthCheckRun,
  scorePointsFromFacts,
  scoreFromFacts,
  buildHealthCheckRun,
  buildAbsentHealthCheckRun,
  weightedOverallScore,
} from "./scoreEngine";

export {
  type ScoreWebsiteApiResponse,
  parseScoreWebsiteResponse,
} from "./parseApiResponse";
