/** Name only the social channels the visitor did not enter. Hide the line when both are present, or when neither is. */
export function missingSocialPictureNote(
  instagramHandle: string | undefined,
  facebookUrl: string | undefined,
): string | null {
  const hasInstagram = Boolean(instagramHandle?.trim());
  const hasFacebook = Boolean(facebookUrl?.trim());
  if (hasInstagram === hasFacebook) return null;
  if (!hasFacebook) return "Add your Facebook page for a complete picture.";
  return "Add your Instagram for a complete picture.";
}
