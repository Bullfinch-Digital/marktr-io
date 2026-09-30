/** Cloudflare Turnstile siteverify — fail closed. Never log the secret. */

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; errorCodes: string[] };

/** HTTP status callers must use when `ok` is false. */
export const TURNSTILE_REJECT_STATUS = 403;

export function clientIpFromRequest(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || null;
}

/**
 * Verify a Turnstile token against Cloudflare siteverify.
 * Fails closed: missing secret, missing token, success:false, or fetch/parse errors.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

  if (!token || typeof token !== "string" || !token.trim()) {
    console.error("verifyTurnstile failed", { errorCodes: ["missing-token"] });
    return { ok: false, errorCodes: ["missing-token"] };
  }
  if (!secret) {
    console.error("verifyTurnstile failed", { errorCodes: ["missing-secret"] });
    return { ok: false, errorCodes: ["missing-secret"] };
  }

  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token.trim());
    if (remoteip) form.append("remoteip", remoteip);

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await resp.json();
    if (data?.success === true) return { ok: true };

    const errorCodes = Array.isArray(data?.["error-codes"]) && data["error-codes"].length
      ? data["error-codes"].map((code: unknown) => String(code))
      : ["verification-failed"];
    console.error("verifyTurnstile failed", {
      errorCodes,
      httpStatus: resp.status,
    });
    return { ok: false, errorCodes };
  } catch {
    console.error("verifyTurnstile failed", { errorCodes: ["turnstile-request-failed"] });
    return { ok: false, errorCodes: ["turnstile-request-failed"] };
  }
}

export function turnstileRejectCode(errorCodes: string[]): string {
  if (errorCodes.includes("missing-secret")) return "turnstile_secret_missing";
  if (errorCodes.includes("missing-token")) return "turnstile_token_missing";
  return "turnstile_failed";
}
