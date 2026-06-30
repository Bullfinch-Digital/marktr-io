import { HEALTH_CHECK_MODEL_VERSION } from "./constants";
import {
  buildHealthCheckRun,
  normalizeApifyMetrics,
  normalizeHealthCheckFacts,
  absentApifyMetrics,
  absentHealthCheckFacts,
  type DeterministicHealthCheckRun,
} from "./index";

export type ScoreWebsiteApiResponse = {
  facts?: unknown;
  apifyMetrics?: unknown;
  modelVersion?: string;
  scrapeOk?: boolean;
  observation?: string;
  strengths?: string[];
  gaps?: string[];
};

export function parseScoreWebsiteResponse(
  data: ScoreWebsiteApiResponse | null | undefined,
  inputs: {
    websiteUrl: string;
    instagramHandle: string;
    facebookUrl: string;
    domain: string;
  }
): {
  deterministic: DeterministicHealthCheckRun;
  observation: string;
  strengths?: string[];
  gaps?: string[];
} {
  const scrapeOk = data?.scrapeOk !== false;
  const facts = scrapeOk
    ? normalizeHealthCheckFacts(data?.facts)
    : absentHealthCheckFacts();
  const apifyMetrics = scrapeOk
    ? normalizeApifyMetrics(data?.apifyMetrics)
    : absentApifyMetrics();

  const deterministic = buildHealthCheckRun({
    facts,
    apifyMetrics,
    modelVersion: data?.modelVersion ?? HEALTH_CHECK_MODEL_VERSION,
    inputs,
  });

  const observation =
    typeof data?.observation === "string" && data.observation.trim()
      ? data.observation.trim()
      : scrapeOk
        ? "Analysis complete"
        : "Could not access your website — check the URL";

  return {
    deterministic,
    observation,
    strengths: Array.isArray(data?.strengths)
      ? data.strengths.map((s) => String(s))
      : undefined,
    gaps: Array.isArray(data?.gaps)
      ? data.gaps.map((g) => String(g))
      : undefined,
  };
}
