/** Shared legal copy and acceptance helpers for marktr. */

export const PRODUCT_NAME = "marktr";
export const COMPANY_NAME = "Bullfinch Digital Ltd";
export const SUPPORT_EMAIL = "hello@bullfinchdigital.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** Bump when Terms or Privacy materially change (stored on profile). */
export const LEGAL_VERSION = "2026-08-28";
export const LEGAL_LAST_UPDATED = "28 August 2026";

export const PRIVACY_POLICY_PATH = "/privacy-policy";
export const TERMS_PATH = "/terms-of-service";
export const COOKIE_POLICY_PATH = "/cookie-policy";

export const PENDING_LEGAL_STORAGE_KEY = "marktr_pending_legal_acceptance";

export type LegalAcceptanceRecord = {
  terms_accepted_at: string;
  privacy_accepted_at: string;
  legal_version: string;
};

export function createLegalAcceptanceRecord(): LegalAcceptanceRecord {
  const now = new Date().toISOString();
  return {
    terms_accepted_at: now,
    privacy_accepted_at: now,
    legal_version: LEGAL_VERSION,
  };
}

export function stashPendingLegalAcceptance(): void {
  try {
    sessionStorage.setItem(
      PENDING_LEGAL_STORAGE_KEY,
      JSON.stringify(createLegalAcceptanceRecord()),
    );
  } catch {
    /* ignore */
  }
}

export function consumePendingLegalAcceptance(): LegalAcceptanceRecord | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LEGAL_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_LEGAL_STORAGE_KEY);
    const parsed = JSON.parse(raw) as LegalAcceptanceRecord;
    if (!parsed?.terms_accepted_at || !parsed?.legal_version) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function legalAcceptanceFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): LegalAcceptanceRecord | null {
  if (!metadata) return null;
  const terms = metadata.terms_accepted_at;
  const privacy = metadata.privacy_accepted_at;
  const version = metadata.legal_version;
  if (typeof terms !== "string" || typeof version !== "string") return null;
  return {
    terms_accepted_at: terms,
    privacy_accepted_at: typeof privacy === "string" ? privacy : terms,
    legal_version: version,
  };
}
