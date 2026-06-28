const STORAGE_KEY = "marktr_pending_checkout_plan";

export type PendingCheckoutPlan = "monthly" | "annual";

export function setPendingCheckoutPlan(plan: PendingCheckoutPlan) {
  try {
    sessionStorage.setItem(STORAGE_KEY, plan);
    console.log("[pendingCheckout] stored", { plan });
  } catch {
    // ignore
  }
}

export function getPendingCheckoutPlan(): PendingCheckoutPlan | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === "monthly" || value === "annual") return value;
    return null;
  } catch {
    return null;
  }
}

export function hasPendingCheckoutPlan(): boolean {
  return getPendingCheckoutPlan() !== null;
}

export function clearPendingCheckoutPlan() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    console.log("[pendingCheckout] cleared");
  } catch {
    // ignore
  }
}
