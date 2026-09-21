export const FACEBOOK_INPUT_PREFIX = "facebook.com/";

/** Prefix facebook.com/ while typing, like @ for Instagram — full URLs left unchanged. */
export function formatFacebookInput(value: string): string {
  const val = value;
  if (!val.length) return "";
  if (/^https?:\/\//i.test(val) || /facebook\.com/i.test(val)) return val;
  const slug = val.replace(/^@+/, "").replace(/^\/+/, "");
  return `${FACEBOOK_INPUT_PREFIX}${slug}`;
}

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
