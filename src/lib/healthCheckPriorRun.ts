import { mergeHealthFindings, parseApiFindings, type HealthDimensionFinding } from "./healthCheckFindings";
import { parseStoredScores } from "./healthCheckReportStorage";
import {
  summarizeHealthCheckRow,
  type HealthCheckRow,
} from "./healthCheckPersistence";

/** Payload sent to score-website for prior-run-aware findings prose only. */
export type HealthCheckPriorRunPayload = {
  scores: {
    website: number;
    brandStory: number;
    content: number;
    social: number;
    overall: number;
  };
  findings: Array<{ dimension: string; finding: string }>;
  gaps?: string[];
  missingElements?: string[];
  created_at: string;
};

export function buildPriorRunPayload(
  row: HealthCheckRow | null | undefined
): HealthCheckPriorRunPayload | undefined {
  if (!row) return undefined;

  const parsed = parseStoredScores(row.scores);
  if (!parsed) return undefined;

  const summary = summarizeHealthCheckRow(row);
  if (!summary) return undefined;

  const storedFindings = parseApiFindings(row.scores?.websiteScore?.findings);
  const findingsSource: HealthDimensionFinding[] =
    storedFindings.length > 0 ? storedFindings : mergeHealthFindings(parsed.scores);

  const gaps =
    parsed.scores.websiteClarity.gaps?.length
      ? parsed.scores.websiteClarity.gaps
      : row.scores?.websiteScore?.gaps;

  const missingElements =
    parsed.scores.brandStory.storyAssessment?.missingElements?.length
      ? parsed.scores.brandStory.storyAssessment.missingElements
      : row.scores?.websiteScore?.storyAssessment?.missingElements;

  return {
    scores: {
      website: summary.website,
      brandStory: summary.brandStory,
      content: summary.content,
      social: summary.social,
      overall: summary.overall,
    },
    findings: findingsSource.map(({ dimension, finding }) => ({ dimension, finding })),
    gaps: gaps?.length ? gaps : undefined,
    missingElements: missingElements?.length ? missingElements : undefined,
    created_at: row.created_at,
  };
}
