import type { BrandStoryOutput } from "./brandStory";
import type { GuestHealthCheck } from "./guestHealthCheck";
import type { GuestICP } from "./guestICP";

export const START_FLOW_STORAGE_KEY = "marktr_start_flow_v1";

export const START_PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "Meta Ads (paid social)",
  "TikTok",
  "LinkedIn",
  "Email newsletter",
  "Pinterest",
  "Website or online shop",
  "YouTube",
  "X",
  "None yet",
] as const;

export const START_STORY_QUESTIONS: { heading: string; subtext: string }[] = [
  {
    heading: "What do you do, and who do you do it for?",
    subtext: "Explain it like you would to a friend.",
  },
  {
    heading: "Why did you start this business?",
    subtext: "A moment, a frustration, or a dream. Anything that got you going.",
  },
  {
    heading: "What do you do differently, or want to do differently, from others like you?",
    subtext: "It's fine if you're just starting out. Tell us how you'd like to do things your own way.",
  },
  {
    heading: "Who do you think your best customer is?",
    subtext:
      "Even if you don't have many customers yet, picture the person you most want to help. What do they care about?",
  },
];

export const START_GENERATION_STEPS = [
  { id: "health", label: "Reading your website" },
  { id: "story", label: "Shaping your story" },
  { id: "icps", label: "Finding your customers" },
] as const;

export type StartFlowStep = 1 | 2 | 3;

export type StartJobStatus = "idle" | "running" | "success" | "skipped" | "error";

export type StartFlowDraft = {
  step: StartFlowStep;
  storyQuestionIndex: number;
  businessName: string;
  websiteUrl: string;
  noWebsite: boolean;
  platforms: string[];
  answers: [string, string, string, string];
  healthStatus: StartJobStatus;
  storyStatus: StartJobStatus;
  icpStatus: StartJobStatus;
};

const EMPTY_ANSWERS: [string, string, string, string] = ["", "", "", ""];

export function emptyStartFlowDraft(): StartFlowDraft {
  return {
    step: 1,
    storyQuestionIndex: 0,
    businessName: "",
    websiteUrl: "",
    noWebsite: false,
    platforms: [],
    answers: [...EMPTY_ANSWERS],
    healthStatus: "idle",
    storyStatus: "idle",
    icpStatus: "idle",
  };
}

function asStep(value: unknown): StartFlowStep {
  return value === 2 || value === 3 ? value : 1;
}

function asAnswers(value: unknown): [string, string, string, string] {
  if (!Array.isArray(value)) return [...EMPTY_ANSWERS];
  return [
    String(value[0] ?? ""),
    String(value[1] ?? ""),
    String(value[2] ?? ""),
    String(value[3] ?? ""),
  ];
}

function asJobStatus(value: unknown): StartJobStatus {
  if (
    value === "running" ||
    value === "success" ||
    value === "skipped" ||
    value === "error"
  ) {
    return value;
  }
  return "idle";
}

export function getStartFlowDraft(): StartFlowDraft {
  try {
    const raw = localStorage.getItem(START_FLOW_STORAGE_KEY);
    if (!raw) return emptyStartFlowDraft();
    const parsed = JSON.parse(raw) as Partial<StartFlowDraft>;
    return {
      ...emptyStartFlowDraft(),
      step: asStep(parsed.step),
      storyQuestionIndex:
        typeof parsed.storyQuestionIndex === "number" &&
        parsed.storyQuestionIndex >= 0 &&
        parsed.storyQuestionIndex <= 3
          ? parsed.storyQuestionIndex
          : 0,
      businessName: String(parsed.businessName ?? ""),
      websiteUrl: String(parsed.websiteUrl ?? ""),
      noWebsite: Boolean(parsed.noWebsite),
      platforms: Array.isArray(parsed.platforms)
        ? parsed.platforms.filter((item): item is string => typeof item === "string")
        : [],
      answers: asAnswers(parsed.answers),
      healthStatus: asJobStatus(parsed.healthStatus),
      storyStatus: asJobStatus(parsed.storyStatus),
      icpStatus: asJobStatus(parsed.icpStatus),
    };
  } catch {
    return emptyStartFlowDraft();
  }
}

export function saveStartFlowDraft(draft: StartFlowDraft): void {
  try {
    localStorage.setItem(START_FLOW_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function answeredStoryCount(answers: string[]): number {
  return answers.filter((answer) => answer.trim().length > 0).length;
}

export function startJobsFinished(draft: StartFlowDraft): boolean {
  const healthDone = draft.healthStatus === "success" || draft.healthStatus === "skipped";
  const storyDone = draft.storyStatus === "success";
  const icpDone = draft.icpStatus === "success";
  return healthDone && storyDone && icpDone;
}

/** Null while auth or the signed-in database read is still in flight. */
export function customerProfilesSaved(input: {
  guestCount: number;
  authReady: boolean;
  signedIn: boolean;
  dbCount: number | null;
}): boolean | null {
  if (input.guestCount > 0) return true;
  if (!input.authReady) return null;
  if (!input.signedIn) return false;
  if (input.dbCount === null) return null;
  return input.dbCount > 0;
}

export type StartResultsSnapshot = {
  health: GuestHealthCheck | null;
  healthSkipped: boolean;
  story: BrandStoryOutput | null;
  icps: GuestICP[];
};
