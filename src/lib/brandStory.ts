export type BrandStoryFinding = {
  title: string;
  recommendation: string;
};

export type BrandStoryOutput = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
  findings?: BrandStoryFinding[];
};

function parseFindings(raw: unknown): BrandStoryFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const recommendation =
        typeof row.recommendation === "string" ? row.recommendation.trim() : "";
      if (!title || !recommendation) return null;
      return { title, recommendation };
    })
    .filter((item): item is BrandStoryFinding => item !== null)
    .slice(0, 4);
}

function parseCoreFields(raw: Record<string, unknown>): BrandStoryOutput | null {
  if (
    typeof raw.foundingStory !== "string" ||
    typeof raw.pointOfView !== "string" ||
    typeof raw.positioningStatement !== "string" ||
    typeof raw.brandPurpose !== "string"
  ) {
    return null;
  }

  return {
    foundingStory: raw.foundingStory,
    pointOfView: raw.pointOfView,
    positioningStatement: raw.positioningStatement,
    brandPurpose: raw.brandPurpose,
    findings: parseFindings(raw.findings),
  };
}

export function parseBrandStoryFromApi(raw: Record<string, unknown> | null): BrandStoryOutput | null {
  if (!raw) return null;
  return parseCoreFields(raw);
}

export function parseBrandStoryFromStorage(raw: unknown): BrandStoryOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const direct = parseCoreFields(record);
  if (direct) return direct;

  if (record.output && typeof record.output === "object") {
    return parseCoreFields(record.output as Record<string, unknown>);
  }

  return null;
}
