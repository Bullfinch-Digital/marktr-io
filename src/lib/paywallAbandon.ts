const SEEN_PREFIX = "marktr_paywall_abandon_seen:";
const SUCCESS_PREFIX = "marktr_checkout_succeeded:";

function storageKey(prefix: string, userId: string | null): string {
  return prefix + (userId || "guest");
}

function readFlag(key: string): boolean | null {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return null;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

/** null means storage is unavailable — caller should not show the offer. */
export function hasSeenPaywallAbandon(userId: string | null): boolean {
  const seen = readFlag(storageKey(SEEN_PREFIX, userId));
  if (seen === null) return true;
  return seen;
}

export function markPaywallAbandonSeen(userId: string | null): void {
  writeFlag(storageKey(SEEN_PREFIX, userId));
}

export function hasCheckoutSucceeded(userId: string | null): boolean {
  const seen = readFlag(storageKey(SUCCESS_PREFIX, userId));
  if (seen === null) return false;
  return seen;
}

export function markCheckoutSucceeded(userId: string | null): void {
  writeFlag(storageKey(SUCCESS_PREFIX, userId));
  writeFlag(storageKey(SEEN_PREFIX, userId));
}
