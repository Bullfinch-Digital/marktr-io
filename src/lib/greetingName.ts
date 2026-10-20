/** True when a stored "name" is an email address or an email local-part, not a given name. */
export function isEmailDerivedName(value: string, email?: string | null): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes("@") || trimmed.includes("+")) return true;
  if ((trimmed.match(/\./g) ?? []).length >= 2) return true;

  const full = email?.trim().toLowerCase() ?? "";
  if (full && lower === full) return true;

  const local = email?.split("@")[0]?.trim().toLowerCase() ?? "";
  if (local && lower === local && /[.+_\d]/.test(local)) return true;

  return false;
}

/** First token of the first candidate that is a real name. Email identities are skipped. */
export function greetingFirstName(
  names: Array<string | null | undefined>,
  email?: string | null
): string {
  for (const name of names) {
    const first = name?.trim().split(/\s+/)[0] ?? "";
    if (!first || isEmailDerivedName(first, email)) continue;
    return first;
  }
  return "";
}
