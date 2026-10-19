/**
 * Detects a real sign-in that arrived via another tab's localStorage write.
 * Supabase broadcasts the session with a `storage` event; the writing tab
 * does not receive that event, so same-tab OAuth and password sign-in stay quiet.
 */

type StoredUser = { id: string; anonymous: boolean };

let confirmedInOtherTab = false;
const listeners = new Set<() => void>();

function readStoredUser(raw: string | null): StoredUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      user?: { id?: string; is_anonymous?: boolean };
    };
    const id = parsed?.user?.id;
    if (!id) return null;
    return { id, anonymous: parsed.user?.is_anonymous === true };
  } catch {
    return null;
  }
}

/** True after another tab established a real (non-anonymous) session. */
export function wasAuthConfirmedInOtherTab(): boolean {
  return confirmedInOtherTab;
}

export function subscribeCrossTabAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function noteCrossTabAuthStorage(event: StorageEvent): void {
  if (!event.key || !event.key.endsWith("-auth-token")) return;
  const next = readStoredUser(event.newValue);
  if (!next || next.anonymous) return;
  const prev = readStoredUser(event.oldValue);
  // Token refresh keeps the same real user. A new id, or an anonymous session
  // becoming a real one, is the email-confirmation / sign-in handoff.
  if (prev && prev.id === next.id && !prev.anonymous) return;
  confirmedInOtherTab = true;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", noteCrossTabAuthStorage);
}
