const UTM_STORAGE_KEY = "marktr_landing_utm_v1";

export type LandingUtm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function readFromSearch(search: string): LandingUtm | null {
  const params = new URLSearchParams(search);
  const utm: LandingUtm = {};
  const source = params.get("utm_source")?.trim();
  const medium = params.get("utm_medium")?.trim();
  const campaign = params.get("utm_campaign")?.trim();
  const content = params.get("utm_content")?.trim();
  if (source) utm.utm_source = source;
  if (medium) utm.utm_medium = medium;
  if (campaign) utm.utm_campaign = campaign;
  if (content) utm.utm_content = content;
  return Object.keys(utm).length ? utm : null;
}

/** Capture utm_* from the first landing URL into sessionStorage (does not overwrite). */
export function captureLandingUtms(): LandingUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing) as LandingUtm;
    }
    const fromUrl = readFromSearch(window.location.search);
    if (fromUrl) {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
  } catch {
    // ignore quota / private mode
  }
  return null;
}

export function getStoredUtms(): LandingUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return captureLandingUtms();
    return JSON.parse(raw) as LandingUtm;
  } catch {
    return null;
  }
}
