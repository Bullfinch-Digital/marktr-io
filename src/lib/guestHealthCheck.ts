import type { HealthCheckInput } from "./healthCheckScoring";
import type { HealthDimensionFinding } from "./healthCheckFindings";

export type GuestHealthCheck = {
  input: {
    websiteUrl?: string;
    instagramHandle?: string;
    facebookUrl?: string;
    email: string;
  };
  scores: {
    websiteClarity: number;
    brandStory: number;
    contentConsistency: number;
    socialPresence: number;
    overall: number;
    lowestDimension: string;
    lowestScore: number;
  };
  websiteScore?: HealthCheckInput["websiteScore"];
  findings?: HealthDimensionFinding[];
  created_at: string;
};

const HEALTH_KEY = "marktr_guest_health_check_v1";

export function setGuestHealthCheck(data: GuestHealthCheck | null): void {
  try {
    if (!data) {
      localStorage.removeItem(HEALTH_KEY);
      return;
    }
    localStorage.setItem(HEALTH_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getGuestHealthCheck(): GuestHealthCheck | null {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestHealthCheck;
    if (!parsed?.input?.email || !parsed?.scores) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestHealthCheck(): void {
  try {
    localStorage.removeItem(HEALTH_KEY);
  } catch {
    // ignore
  }
}
