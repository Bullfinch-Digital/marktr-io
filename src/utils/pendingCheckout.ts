const STORAGE_KEY = "marktr_pending_checkout_plan";

export type PendingCheckoutPlan = "monthly" | "annual";

function writePlan(plan: PendingCheckoutPlan) {
  try {
    sessionStorage.setItem(STORAGE_KEY, plan);
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(STORAGE_KEY, plan);
  } catch {
    // ignore
  }
}

function readPlan(): PendingCheckoutPlan | null {
  const parse = (value: string | null): PendingCheckoutPlan | null =>
    value === "monthly" || value === "annual" ? value : null;

  try {
    const fromSession = parse(sessionStorage.getItem(STORAGE_KEY));
    if (fromSession) return fromSession;
  } catch {
    // ignore
  }
  try {
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function removePlan() {
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

export function setPendingCheckoutPlan(plan: PendingCheckoutPlan) {
  writePlan(plan);
  console.log("[pendingCheckout] stored", { plan });
}

export function getPendingCheckoutPlan(): PendingCheckoutPlan | null {
  return readPlan();
}

export function hasPendingCheckoutPlan(): boolean {
  return getPendingCheckoutPlan() !== null;
}

export function clearPendingCheckoutPlan() {
  removePlan();
  console.log("[pendingCheckout] cleared");
}
