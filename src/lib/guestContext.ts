import { getGuestBrandSeed } from "./guestBrandSeed";

export type GuestIdentity = {
  name?: string;
  email?: string;
};

export type GuestBusinessContext = {
  businessName?: string;
  websiteUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  whatYouDo?: string;
  whyStarted?: string;
  bestCustomer?: string;
};

export type GuestContext = {
  identity: GuestIdentity;
  business: GuestBusinessContext;
  updatedAt: string;
};

export type GuestContextUpdate = {
  identity?: Partial<GuestIdentity>;
  business?: Partial<GuestBusinessContext>;
};

const CONTEXT_KEY = "marktr_guest_context_v1";

const EMPTY_CONTEXT = (): GuestContext => ({
  identity: {},
  business: {},
  updatedAt: new Date().toISOString(),
});

function mergeRecords<T extends Record<string, unknown>>(base: T, patch?: Partial<T>): T {
  if (!patch) return base;
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

export function getGuestContext(): GuestContext {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) return EMPTY_CONTEXT();
    const parsed = JSON.parse(raw) as Partial<GuestContext>;
    return {
      identity: parsed.identity && typeof parsed.identity === "object" ? parsed.identity : {},
      business: parsed.business && typeof parsed.business === "object" ? parsed.business : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return EMPTY_CONTEXT();
  }
}

export function updateGuestContext(partial: GuestContextUpdate): GuestContext {
  const current = getGuestContext();
  const next: GuestContext = {
    identity: mergeRecords({ ...current.identity }, partial.identity),
    business: mergeRecords({ ...current.business }, partial.business),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function clearGuestContext(): void {
  try {
    localStorage.removeItem(CONTEXT_KEY);
  } catch {
    // ignore
  }
}

export function getGuestIdentityEmail(): string | undefined {
  const email = getGuestContext().identity.email?.trim();
  if (!email || !email.includes("@")) return undefined;
  return email;
}

export function getGuestIdentityName(): string | undefined {
  const name = getGuestContext().identity.name?.trim();
  return name || undefined;
}

export function hasGuestIdentity(): boolean {
  return Boolean(getGuestIdentityName() && getGuestIdentityEmail());
}

export function getGuestBusinessName(): string | undefined {
  const fromContext = getGuestContext().business.businessName?.trim();
  if (fromContext) return fromContext;
  const fromSeed = getGuestBrandSeed()?.brandName?.trim();
  return fromSeed || undefined;
}

/** Optional pre-suggest from website domain (e.g. acme.com → Acme). */
export function suggestBusinessNameFromUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  try {
    const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const hostname = new URL(prefixed).hostname.replace(/^www\./i, "");
    const segment = hostname.split(".")[0];
    if (!segment || segment.length < 2) return undefined;
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  } catch {
    return undefined;
  }
}
