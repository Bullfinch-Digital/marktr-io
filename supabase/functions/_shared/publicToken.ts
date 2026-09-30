/** 32 random bytes → 43 base64url characters (unpadded). */
const TOKEN_BYTES = 32;
const MIN_TOKEN_CHARS = 32;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Opaque public report token. Uses `crypto.getRandomValues` (32 bytes)
 * encoded as unpadded base64url (≥32 characters).
 */
export function generatePublicToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  const token = bytesToBase64Url(bytes);
  if (token.length < MIN_TOKEN_CHARS) {
    throw new Error("public_token shorter than 32 base64url characters");
  }
  return token;
}
