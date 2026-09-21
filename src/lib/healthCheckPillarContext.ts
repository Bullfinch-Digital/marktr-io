import {
  fetchLatestBrandStory,
  storyOutputFromRow,
  type BrandStoryRow,
} from "./brandStoryPersistence";
import type { BrandStoryOutput } from "./brandStory";

/** Defined pillar content passed to findings generation only — never scoring. */
export type HealthCheckBrandStoryPillar = {
  foundingStory: string;
  pointOfView: string;
  positioningStatement: string;
  brandPurpose: string;
  /** True when at least one core field has meaningful text. */
  hasDefinedStory: boolean;
};

/** Extensible map for future ICP / other pillar cross-references (findings only). */
export type HealthCheckPillarContext = {
  brandStory?: HealthCheckBrandStoryPillar | null;
};

const MIN_PILLAR_FIELD_CHARS = 24;

function fieldHasContent(value: string | undefined): boolean {
  return Boolean(value?.trim() && value.trim().length >= MIN_PILLAR_FIELD_CHARS);
}

export function brandStoryPillarFromOutput(
  output: BrandStoryOutput | null | undefined
): HealthCheckBrandStoryPillar | null {
  if (!output) return null;

  const foundingStory = output.foundingStory?.trim() ?? "";
  const pointOfView = output.pointOfView?.trim() ?? "";
  const positioningStatement = output.positioningStatement?.trim() ?? "";
  const brandPurpose = output.brandPurpose?.trim() ?? "";

  const hasDefinedStory =
    fieldHasContent(foundingStory) ||
    fieldHasContent(pointOfView) ||
    fieldHasContent(positioningStatement) ||
    fieldHasContent(brandPurpose);

  if (!hasDefinedStory) return null;

  return {
    foundingStory,
    pointOfView,
    positioningStatement,
    brandPurpose,
    hasDefinedStory: true,
  };
}

export function buildBrandStoryPillarFromRow(
  row: BrandStoryRow | null | undefined
): HealthCheckBrandStoryPillar | null {
  return brandStoryPillarFromOutput(storyOutputFromRow(row ?? null));
}

export async function fetchBrandStoryPillarForHealth(
  userId: string,
  brandId: string | null
): Promise<HealthCheckBrandStoryPillar | null> {
  if (!brandId) return null;
  const row = await fetchLatestBrandStory(userId, brandId);
  return buildBrandStoryPillarFromRow(row);
}
