const STORAGE_KEY = "marktr_oauth_next";

export function setOAuthNext(path: string) {
  try {
    if (path.startsWith("/")) {
      sessionStorage.setItem(STORAGE_KEY, path);
    }
  } catch {
    // ignore
  }
}

export function getOAuthNext(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value && value.startsWith("/")) return value;
    return null;
  } catch {
    return null;
  }
}

export function clearOAuthNext() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
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
