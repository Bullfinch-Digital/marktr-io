/** Cloudflare Turnstile siteverify — fail closed. Never log the secret. */

import {
  applySiteverifyResult,
  TURNSTILE_REJECT_STATUS,
  type TurnstileVerifyResult,
} from "./siteverifyResult.ts";

export type { TurnstileVerifyResult };
export { TURNSTILE_REJECT_STATUS };

export function clientIpFromRequest(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || null;
}

/**
 * Verify a Turnstile token against Cloudflare siteverify.
 * Fails closed: missing secret, missing token, success !== true, hostname
 * mismatch (when `allowedHostname` is set), or fetch/parse errors.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string | null,
  opts?: { allowedHostname?: (hostname: string) => boolean },
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
    const result = applySiteverifyResult(data, opts?.allowedHostname);
    if (!result.ok) {
      console.error("verifyTurnstile failed", {
        errorCodes: result.errorCodes,
        httpStatus: resp.status,
      });
    }
    return result;
  } catch {
    console.error("verifyTurnstile failed", { errorCodes: ["turnstile-request-failed"] });
    return { ok: false, errorCodes: ["turnstile-request-failed"] };
  }
}

export function turnstileRejectCode(errorCodes: string[]): string {
  if (errorCodes.includes("missing-secret")) return "turnstile_secret_missing";
  if (errorCodes.includes("missing-token")) return "turnstile_token_missing";
  if (errorCodes.includes("hostname-mismatch")) return "turnstile_hostname_mismatch";
  return "turnstile_failed";
}
