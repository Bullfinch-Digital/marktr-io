export const BRAND_STORY_QUESTION_COUNT = 7;

export type LabeledStoryAnswer = {
  question: number;
  text: string;
};

/** Pad or trim to the stored 7-slot payload used by guest claim + dashboard. */
export function padStoryAnswers(answers: string[]): string[] {
  const next = Array.from({ length: BRAND_STORY_QUESTION_COUNT }, (_, i) =>
    String(answers[i] ?? "").trim(),
  );
  return next;
}

/** Send only answered questions, labeled by 1-based index so skips keep their identity. */
export function labeledStoryAnswers(answers: string[]): LabeledStoryAnswer[] {
  return padStoryAnswers(answers)
    .map((text, index) => ({ question: index + 1, text }))
    .filter((row) => row.text.length > 0);
}
