import { afterEach, describe, expect, it } from "vitest";
import {
  START_FLOW_STORAGE_KEY,
  answeredStoryCount,
  customerProfilesSaved,
  emptyStartFlowDraft,
  firstSentences,
  getStartFlowDraft,
  hasStoredStartResults,
  pickHealthQuickWin,
  saveStartFlowDraft,
  startJobsFinished,
  storyTagline,
} from "./startFlow";
import type { GuestHealthCheck } from "./guestHealthCheck";

afterEach(() => {
  localStorage.removeItem(START_FLOW_STORAGE_KEY);
});

describe("startFlow draft", () => {
  it("round-trips answers so going back does not lose them", () => {
    const draft = emptyStartFlowDraft();
    draft.answers = ["We roast coffee", "Started in a kitchen", "", "Neighbourhood regulars"];
    draft.step = 2;
    draft.storyQuestionIndex = 2;
    saveStartFlowDraft(draft);
    expect(getStartFlowDraft().answers).toEqual(draft.answers);
    expect(answeredStoryCount(draft.answers)).toBe(3);
  });

  it("is finished only when health, story and ICPs are done", () => {
    const draft = emptyStartFlowDraft();
    draft.healthStatus = "skipped";
    draft.storyStatus = "success";
    draft.icpStatus = "success";
    expect(startJobsFinished(draft)).toBe(true);
    draft.healthStatus = "error";
    expect(startJobsFinished(draft)).toBe(false);
  });
});

describe("customerProfilesSaved", () => {
  it("reads guest local storage and signed-in database rows", () => {
    expect(
      customerProfilesSaved({
        guestCount: 3,
        authReady: true,
        signedIn: false,
        dbCount: 0,
      }),
    ).toBe(true);
    expect(
      customerProfilesSaved({
        guestCount: 0,
        authReady: true,
        signedIn: false,
        dbCount: 3,
      }),
    ).toBe(false);
    expect(
      customerProfilesSaved({
        guestCount: 0,
        authReady: true,
        signedIn: true,
        dbCount: null,
      }),
    ).toBeNull();
    expect(
      customerProfilesSaved({
        guestCount: 0,
        authReady: true,
        signedIn: true,
        dbCount: 3,
      }),
    ).toBe(true);
    expect(
      customerProfilesSaved({
        guestCount: 0,
        authReady: true,
        signedIn: true,
        dbCount: 0,
      }),
    ).toBe(false);
  });
});

describe("start results snapshot helpers", () => {
  it("redirects only when nothing was stored", () => {
    expect(hasStoredStartResults({ health: null, story: null, icpCount: 0 })).toBe(false);
    expect(
      hasStoredStartResults({
        health: null,
        story: {
          foundingStory: "We started in a kitchen.",
          pointOfView: "",
          positioningStatement: "",
          brandPurpose: "",
        },
        icpCount: 0,
      }),
    ).toBe(true);
  });

  it("keeps the first three sentences of the story", () => {
    const story = "One. Two. Three. Four. Five.";
    expect(firstSentences(story)).toBe("One. Two. Three.");
    expect(firstSentences(story)).not.toContain("Four");
  });

  it("shows a tagline only when the output has one", () => {
    expect(
      storyTagline({
        foundingStory: "A long story.",
        pointOfView: "",
        positioningStatement: "For neighbours who want coffee.",
        brandPurpose: "",
      }),
    ).toBeNull();
    expect(
      storyTagline({
        foundingStory: "A long story.",
        pointOfView: "",
        positioningStatement: "",
        brandPurpose: "",
        tagline: " Coffee, properly. ",
      } as never),
    ).toBe("Coffee, properly.");
  });

  it("picks the lowest-scoring fix and does not return the other suggestions", () => {
    const health: GuestHealthCheck = {
      input: { email: "a@example.com" },
      scores: {
        websiteClarity: 80,
        brandStory: 40,
        contentConsistency: 70,
        socialPresence: 55,
        overall: 61,
        lowestDimension: "Brand Story",
        lowestScore: 40,
      },
      findings: [
        { dimension: "Website Clarity", score: 80, finding: "Homepage is clear.", nextStep: "Tighten the headline." },
        { dimension: "Brand Story", score: 40, finding: "Story is thin.", nextStep: "Put the founder story on the homepage." },
        { dimension: "Content Consistency", score: 70, finding: "Posting is uneven.", nextStep: "Pick one day a week." },
        { dimension: "Social Presence", score: 55, finding: "Profiles are quiet.", nextStep: "Fill in the bio." },
      ],
      created_at: "2026-10-15T00:00:00.000Z",
    };
    const win = pickHealthQuickWin(health);
    expect(win).toEqual({
      area: "Brand Story",
      fix: "Put the founder story on the homepage.",
      lockedCount: 3,
    });
    expect(JSON.stringify(win)).not.toContain("Tighten the headline");
    expect(JSON.stringify(win)).not.toContain("Fill in the bio");
  });
});
