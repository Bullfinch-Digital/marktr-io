export const BF_THRESHOLDS = {
  /** Website Clarity below this (with Brand Story also below) routes to diy. */
  diyWebsiteClarity: 40,
  /** Brand Story below this (with Website Clarity also below) routes to diy. */
  diyBrandStory: 40,
  /** Overall at or above this routes to polish, unless diy already matched. */
  strongScore: 75,
} as const;

export type BfRoute = "talk" | "polish" | "diy";

export const BF_ROUTES: readonly BfRoute[] = ["talk", "polish", "diy"];

export type BullfinchRouteScores = {
  websiteClarity: number;
  brandStory: number;
  overall: number;
  /** False when that pillar was not checked. Omitted means it was checked. */
  contentChecked?: boolean;
  socialChecked?: boolean;
};

export function routePillarsChecked(input: {
  instagramFound: boolean;
  facebookFound: boolean;
  instagramFetchStatus: string;
  latestPostDaysAgo: number | null;
  postsPerWeek: number | null;
}): { contentChecked: boolean; socialChecked: boolean } {
  const noProfile = !input.instagramFound && !input.facebookFound;
  const incomplete = input.instagramFetchStatus === "incomplete";
  const postingUnknown =
    input.instagramFetchStatus === "found" &&
    input.instagramFound &&
    input.latestPostDaysAgo == null &&
    input.postsPerWeek == null;
  return {
    contentChecked: !incomplete && !noProfile && !postingUnknown,
    socialChecked: !incomplete && !noProfile,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isBfRoute(value: unknown): value is BfRoute {
  return value === "talk" || value === "polish" || value === "diy";
}

/**
 * Server-side Bullfinch next-step route. Social and Content never decide diy.
 * The overall passed in already excludes pillars that were not checked, and is
 * what the report displays. Polish still requires every pillar to have been checked.
 *
 * diy: the site itself is too thin (Website Clarity and Brand Story both < 40).
 * polish: overall ≥ 75 and Social and Content were both checked.
 * talk: everything else, including a strong site with Social or Content not checked.
 */
export function bullfinchRoute(scores: BullfinchRouteScores): BfRoute {
  const website = finiteNumber(scores.websiteClarity);
  const story = finiteNumber(scores.brandStory);
  const overall = finiteNumber(scores.overall);
  const allPillarsChecked = scores.contentChecked !== false && scores.socialChecked !== false;

  if (
    website !== null &&
    story !== null &&
    website < BF_THRESHOLDS.diyWebsiteClarity &&
    story < BF_THRESHOLDS.diyBrandStory
  ) {
    return "diy";
  }
  if (allPillarsChecked && overall !== null && overall >= BF_THRESHOLDS.strongScore) {
    return "polish";
  }
  return "talk";
}
