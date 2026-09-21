import { getGuestHealthCheck } from "./guestHealthCheck";
import { getGuestICPs } from "./guestICP";
import { getGuestStory } from "./guestStory";

export type GuestToolId = "health" | "story" | "icp";

const TOOL_ORDER: GuestToolId[] = ["health", "story", "icp"];

const TOOL_PHRASES: Record<GuestToolId, string> = {
  health: "digital health check",
  story: "brand story",
  icp: "ideal customer profile",
};

const TOOL_HEADINGS: Record<GuestToolId, string> = {
  health: "Ready to turn these scores into a plan?",
  story: "Ready to put your story to work?",
  icp: "Ready to put your customers to work?",
};

export type GuestNextStepsCta = {
  allComplete: boolean;
  heading: string;
  body: string;
  buttonLabel: string;
  subline?: string;
};

export function getGuestToolCompletion(): Record<GuestToolId, boolean> {
  return {
    health: Boolean(getGuestHealthCheck()?.scores),
    story: Boolean(getGuestStory()?.output),
    icp: (getGuestICPs()?.length ?? 0) > 0,
  };
}

function formatRemainingPhrase(phrases: string[]): string {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return `your ${phrases[0]}`;
  if (phrases.length === 2) return `your ${phrases[0]} and ${phrases[1]}`;
  return `your ${phrases[0]}, ${phrases[1]}, and ${phrases[2]}`;
}

/**
 * CTA copy for guest results pages — lists only tools still outstanding,
 * excluding the page the guest just completed.
 */
export function getGuestNextStepsCta(currentTool: GuestToolId): GuestNextStepsCta {
  const completion = getGuestToolCompletion();
  completion[currentTool] = true;

  const outstanding = TOOL_ORDER.filter((id) => id !== currentTool && !completion[id]).map(
    (id) => TOOL_PHRASES[id]
  );

  if (outstanding.length === 0) {
    return {
      allComplete: true,
      heading: "You're all set.",
      body: "You've completed all three steps — see your full picture.",
      buttonLabel: "Go to your dashboard →",
    };
  }

  const savedNoun = currentTool === "story" ? "story" : "results";

  return {
    allComplete: false,
    heading: TOOL_HEADINGS[currentTool],
    body: `Now complete your ${formatRemainingPhrase(outstanding)} — marktr uses all three to build a content strategy specific to your business.`,
    buttonLabel: "Build the full picture →",
    subline: `Free to start · Your ${savedNoun} is saved in your browser`,
  };
}
