export const BF_THRESHOLDS = {
  /** Website Clarity below this (with Brand Story also below) routes to diy. */
  diyWebsiteClarity: 40,
  /** Brand Story below this (with Website Clarity also below) routes to diy. */
  diyBrandStory: 40,
  /** Overall at or above this routes to polish, unless diy already matched. */
  strongScore: 75,
  /**
   * When no social handles were entered, Website Clarity at or above this
   * (with Brand Story) routes to polish. Social and Content are 0 in that
   * case, which caps overall around 60 and would otherwise hide polish.
   */
  noSocialWebsiteClarity: 75,
  /** Brand Story bar for the no-handles polish route. */
  noSocialBrandStory: 75,
} as const;

export type BfRoute = "talk" | "polish" | "diy";

export const BF_ROUTES: readonly BfRoute[] = ["talk", "polish", "diy"];

export type BullfinchRouteScores = {
  websiteClarity: number;
  brandStory: number;
  overall: number;
  /**
   * True when an Instagram handle or Facebook URL was entered.
   * Omitted or true keeps the overall-only polish rule.
   */
  socialHandlesProvided?: boolean;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isBfRoute(value: unknown): value is BfRoute {
  return value === "talk" || value === "polish" || value === "diy";
}

/**
 * Server-side Bullfinch next-step route. Social and Content are ignored:
 * they are 0 whenever no handle was entered and must not send anyone to diy.
 *
 * diy: the site itself is too thin (Website Clarity and Brand Story both < 40).
 * polish: overall ≥ 75, or no social handles were provided and both
 *   Website Clarity and Brand Story are ≥ 75.
 * talk: everything else.
 */
export function bullfinchRoute(scores: BullfinchRouteScores): BfRoute {
  const website = finiteNumber(scores.websiteClarity);
  const story = finiteNumber(scores.brandStory);
  const overall = finiteNumber(scores.overall);
  const socialHandlesProvided = scores.socialHandlesProvided !== false;

  if (
    website !== null &&
    story !== null &&
    website < BF_THRESHOLDS.diyWebsiteClarity &&
    story < BF_THRESHOLDS.diyBrandStory
  ) {
    return "diy";
  }
  if (overall !== null && overall >= BF_THRESHOLDS.strongScore) {
    return "polish";
  }
  if (
    !socialHandlesProvided &&
    website !== null &&
    story !== null &&
    website >= BF_THRESHOLDS.noSocialWebsiteClarity &&
    story >= BF_THRESHOLDS.noSocialBrandStory
  ) {
    return "polish";
  }
  return "talk";
}
