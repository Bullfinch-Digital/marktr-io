import { type CheckoutPlan, parseCheckoutPlan } from "../lib/checkoutPlans";

const STORAGE_KEY = "marktr_pending_checkout_plan";
/** Session-only: set in the same tick as "Start free trial" — not trusted from localStorage alone. */
const INTENT_KEY = "marktr_checkout_resume_intent";
const RESUME_QUERY = "resumeCheckout";

export type PendingCheckoutPlan = CheckoutPlan;

type StoredPayload = {
  plan: PendingCheckoutPlan;
  intentId: string;
  createdAt: number;
};

/** Bare legacy strings predate the monthly plan and always meant annual. */
function normaliseBarePlan(value: string): PendingCheckoutPlan | null {
  if (value === "annual" || value === "yearly" || value === "monthly") return "annual";
  return null;
}

function normalisePlan(value: unknown): PendingCheckoutPlan | null {
  return parseCheckoutPlan(value);
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
  try {
    // localStorage so email confirmation opened in a new tab still matches.
    localStorage.setItem(INTENT_KEY, intentId);
  } catch {
    // ignore
  }
}

function getIntentId(): string | null {
  try {
    const fromSession = sessionStorage.getItem(INTENT_KEY);
    if (fromSession) return fromSession;
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem(INTENT_KEY);
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
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    // ignore
  }
}

function parseStored(raw: string | null): StoredPayload | null {
  if (!raw) return null;
  // Legacy: bare plan string
  const bare = normaliseBarePlan(raw);
  if (bare) {
    return { plan: bare, intentId: "", createdAt: 0 };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    const plan = normalisePlan(parsed.plan);
    if (!plan || typeof parsed.intentId !== "string") return null;
    return {
      plan,
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
  plan?: PendingCheckoutPlan | "monthly" | "yearly",
  basePath = "/dashboard"
): string {
  const url = new URL(basePath, "https://marktr.local");
  url.searchParams.set(RESUME_QUERY, parseCheckoutPlan(plan, true) ?? "annual");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function getCheckoutPlanFromPath(pathOrSearch: string): PendingCheckoutPlan | null {
  try {
    const url = pathOrSearch.startsWith("?")
      ? new URL(pathOrSearch, "https://marktr.local")
      : new URL(pathOrSearch, "https://marktr.local");
    const value = url.searchParams.get(RESUME_QUERY);
    return normalisePlan(value);
  } catch {
    return null;
  }
}

/**
 * Call only from the explicit "Start free trial" / checkout CTA.
 * Writes plan + a session-scoped intent id (localStorage alone is not enough to resume).
 */
export function setPendingCheckoutPlan(plan?: PendingCheckoutPlan | "monthly" | "yearly") {
  const nextPlan = parseCheckoutPlan(plan, true) ?? "annual";
  const intentId = newIntentId();
  const payload: StoredPayload = {
    plan: nextPlan,
    intentId,
    createdAt: Date.now(),
  };
  writeRaw(JSON.stringify(payload));
  setIntentId(intentId);
  console.log("[pendingCheckout] stored", { plan: nextPlan, intentId });
}

/** Raw stored plan (may be stale). Prefer {@link getResumablePendingCheckoutPlan}. */
export function getPendingCheckoutPlan(): PendingCheckoutPlan | null {
  return parseStored(readRaw())?.plan ?? null;
}

/**
 * Returns a plan when this checkout was explicitly started:
 * the auth `next` URL carries resumeCheckout=… (survives a new browser),
 * or the stored intent id matches in this tab or another tab of this browser.
 * Clears leftovers that have no matching intent.
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

const CLAIM_KEY = "marktr_pending_checkout_claim";
const TAB_ID_KEY = "marktr_checkout_tab_id";
/** Another tab may take over a claim older than this. */
export const CHECKOUT_CLAIM_TTL_MS = 30_000;
const CLAIM_SETTLE_MS = 50;

type CheckoutClaim = {
  tabId: string;
  intentId: string;
  claimedAt: number;
};

export function getCheckoutTabId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;
    const id = newIntentId();
    sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  } catch {
    return "tab_fallback";
  }
}

function readClaim(): CheckoutClaim | null {
  try {
    const raw = localStorage.getItem(CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutClaim>;
    if (
      typeof parsed.tabId !== "string" ||
      typeof parsed.intentId !== "string" ||
      typeof parsed.claimedAt !== "number"
    ) {
      return null;
    }
    return {
      tabId: parsed.tabId,
      intentId: parsed.intentId,
      claimedAt: parsed.claimedAt,
    };
  } catch {
    return null;
  }
}

function writeClaim(claim: CheckoutClaim) {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
  } catch {
    // ignore
  }
}

function claimIsFresh(claim: CheckoutClaim, now: number): boolean {
  return now - claim.claimedAt < CHECKOUT_CLAIM_TTL_MS;
}

function resolveClaimTarget(nextOrSearch?: string | null): {
  plan: PendingCheckoutPlan;
  intentId: string;
} | null {
  const plan = getResumablePendingCheckoutPlan(nextOrSearch);
  if (!plan) return null;
  const stored = parseStored(readRaw());
  if (stored?.intentId) return { plan, intentId: stored.intentId };
  const fromUrl = nextOrSearch ? getCheckoutPlanFromPath(nextOrSearch) : null;
  if (fromUrl) return { plan, intentId: `url:${fromUrl}` };
  return { plan, intentId: `plan:${plan}` };
}

/** True when a different tab holds an unexpired claim on the current intent. */
export function otherTabHoldsFreshCheckoutClaim(intentId?: string | null): boolean {
  const claim = readClaim();
  if (!claim || !claimIsFresh(claim, Date.now())) return false;
  if (claim.tabId === getCheckoutTabId()) return false;
  if (intentId && claim.intentId !== intentId) return false;
  return true;
}

/**
 * True when this tab may still send the browser to Stripe.
 * A missing or expired claim does not block (direct, same-tab checkout).
 */
export function thisTabOwnsFreshClaim(): boolean {
  const claim = readClaim();
  if (!claim || !claimIsFresh(claim, Date.now())) return true;
  return claim.tabId === getCheckoutTabId();
}

export function releaseCheckoutClaim() {
  const claim = readClaim();
  if (!claim || claim.tabId !== getCheckoutTabId()) return;
  try {
    localStorage.removeItem(CLAIM_KEY);
  } catch {
    // ignore
  }
}

/**
 * Claim the stored trial intent for this tab.
 * A fresh claim owned by another tab returns null unless `takeover` is set.
 * Claims older than 30 seconds can be taken over.
 * The short settle lets the last writer win if two tabs claim together.
 */
export async function claimResumablePendingCheckout(
  nextOrSearch?: string | null,
  options?: { takeover?: boolean }
): Promise<PendingCheckoutPlan | null> {
  const target = resolveClaimTarget(nextOrSearch);
  if (!target) return null;

  const tabId = getCheckoutTabId();
  const now = Date.now();
  const existing = readClaim();
  // Any fresh claim from another tab blocks, even if the stored intent was
  // already cleared and this tab only still sees the plan on the return URL.
  if (
    !options?.takeover &&
    existing &&
    existing.tabId !== tabId &&
    claimIsFresh(existing, now)
  ) {
    return null;
  }

  const claim: CheckoutClaim = {
    tabId,
    intentId: target.intentId,
    claimedAt: now,
  };
  writeClaim(claim);

  await new Promise((resolve) => setTimeout(resolve, CLAIM_SETTLE_MS));

  const verified = readClaim();
  if (
    !verified ||
    verified.tabId !== tabId ||
    verified.claimedAt !== now ||
    verified.intentId !== target.intentId
  ) {
    return null;
  }
  return target.plan;
}
