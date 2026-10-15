import { afterEach, describe, expect, it } from "vitest";
import {
  START_FLOW_STORAGE_KEY,
  answeredStoryCount,
  customerProfilesSaved,
  emptyStartFlowDraft,
  getStartFlowDraft,
  saveStartFlowDraft,
  startJobsFinished,
} from "./startFlow";

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
