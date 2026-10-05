import { DIMENSION_CAP_FRAMING_COPY } from "./constants";

/** Stored or generated lines that are not something we actually saw. */
const GENERIC_OBSERVATION_PREFIXES = [
  "Your homepage communicates",
  "Your value proposition could",
  "Visitors may struggle",
  "Strong brand story",
  "Basic story present",
  "Brand story needs",
  "You're maintaining a consistent",
  "Some gaps in your content",
  "Irregular posting",
  "Strong social presence",
  "Social presence is building",
  "Limited social presence",
  "We could not verify your Instagram profile",
  "Instagram handle provided but profile not found",
];

export type PillarFallback = {
  pillar: string;
  reason: string;
};

const loggedFallbacks = new Set<string>();

/** Once per page load, so a re-render does not look like another failure. */
export function logPillarFallback(fallback: PillarFallback): void {
  const key = `${fallback.pillar}:${fallback.reason}`;
  if (loggedFallbacks.has(key)) return;
  loggedFallbacks.add(key);
  console.info("health_check_fallback", fallback);
}

export function isSpecificPillarObservation(text: string | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value || value === "Analysis complete" || value === DIMENSION_CAP_FRAMING_COPY) return false;
  return !GENERIC_OBSERVATION_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function resolvePillarCopy(input: {
  pillar: string;
  score: number | null;
  scoreRaw?: number | null;
  dimensionCapped?: boolean;
  modelObservation?: string;
  modelNextStep?: string;
  bandMeaning?: string;
  bandAction?: string;
}): { observation: string; nextStep?: string; fallbacks: PillarFallback[] } {
  const fallbacks: PillarFallback[] = [];
  const high =
    (input.score ?? 0) >= 85 ||
    (input.scoreRaw ?? 0) >= 100 ||
    input.dimensionCapped === true;
  const specific = isSpecificPillarObservation(input.modelObservation);
  const observation = specific
    ? input.modelObservation!.trim()
    : high
      ? DIMENSION_CAP_FRAMING_COPY
      : input.bandMeaning || input.modelObservation?.trim() || "";
  if (!specific) {
    fallbacks.push({
      pillar: input.pillar,
      reason: high ? "high score had no specific observation" : "no specific observation",
    });
  }

  const modelStep = input.modelNextStep?.trim();
  const nextStep = modelStep || input.bandAction;
  if (!modelStep && input.bandAction) {
    fallbacks.push({ pillar: input.pillar, reason: "no specific next step" });
  }

  return { observation, nextStep, fallbacks };
}
