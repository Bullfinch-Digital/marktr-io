export type ValuePropBand = "clear" | "vague" | "absent";
export type NamesCustomerBand = "clear" | "hinted" | "absent";
export type PrimaryCtaBand = "single" | "competing" | "absent";
export type ProofBand = "real" | "claimed" | "absent";
export type PathBand = "clear" | "buried" | "absent";

export type FounderStoryBand = "present" | "partial" | "absent";
export type StorySpecificBand = "specific" | "mixed" | "boilerplate";
export type PointOfViewBand = "distinct" | "implied" | "absent";
export type ValuesMissionBand = "concrete" | "generic" | "absent";

export type SocialReflectsStoryBand = "expresses" | "loose" | "disconnected";
export type ProfileMessageBand = "complete" | "thin" | "absent";

/** LLM extraction output — facts only, no scores (§2). */
export type HealthCheckFacts = {
  valueProp: ValuePropBand;
  namesCustomer: NamesCustomerBand;
  usesSecondPerson: boolean;
  primaryCTA: PrimaryCtaBand;
  proofOnPage: ProofBand;
  pathToBuyContact: PathBand;
  founderStory: FounderStoryBand;
  storySpecific: StorySpecificBand;
  storyNamesConcrete: boolean;
  pointOfView: PointOfViewBand;
  valuesMission: ValuesMissionBand;
  socialReflectsStory: SocialReflectsStoryBand;
  igProfileComplete: ProfileMessageBand;
  bioOnMessage: ProfileMessageBand;
};

const VALUE_PROP = new Set<ValuePropBand>(["clear", "vague", "absent"]);
const NAMES_CUSTOMER = new Set<NamesCustomerBand>(["clear", "hinted", "absent"]);
const PRIMARY_CTA = new Set<PrimaryCtaBand>(["single", "competing", "absent"]);
const PROOF = new Set<ProofBand>(["real", "claimed", "absent"]);
const PATH = new Set<PathBand>(["clear", "buried", "absent"]);
const FOUNDER = new Set<FounderStoryBand>(["present", "partial", "absent"]);
const STORY_SPECIFIC = new Set<StorySpecificBand>([
  "specific",
  "mixed",
  "boilerplate",
]);
const POV = new Set<PointOfViewBand>(["distinct", "implied", "absent"]);
const VALUES = new Set<ValuesMissionBand>(["concrete", "generic", "absent"]);
const SOCIAL_REFLECTS = new Set<SocialReflectsStoryBand>([
  "expresses",
  "loose",
  "disconnected",
]);
const PROFILE = new Set<ProfileMessageBand>(["complete", "thin", "absent"]);

function pickEnum<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T
): T {
  return typeof value === "string" && allowed.has(value as T)
    ? (value as T)
    : fallback;
}

/** Deterministic fallback when LLM fails or returns malformed JSON (§1). */
export function absentHealthCheckFacts(): HealthCheckFacts {
  return {
    valueProp: "absent",
    namesCustomer: "absent",
    usesSecondPerson: false,
    primaryCTA: "absent",
    proofOnPage: "absent",
    pathToBuyContact: "absent",
    founderStory: "absent",
    storySpecific: "boilerplate",
    storyNamesConcrete: false,
    pointOfView: "absent",
    valuesMission: "absent",
    socialReflectsStory: "disconnected",
    igProfileComplete: "absent",
    bioOnMessage: "absent",
  };
}

export function normalizeHealthCheckFacts(raw: unknown): HealthCheckFacts {
  if (!raw || typeof raw !== "object") return absentHealthCheckFacts();
  const f = raw as Record<string, unknown>;
  return {
    valueProp: pickEnum(f.valueProp, VALUE_PROP, "absent"),
    namesCustomer: pickEnum(f.namesCustomer, NAMES_CUSTOMER, "absent"),
    usesSecondPerson: Boolean(f.usesSecondPerson),
    primaryCTA: pickEnum(f.primaryCTA, PRIMARY_CTA, "absent"),
    proofOnPage: pickEnum(f.proofOnPage, PROOF, "absent"),
    pathToBuyContact: pickEnum(f.pathToBuyContact, PATH, "absent"),
    founderStory: pickEnum(f.founderStory, FOUNDER, "absent"),
    storySpecific: pickEnum(f.storySpecific, STORY_SPECIFIC, "boilerplate"),
    storyNamesConcrete: Boolean(f.storyNamesConcrete),
    pointOfView: pickEnum(f.pointOfView, POV, "absent"),
    valuesMission: pickEnum(f.valuesMission, VALUES, "absent"),
    socialReflectsStory: pickEnum(f.socialReflectsStory, SOCIAL_REFLECTS, "disconnected"),
    igProfileComplete: pickEnum(f.igProfileComplete, PROFILE, "absent"),
    bioOnMessage: pickEnum(f.bioOnMessage, PROFILE, "absent"),
  };
}
