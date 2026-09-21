/**
 * Synchronous localStorage locks that survive full page reloads (OAuth redirects).
 */

export function readStorageFlag(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeStorageFlag(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Returns true when this caller should run the guarded work. */
export function claimStorageLock(
  key: string,
  opts?: { doneValue?: string; inProgressValue?: string }
): boolean {
  const doneValue = opts?.doneValue ?? "1";
  const inProgressValue = opts?.inProgressValue ?? "in_progress";

  const current = readStorageFlag(key);
  if (current === doneValue || current === inProgressValue) {
    return false;
  }

  writeStorageFlag(key, inProgressValue);
  return true;
}

export function markStorageLockDone(key: string, doneValue = "1") {
  writeStorageFlag(key, doneValue);
}

export function releaseStorageLock(key: string) {
  const current = readStorageFlag(key);
  if (current === "in_progress") {
    removeStorageFlag(key);
  }
}
