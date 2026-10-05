export type PillarFinding = {
  dimension: string;
  score: number;
  /** Compatibility text. Same words as observation. */
  finding: string;
  observation: string;
  nextStep: string;
};

export type PillarFindingsPayload = {
  findings: PillarFinding[];
  strengths: string[];
  gaps: string[];
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePillarFindings(raw: string): PillarFindingsPayload | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return parsePillarFindings(match[0]);
  }

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings
        .map((item): PillarFinding | null => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const dimension = asText(row.dimension);
          const observation = asText(row.observation) || asText(row.finding);
          const nextStep = asText(row.next_step) || asText(row.nextStep);
          const score = Number(row.score);
          if (!dimension || !observation || Number.isNaN(score)) return null;
          return {
            dimension,
            score,
            finding: observation,
            observation,
            nextStep,
          };
        })
        .filter((item): item is PillarFinding => item !== null)
    : [];

  if (findings.length === 0) return null;

  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return { findings, strengths, gaps };
}
