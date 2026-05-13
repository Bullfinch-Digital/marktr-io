export type GuestStory = {
  answers: string[];
  email: string;
  output: {
    foundingStory: string;
    pointOfView: string;
    positioningStatement: string;
    brandPurpose: string;
  } | null;
  created_at: string;
};

const STORY_KEY = "marktr_guest_story_v1";

export function setGuestStory(story: GuestStory | null): void {
  try {
    if (!story) {
      localStorage.removeItem(STORY_KEY);
      return;
    }
    localStorage.setItem(STORY_KEY, JSON.stringify(story));
  } catch {
    // ignore
  }
}

export function getGuestStory(): GuestStory | null {
  try {
    const raw = localStorage.getItem(STORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestStory;
    if (!parsed?.email || !Array.isArray(parsed.answers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestStory(): void {
  try {
    localStorage.removeItem(STORY_KEY);
  } catch {
    // ignore
  }
}
