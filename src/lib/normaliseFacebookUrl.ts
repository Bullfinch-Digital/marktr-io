/** Normalise Facebook input: full URL, facebook.com/slug, or bare page slug. */
export function normaliseFacebookUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutAt = trimmed.replace(/^@+/, "").replace(/^\/+/, "");

  if (/facebook\.com/i.test(withoutAt)) {
    if (/^https?:\/\//i.test(withoutAt)) return withoutAt;
    return `https://${withoutAt.replace(/^\/\//, "")}`;
  }

  const slug = withoutAt.split(/[/?#]/)[0]?.trim();
  if (!slug) return "";

  return `https://facebook.com/${slug}`;
}
