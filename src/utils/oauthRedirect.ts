const STORAGE_KEY = "marktr_oauth_next";

function writeOAuthNext(path: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // ignore
  }
  try {
    // localStorage backup: sessionStorage can be unavailable across some OAuth hops
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // ignore
  }
}

function readOAuthNext(): string | null {
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession && fromSession.startsWith("/")) return fromSession;
  } catch {
    // ignore
  }
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal && fromLocal.startsWith("/")) return fromLocal;
  } catch {
    // ignore
  }
  return null;
}

function removeOAuthNext() {
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

export function setOAuthNext(path: string) {
  if (path.startsWith("/")) {
    writeOAuthNext(path);
  }
}

export function getOAuthNext(): string | null {
  return readOAuthNext();
}

export function clearOAuthNext() {
  removeOAuthNext();
}

export function resolveOAuthNext(search: string): string {
  const fromUrl = new URLSearchParams(search).get("next");
  if (fromUrl && fromUrl.startsWith("/")) return fromUrl;
  return getOAuthNext() ?? "/dashboard";
}

export function hasOAuthCallbackParams(url: URL): boolean {
  if (url.searchParams.get("code")) return true;
  const hash = new URLSearchParams(url.hash.replace("#", ""));
  return Boolean(hash.get("access_token") && hash.get("refresh_token"));
}
