const STORAGE_KEY = "marktr_pending_checkout_plan";
/** Session-only: set in the same tick as "Start free trial" — not trusted from localStorage alone. */
const INTENT_KEY = "marktr_checkout_resume_intent";
const RESUME_QUERY = "resumeCheckout";

export type PendingCheckoutPlan = "monthly" | "annual";

type StoredPayload = {
  plan: PendingCheckoutPlan;
  intentId: string;
  createdAt: number;
};

function isPlan(value: unknown): value is PendingCheckoutPlan {
  return value === "monthly" || value === "annual";
}

function writeRaw(value: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function readRaw(): string | null {
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) return fromSession;
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function removeRaw() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function setIntentId(intentId: string) {
  try {
    sessionStorage.setItem(INTENT_KEY, intentId);
  } catch {
    // ignore
  }
}

function getIntentId(): string | null {
  try {
    return sessionStorage.getItem(INTENT_KEY);
  } catch {
    return null;
  }
}

function clearIntentId() {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // ignore
  }
}

function parseStored(raw: string | null): StoredPayload | null {
  if (!raw) return null;
  // Legacy: bare plan string
  if (isPlan(raw)) {
    return { plan: raw, intentId: "", createdAt: 0 };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    if (!isPlan(parsed.plan) || typeof parsed.intentId !== "string") return null;
    return {
      plan: parsed.plan,
      intentId: parsed.intentId,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : 0,
    };
  } catch {
    return null;
  }
}

function newIntentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `intent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Path to use as OAuth `next` so checkout intent survives sessionStorage loss. */
export function checkoutResumePath(
  plan: PendingCheckoutPlan,
  basePath = "/dashboard"
): string {
  const url = new URL(basePath, "https://marktr.local");
  url.searchParams.set(RESUME_QUERY, plan);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function getCheckoutPlanFromPath(pathOrSearch: string): PendingCheckoutPlan | null {
  try {
    const url = pathOrSearch.startsWith("?")
      ? new URL(pathOrSearch, "https://marktr.local")
      : new URL(pathOrSearch, "https://marktr.local");
    const value = url.searchParams.get(RESUME_QUERY);
    return isPlan(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Call only from the explicit "Start free trial" / checkout CTA.
 * Writes plan + a session-scoped intent id (localStorage alone is not enough to resume).
 */
export function setPendingCheckoutPlan(plan: PendingCheckoutPlan) {
  const intentId = newIntentId();
  const payload: StoredPayload = {
    plan,
    intentId,
    createdAt: Date.now(),
  };
  writeRaw(JSON.stringify(payload));
  setIntentId(intentId);
  console.log("[pendingCheckout] stored", { plan, intentId });
}

/** Raw stored plan (may be stale). Prefer {@link getResumablePendingCheckoutPlan}. */
export function getPendingCheckoutPlan(): PendingCheckoutPlan | null {
  return parseStored(readRaw())?.plan ?? null;
}

/**
 * Only returns a plan when this browser tab explicitly started checkout
 * (session intent) or the auth `next` URL carries resumeCheckout=….
 * Clears stale localStorage leftovers otherwise.
 */
export function getResumablePendingCheckoutPlan(
  nextOrSearch?: string | null
): PendingCheckoutPlan | null {
  const fromUrl = nextOrSearch ? getCheckoutPlanFromPath(nextOrSearch) : null;
  if (fromUrl) {
    return fromUrl;
  }

  const stored = parseStored(readRaw());
  if (!stored) return null;

  const intentId = getIntentId();
  if (intentId && stored.intentId && intentId === stored.intentId) {
    return stored.plan;
  }

  // Stale localStorage from an unrelated prior guest session — do not resume.
  console.log("[pendingCheckout] ignoring stale plan without active intent", {
    hasStoredPlan: Boolean(stored.plan),
    hasIntent: Boolean(intentId),
  });
  clearPendingCheckoutPlan();
  return null;
}

export function hasPendingCheckoutPlan(): boolean {
  return getPendingCheckoutPlan() !== null;
}

export function clearPendingCheckoutPlan() {
  removeRaw();
  clearIntentId();
  console.log("[pendingCheckout] cleared");
}
