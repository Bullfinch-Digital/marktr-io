import type { BrandStoryOutput } from "./brandStory";

export type BrandStorySectionKey =
  | "foundingStory"
  | "pointOfView"
  | "positioningStatement"
  | "brandPurpose";

/** Order used on guest results, the story report, and the guest dashboard. */
export const BRAND_STORY_CORE_SECTIONS: { key: BrandStorySectionKey; label: string }[] = [
  { key: "foundingStory", label: "FOUNDING STORY" },
  { key: "pointOfView", label: "YOUR POINT OF VIEW" },
  { key: "positioningStatement", label: "POSITIONING STATEMENT" },
  { key: "brandPurpose", label: "YOUR PURPOSE" },
];

export const BRAND_STORY_FINDINGS_TITLE = "Where your story can go further";

/** Generic stand-in. Never the viewer's story copy. */
export const LOCKED_STORY_PLACEHOLDER = "Locked";

export const STORY_UNLOCK_LABEL = "Start your free trial to unlock your full brand story";

export function storyHasFindings(story: BrandStoryOutput): boolean {
  return (story.findings?.length ?? 0) > 0;
}

/**
 * Story fields safe to hand to a taster view.
 * Locked sections are empty so their copy is not passed into child props.
 */
export function storyForViewer(story: BrandStoryOutput, hasAccess: boolean): BrandStoryOutput {
  if (hasAccess) return story;
  return {
    foundingStory: story.foundingStory,
    pointOfView: "",
    positioningStatement: "",
    brandPurpose: "",
    findings: [],
  };
}

/** Copy, PDF, and share text: first section in full, later titles marked locked. */
export function formatVisibleBrandStory(story: BrandStoryOutput, hasAccess: boolean): string {
  const lines: string[] = [];

  BRAND_STORY_CORE_SECTIONS.forEach((section, index) => {
    lines.push(section.label);
    if (hasAccess || index === 0) lines.push(story[section.key].trim());
    else lines.push(LOCKED_STORY_PLACEHOLDER);
    lines.push("");
  });

  if (storyHasFindings(story)) {
    lines.push(BRAND_STORY_FINDINGS_TITLE);
    if (hasAccess) {
      for (const finding of story.findings ?? []) {
        lines.push(finding.title.trim());
        lines.push(finding.recommendation.trim());
      }
    } else {
      lines.push(LOCKED_STORY_PLACEHOLDER);
    }
  }

  return lines.join("\n").trim();
}
